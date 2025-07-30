import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token-service';
import { sessionService } from '../services/session-service';
import { UsersRepository } from '../db';

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
    // Skip auth in development if SKIP_AUTH is true
    if (process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'dev-user-id',
        email: 'dev@localhost',
        role: 'admin'
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_TOKEN'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token using secure token service
    const decoded = tokenService.verifyAccessToken(token);
    
    if (!decoded) {
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
      const sessionValidation = await sessionService.validateSession(decoded.sessionId);
      if (!sessionValidation) {
        return res.status(401).json({ 
          error: 'Session expired or invalid',
          code: 'SESSION_INVALID'
        });
      }
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as any
    };
    
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