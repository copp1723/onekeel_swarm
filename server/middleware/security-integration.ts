/**
 * Security Integration Module
 * 
 * Centralizes all security middleware and ensures they are applied
 * in the correct order with proper configuration.
 */

import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { securityHeaders } from '../../security-hardening/security-headers';
import { configureCsrf } from './csrf-secure';
import { errorHandler, notFoundHandler, requestTimeout } from './error-handler-secure';
import { securityConfig, logSecurityWarnings, validateSecurityConfig } from '../config/security';
import { initializeRedis, createRedisSessionStore, isRedisConnected } from '../services/redis';
import { logger } from '../utils/logger';

/**
 * Initialize all security features
 */
export async function initializeSecurity(app: Express) {
  // Validate configuration
  validateSecurityConfig();
  
  // Log warnings in development
  logSecurityWarnings();
  
  // Initialize Redis if configured
  await initializeRedis();
  
  // Apply security headers first
  applySecurityHeaders(app);
  
  // Setup session management
  await setupSessionManagement(app);
  
  // Setup CSRF protection
  setupCsrfProtection(app);
  
  // Setup error handling
  setupErrorHandling(app);
  
  logger.info('Security features initialized successfully', {
    redis: isRedisConnected() ? 'connected' : 'not connected',
    environment: process.env.NODE_ENV
  });
}

/**
 * Apply security headers
 */
function applySecurityHeaders(app: Express) {
  // Use configuration from security config
  const headersMiddleware = securityHeaders(securityConfig.headers);
  
  // Apply as first middleware
  app.use(headersMiddleware);
  
  // Additional security middleware
  app.disable('x-powered-by'); // Hide Express
  app.set('trust proxy', 1); // Trust first proxy
  
  logger.info('Security headers applied');
}

/**
 * Setup session management
 */
async function setupSessionManagement(app: Express) {
  const sessionConfig: any = {
    name: 'sessionId',
    secret: securityConfig.session.secret!,
    resave: false,
    saveUninitialized: false,
    rolling: securityConfig.session.rolling,
    cookie: {
      secure: securityConfig.session.secure,
      httpOnly: securityConfig.session.httpOnly,
      sameSite: securityConfig.session.sameSite,
      maxAge: securityConfig.session.maxAge
    }
  };

  // Use Redis store in production or if Redis is available
  if (isRedisConnected()) {
    try {
      sessionConfig.store = createRedisSessionStore(session);
      logger.info('Using Redis session store');
    } catch (error) {
      logger.error('Failed to create Redis session store', error as Error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis is required for session storage in production');
  } else {
    logger.warn('Using in-memory session store (development only)');
  }

  // Apply session middleware
  app.use(session(sessionConfig));
  
  logger.info('Session management configured');
}

/**
 * Setup CSRF protection
 */
function setupCsrfProtection(app: Express) {
  const csrf = configureCsrf();
  
  // Inject CSRF tokens into GET requests
  app.use(csrf.inject);
  
  // Verify CSRF tokens on state-changing requests
  // Apply after body parsing but before routes
  app.use('/api', csrf.verify);
  
  logger.info('CSRF protection configured');
}

/**
 * Setup error handling
 */
function setupErrorHandling(app: Express) {
  // Request timeout - should be early in the chain
  app.use(requestTimeout(30000));
  
  // These will be applied after routes are registered
  // Store them for later application
  (app as any).securityErrorHandlers = {
    notFound: notFoundHandler,
    error: errorHandler
  };
  
  logger.info('Error handling configured');
}

/**
 * Apply final error handlers (call after routes are registered)
 */
export function applyErrorHandlers(app: Express) {
  const handlers = (app as any).securityErrorHandlers;
  if (handlers) {
    app.use(handlers.notFound);
    app.use(handlers.error);
    logger.info('Error handlers applied');
  }
}

/**
 * Security middleware for specific routes
 */
export const requireHttps = (req: Request, res: Response, next: NextFunction) => {
  if (securityConfig.https.enforceHttps && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
};

/**
 * Security audit middleware
 */
export const auditLog = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (securityConfig.audit.logAuthAttempts && eventType === 'auth') {
      logger.info('Authentication attempt', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path
      });
    }
    
    if (securityConfig.audit.logAuthzFailures && eventType === 'authz') {
      logger.warn('Authorization failure', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method
      });
    }
    
    next();
  };
};

/**
 * Get security status for monitoring
 */
export function getSecurityStatus() {
  return {
    environment: process.env.NODE_ENV,
    redis: isRedisConnected(),
    csrf: {
      enabled: securityConfig.csrf.enabled,
      storage: securityConfig.csrf.storage
    },
    session: {
      secure: securityConfig.session.secure,
      store: isRedisConnected() ? 'redis' : 'memory'
    },
    headers: {
      hsts: securityConfig.headers.hsts !== false,
      csp: securityConfig.headers.contentSecurityPolicy !== false
    },
    websocket: {
      secure: securityConfig.websocket.useSecureHandler,
      requireAuth: securityConfig.websocket.requireAuth
    }
  };
}