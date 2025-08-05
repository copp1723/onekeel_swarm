import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

/**
 * CRITICAL SECURITY FIX: Proper CSRF Protection
 * This implements secure CSRF token generation and verification
 */

// Store for CSRF tokens (in production, use Redis or database)
const csrfStore = new Map<string, { token: string; expires: number }>();

// Clean expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfStore.entries()) {
    if (data.expires < now) {
      csrfStore.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getSessionId(req: Request): string {
  // Use session ID from JWT token or create temporary session
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  
  // For unauthenticated requests, use IP + User-Agent hash
  const identifier = `${req.ip}_${req.get('User-Agent') || 'unknown'}`;
  return crypto.createHash('sha256').update(identifier).digest('hex');
}

export function configureCsrf() {
  return {
    inject: (req: Request, res: Response, next: NextFunction) => {
      // Generate CSRF token for GET requests
      if (req.method === 'GET') {
        const sessionId = getSessionId(req);
        const token = generateCsrfToken();
        const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
        
        csrfStore.set(sessionId, { token, expires });
        
        // Add token to response headers for frontend to use
        res.setHeader('X-CSRF-Token', token);
        req.csrfToken = token;
      }
      next();
    },
    
    verify: (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF verification for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Skip for health checks, public endpoints, auth endpoints, feature flags, and webhooks
      if (req.path === '/health' || 
          req.path === '/api/health' ||
          req.path.startsWith('/api/public/') ||
          req.path === '/api/auth/login' ||
          req.path === '/api/auth/register' ||
          req.path === '/api/auth/csrf' ||
          req.path === '/api/feature-flags/evaluate' ||
          req.path.startsWith('/api/webhooks/')) {
        return next();
      }
      
      const sessionId = getSessionId(req);
      const storedData = csrfStore.get(sessionId);
      
      if (!storedData) {
        return res.status(403).json({
          error: 'CSRF token not found. Please refresh the page.',
          code: 'CSRF_TOKEN_NOT_FOUND'
        });
      }
      
      // Check if token is expired
      if (storedData.expires < Date.now()) {
        csrfStore.delete(sessionId);
        return res.status(403).json({
          error: 'CSRF token expired. Please refresh the page.',
          code: 'CSRF_TOKEN_EXPIRED'
        });
      }
      
      // Get token from header or body
      const clientToken = req.headers['x-csrf-token'] || req.body._csrf;
      
      if (!clientToken) {
        return res.status(403).json({
          error: 'CSRF token missing. Include X-CSRF-Token header.',
          code: 'CSRF_TOKEN_MISSING'
        });
      }
      
      // Verify token matches
      if (clientToken !== storedData.token) {
        return res.status(403).json({
          error: 'Invalid CSRF token. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID'
        });
      }
      
      // Token is valid, continue
      next();
    }
  };
}
