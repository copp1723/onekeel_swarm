// Middleware types for OneKeel Swarm
import { Request, Response, NextFunction } from 'express';
import { User } from '../../server/db/schema';

// Authentication middleware types
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Middleware function type
export type MiddlewareFunction = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => void | Promise<void>;

export type AuthMiddlewareFunction = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => void | Promise<void>;

// Validation middleware types
export interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
}

export interface ValidationResult {
  success: boolean;
  errors?: any[];
  data?: any;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Error handling types
export interface ErrorDetails {
  code: string;
  message: string;
  stack?: string;
  details?: any;
  statusCode?: number;
}

export interface ErrorMiddleware {
  (error: Error, req: Request, res: Response, next: NextFunction): void;
}

// CSRF protection types
export interface CSRFConfig {
  secret?: string;
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
  ignoreMethods?: string[];
}

export interface CSRFMiddleware {
  inject: MiddlewareFunction;
  verify: MiddlewareFunction;
}

// Security headers types
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: {
    directives?: Record<string, string[]>;
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  noSniff?: boolean;
  frameguard?: 'deny' | 'sameorigin' | false;
  xssFilter?: boolean;
}

// Request sanitization types
export interface SanitizationOptions {
  body?: boolean;
  query?: boolean;
  params?: boolean;
  headers?: boolean;
}

// Timeout middleware types
export interface TimeoutConfig {
  timeout: number;
  onTimeout?: (req: Request, res: Response) => void;
}

// Logging middleware types
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'simple';
  includeBody?: boolean;
  includeHeaders?: boolean;
  excludeHeaders?: string[];
}

// Terminology middleware types
export interface TerminologyMapping {
  [key: string]: string;
}

export interface TerminologyConfig {
  mappings: TerminologyMapping;
  applyToResponses?: boolean;
  applyToRequests?: boolean;
}

// Type guards for middleware
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

export function hasValidUser(req: AuthenticatedRequest): req is Required<AuthenticatedRequest> {
  return req.user !== undefined && 
         typeof req.user.id === 'string' && 
         typeof req.user.email === 'string' && 
         typeof req.user.role === 'string';
}

// Middleware factory types
export type MiddlewareFactory<T = any> = (config?: T) => MiddlewareFunction;
export type AuthMiddlewareFactory<T = any> = (config?: T) => AuthMiddlewareFunction;

// Express extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      rateLimitInfo?: RateLimitInfo;
      requestId?: string;
      startTime?: number;
    }
    
    interface Response {
      locals: {
        user?: AuthenticatedUser;
        csrfToken?: string;
        [key: string]: any;
      };
    }
  }
}

export {};