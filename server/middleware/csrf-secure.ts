/**
 * Secure CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern with proper session storage.
 * This replaces the insecure in-memory storage implementation.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { securityConfig } from '../config/security';
import { getRedisClient } from '../services/redis';

interface CsrfRequest extends Request {
  csrfToken?: string;
  session?: any;
}

// Token prefix for Redis storage
const CSRF_TOKEN_PREFIX = 'csrf:';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure token
 */
const generateToken = (): string => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
};

/**
 * Get session ID for CSRF token storage
 */
const getSessionId = (req: CsrfRequest): string => {
  // Prefer session ID, fallback to IP + user agent hash
  if (req.session?.id) {
    return req.session.id;
  }
  
  // Create a stable identifier from request properties
  const identifier = `${req.ip || 'unknown'}:${req.get('user-agent') || 'unknown'}`;
  return crypto.createHash('sha256').update(identifier).digest('hex');
};

/**
 * Store token in appropriate storage backend
 */
async function storeToken(sessionId: string, token: string): Promise<void> {
  const key = `${CSRF_TOKEN_PREFIX}${sessionId}`;
  const expiry = securityConfig.csrf.tokenExpiry / 1000; // Convert to seconds

  if (securityConfig.csrf.storage === 'redis') {
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(key, expiry, token);
    } else {
      throw new Error('Redis is not available for CSRF token storage');
    }
  } else {
    // Development mode: Use session storage with warning
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Using in-memory session storage for CSRF tokens (development only)');
      // Store in session if available
      if (global.csrfTokenStore) {
        global.csrfTokenStore.set(sessionId, {
          token,
          expires: Date.now() + securityConfig.csrf.tokenExpiry
        });
      }
    } else {
      throw new Error('Secure CSRF token storage is required in production');
    }
  }
}

/**
 * Retrieve token from storage
 */
async function retrieveToken(sessionId: string): Promise<string | null> {
  const key = `${CSRF_TOKEN_PREFIX}${sessionId}`;

  if (securityConfig.csrf.storage === 'redis') {
    const redis = getRedisClient();
    if (redis) {
      return await redis.get(key);
    }
    return null;
  } else {
    // Development mode: Use session storage
    if (process.env.NODE_ENV === 'development' && global.csrfTokenStore) {
      const stored = global.csrfTokenStore.get(sessionId);
      if (stored && stored.expires > Date.now()) {
        return stored.token;
      }
    }
    return null;
  }
}

/**
 * Initialize CSRF token store for development
 */
function initializeDevStore() {
  if (process.env.NODE_ENV === 'development' && !global.csrfTokenStore) {
    logger.warn('Initializing in-memory CSRF token store (development only)');
    global.csrfTokenStore = new Map();
    
    // Cleanup expired tokens periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of global.csrfTokenStore.entries()) {
        if (value.expires < now) {
          global.csrfTokenStore.delete(key);
        }
      }
    }, 60000); // Every minute
  }
}

/**
 * Generate and attach CSRF token to the request
 */
export const csrfToken = async (req: CsrfRequest, res: Response, next: NextFunction) => {
  try {
    // Initialize dev store if needed
    initializeDevStore();

    // Generate new token
    const token = generateToken();
    const sessionId = getSessionId(req);
    
    // Store token
    await storeToken(sessionId, token);
    
    // Attach token to request
    req.csrfToken = token;
    
    // Set token in response header
    res.setHeader('X-CSRF-Token', token);
    
    // Set token in cookie (httpOnly=false to allow JS access)
    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: securityConfig.session.secure,
      sameSite: securityConfig.csrf.sameSite,
      maxAge: securityConfig.csrf.tokenExpiry
    });
    
    next();
  } catch (error) {
    logger.error('Failed to generate CSRF token', error as Error);
    next(error);
  }
};

/**
 * Verify CSRF token on state-changing requests
 */
export const csrfProtection = async (req: CsrfRequest, res: Response, next: NextFunction) => {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for authentication endpoints (they have their own protection)
  if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh') {
    return next();
  }

  try {
    // Get token from multiple sources
    const providedToken = 
      req.headers['x-csrf-token'] as string || 
      req.body?._csrf || 
      req.query._csrf as string ||
      req.cookies?.['csrf-token'];
    
    if (!providedToken) {
      logger.warn('Missing CSRF token', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request'
        }
      });
    }

    // Get stored token
    const sessionId = getSessionId(req);
    const storedToken = await retrieveToken(sessionId);
    
    // Verify token
    if (!storedToken || !crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(storedToken)
    )) {
      logger.warn('Invalid CSRF token', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        hasStoredToken: !!storedToken
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token'
        }
      });
    }
    
    // Token is valid
    next();
  } catch (error) {
    logger.error('CSRF verification error', error as Error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CSRF_VERIFICATION_ERROR',
        message: 'Failed to verify CSRF token'
      }
    });
  }
};

/**
 * Middleware to inject CSRF token into all responses
 */
export const csrfInject = async (req: CsrfRequest, res: Response, next: NextFunction) => {
  // Generate token for GET requests to pages that might have forms
  if (req.method === 'GET' && (req.accepts('html') || req.path.startsWith('/api'))) {
    try {
      const token = generateToken();
      const sessionId = getSessionId(req);
      
      await storeToken(sessionId, token);
      
      // Make token available to templates
      res.locals.csrfToken = token;
      
      // Set cookie
      res.cookie('csrf-token', token, {
        httpOnly: false,
        secure: securityConfig.session.secure,
        sameSite: securityConfig.csrf.sameSite,
        maxAge: securityConfig.csrf.tokenExpiry
      });
      
      // Set header
      res.setHeader('X-CSRF-Token', token);
    } catch (error) {
      logger.error('Failed to inject CSRF token', error as Error);
      // Continue without CSRF token in development
      if (process.env.NODE_ENV !== 'development') {
        return next(error);
      }
    }
  }
  
  next();
};

/**
 * Express middleware configuration
 */
export const configureCsrf = () => {
  // Validate configuration
  if (securityConfig.csrf.storage === 'redis' && process.env.NODE_ENV === 'production') {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis is required for CSRF protection in production');
    }
  }

  logger.info('CSRF protection configured', {
    storage: securityConfig.csrf.storage,
    doubleSubmit: securityConfig.csrf.doubleSubmit,
    sameSite: securityConfig.csrf.sameSite
  });

  return {
    generate: csrfToken,
    verify: csrfProtection,
    inject: csrfInject
  };
};

// TypeScript global augmentation for development token store
declare global {
  var csrfTokenStore: Map<string, { token: string; expires: number }> | undefined;
}