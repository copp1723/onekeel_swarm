// FIX 2: Remove Authentication Bypass
// File: server/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { UsersRepository, SessionsRepository } from '../db';
import { tokenService } from '../services/token-service';
import crypto from 'crypto';

// SECURE: Use environment variable with proper validation
const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT secret on startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

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

// SECURE JWT authentication middleware - NO BYPASS
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // REMOVED: Skip auth bypass check
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_AUTH_TOKEN'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify access token with secure secret
    const decoded = tokenService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
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
    
    // Verify user hasn't been downgraded
    if (user.role !== decoded.role) {
      return res.status(401).json({
        error: 'Token role mismatch',
        code: 'ROLE_MISMATCH'
      });
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as any
    };
    
    // Update session tracking
    const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';
    
    // Log access for security monitoring
    if (process.env.ENABLE_ACCESS_LOGS === 'true') {
      console.log(`Access: ${user.email} from ${ipAddress} at ${new Date().toISOString()}`);
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Enhanced role-based authorization
export const authorize = (...allowedRoles: Array<'admin' | 'manager' | 'agent' | 'viewer'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    // Check role hierarchy
    const userRoleValue = roleHierarchy[req.user.role];
    const minRequiredRole = Math.min(...allowedRoles.map(r => roleHierarchy[r]));
    
    if (userRoleValue < minRequiredRole) {
      // Log authorization failures
      console.warn(`Authorization failed: ${req.user.email} attempted to access resource requiring ${allowedRoles.join(' or ')}`);
      
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

// No optional authentication - all routes should be explicitly public or protected
export const publicRoute = (req: Request, res: Response, next: NextFunction) => {
  // Explicitly mark as public route
  next();
};

// Enhanced resource ownership check
export const ownsResourceOr = (ownerIdParam: string, ...allowedRoles: Array<'admin' | 'manager'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    const ownerId = req.params[ownerIdParam];
    
    // Validate owner ID format
    if (!ownerId || !isValidUUID(ownerId)) {
      return res.status(400).json({
        error: 'Invalid resource ID',
        code: 'INVALID_ID'
      });
    }
    
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

// Utility function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Role hierarchy with numeric values
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

// Alias for backward compatibility
export const requireAuth = authenticate;