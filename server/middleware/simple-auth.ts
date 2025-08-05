import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UsersRepository } from '../db';

// Extend Express Request type for simplified auth
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'user';
      };
    }
  }
}

// Simple JWT configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: '24h'
};

// Validate JWT secret on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET not set or too short. Using default for development only.');
}

export interface SimpleTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

/**
 * Simple authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_TOKEN'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_CONFIG.secret) as SimpleTokenPayload;
    
    if (!decoded || !decoded.userId || !decoded.email || !decoded.role) {
      return res.status(401).json({ 
        error: 'Invalid token format',
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
    
    // Ensure role is simplified to admin or user
    const simplifiedRole = user.role === 'admin' ? 'admin' : 'user';
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: simplifiedRole
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Admin-only middleware
 * Requires authentication and admin role
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'NOT_ADMIN'
    });
  }
  
  next();
};

/**
 * Optional authentication middleware
 * Attaches user if token is present but doesn't fail if missing
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_CONFIG.secret) as SimpleTokenPayload;
    
    if (decoded && decoded.userId) {
      const user = await UsersRepository.findById(decoded.userId);
      
      if (user && user.active) {
        const simplifiedRole = user.role === 'admin' ? 'admin' : 'user';
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: simplifiedRole
        };
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

/**
 * Check if user owns resource or is admin
 * For protecting user-specific endpoints
 */
export const ownsResourceOrAdmin = (ownerIdParam: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    const ownerId = req.params[ownerIdParam];
    
    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can only access their own resources
    if (req.user.id === ownerId) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied - can only access own resources',
      code: 'FORBIDDEN'
    });
  };
};

/**
 * Simple JWT token generation
 */
export const generateToken = (user: { id: string; email: string; role: string }) => {
  const simplifiedRole = user.role === 'admin' ? 'admin' : 'user';
  
  const payload: SimpleTokenPayload = {
    userId: user.id,
    email: user.email,
    role: simplifiedRole
  };
  
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn
  });
};

/**
 * Simple password hashing
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

/**
 * Simple password verification
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Export aliases for backward compatibility
export const authenticate = isAuthenticated;
export const requireAuth = isAuthenticated;
export const authorize = (role: 'admin') => role === 'admin' ? isAdmin : isAuthenticated;
