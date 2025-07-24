import { Request, Response, NextFunction } from 'express';
import { UsersRepository, SessionsRepository } from '../db';
import { tokenService } from '../services/token-service';

const JWT_SECRET = process.env.JWT_SECRET || 'ccl3-jwt-secret-change-in-production';

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
    // Skip auth only if explicitly set (you've already disabled this in Render)
    if (process.env.SKIP_AUTH === 'true') {
      req.user = {
        id: 'dev-user-1',
        email: 'dev@completecarloans.com',
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
    
    // Verify access token
    const decoded = tokenService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Verify user still exists and is active
    const user = await UsersRepository.findById(decoded.userId);
    
    if (!user || !user.active) {
      return res.status(401).json({
        error: 'Invalid authentication',
        code: 'USER_INACTIVE'
      });
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as any
    };
    
    // Update session last accessed time
    // Note: This is a simplified approach. In production, you might want to batch these updates.
    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // Note: We don't have a direct way to get the refresh token here
    // In a more complete implementation, we might store the access token as well
    next();
  } catch (error) {
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
    
    // Verify access token
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
} as const;

export const hasMinimumRole = (userRole: string, requiredRole: string): boolean => {
  const userRoleValue = roleHierarchy[userRole as keyof typeof roleHierarchy];
  const requiredRoleValue = roleHierarchy[requiredRole as keyof typeof roleHierarchy];
  return userRoleValue >= requiredRoleValue;
};