import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token-service';
import { sessionService } from '../services/session-service';
import { UsersRepository } from '../db';
import { redis } from '../utils/redis-client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'manager' | 'agent' | 'viewer';
      };
    }
  }
}

// JWT authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('[AUTH DEBUG] Path:', req.path);
    console.log('[AUTH DEBUG] Headers:', req.headers);
    console.log('[AUTH DEBUG] Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH DEBUG] Missing or invalid auth header');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_TOKEN'
      });
    }
    
    const token = authHeader.substring(7);
    console.log('[AUTH DEBUG] Token length:', token.length);
    
    // Verify JWT token using secure token service
    console.log('[AUTH DEBUG] Verifying token...');
    console.log('[AUTH DEBUG] Token preview:', token.substring(0, 20) + '...');
    const decoded = tokenService.verifyAccessToken(token);

    console.log('[AUTH DEBUG] Decoded token:', decoded);
    console.log('[AUTH DEBUG] Token service available:', !!tokenService);
    
    if (!decoded) {
      console.log('[AUTH DEBUG] Token verification failed');
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Verify user still exists and is active
    const user = await UsersRepository.findById(decoded.userId);
    
    if (!user || !user.active) {
      return res.status(401).json({ 
        error: 'User account inactive or not found',
        code: 'USER_INACTIVE'
      });
    }
    
    // Validate session if sessionId is present in token
    if (decoded.sessionId) {
      console.log('[AUTH DEBUG] Validating session:', decoded.sessionId);
      // Check Redis session if available
      if (redis) {
        try {
          const sessionData = await redis.get(`session:${decoded.sessionId}`);
          console.log('[AUTH DEBUG] Redis session data:', sessionData ? 'found' : 'not found');
          if (!sessionData) {
            console.log('[AUTH DEBUG] Session not found in Redis');
            return res.status(401).json({
              error: 'Session expired or invalid',
              code: 'SESSION_INVALID'
            });
          }
        } catch (error) {
          console.log('[AUTH DEBUG] Redis session check failed:', error);
          // Continue without session validation if Redis is unavailable
        }
      } else {
        console.log('[AUTH DEBUG] Redis not available, skipping session validation');
      }
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as any
    };
    
    console.log('[AUTH DEBUG] Authentication successful, user:', req.user);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: Array<'admin' | 'manager' | 'agent' | 'viewer'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    
    // Use secure token service for optional auth too
    const decoded = tokenService.verifyAccessToken(token);
    
    if (decoded) {
      const user = await UsersRepository.findById(decoded.userId);
      
      if (user && user.active) {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role as any
        };
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

// Check if user owns resource or is admin
export const ownsResourceOr = (ownerIdParam: string, ...allowedRoles: Array<'admin' | 'manager'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    const ownerId = req.params[ownerIdParam];
    
    // Check if user owns the resource
    if (req.user.id === ownerId) {
      return next();
    }
    
    // Check if user has elevated role
    if (allowedRoles.includes(req.user.role as any)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied',
      code: 'FORBIDDEN'
    });
  };
};

// Alias for backward compatibility
export const requireAuth = authenticate;

// Role hierarchy helper
export const roleHierarchy = {
  admin: 4,
  manager: 3,
  agent: 2,
  viewer: 1
};

export const hasMinimumRole = (userRole: string, requiredRole: string): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};