/**
 * Secure Error Handler Middleware
 * 
 * Prevents information leakage in production while maintaining
 * developer experience in development mode.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../utils/logger';
import { securityConfig } from '../config/security';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

/**
 * Log error with sanitized information
 */
const logError = (error: Error, req: Request) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    error: {
      name: error.name,
      message: error.message,
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational
      })
    }
  };

  // Only include stack trace and details in development or for operational errors
  if (securityConfig.errorHandling.exposeStack) {
    errorInfo.error['stack'] = error.stack;
  }
  
  if (securityConfig.errorHandling.exposeDetails && error instanceof AppError) {
    errorInfo.error['details'] = error.details;
  }

  logger.error('Request error', errorInfo);
};

/**
 * Sanitize error message for production
 */
const sanitizeErrorMessage = (error: Error): string => {
  // Known safe messages that can be exposed
  const safeMessages = [
    'Invalid credentials',
    'Session expired',
    'Access denied',
    'Resource not found',
    'Validation failed',
    'Too many requests'
  ];

  if (error instanceof AppError && error.isOperational) {
    // Operational errors have controlled messages
    return error.message;
  }

  // Check if the message is in our safe list
  if (safeMessages.some(msg => error.message.includes(msg))) {
    return error.message;
  }

  // Return generic message for unknown errors
  return securityConfig.errorHandling.genericMessage;
};

/**
 * Create error response based on environment
 */
const createErrorResponse = (error: Error, isDevelopment: boolean) => {
  const response: any = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: sanitizeErrorMessage(error)
    }
  };

  // Handle specific error types
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    response.error.code = 'VALIDATION_ERROR';
    response.error.message = 'Validation failed';
    
    if (isDevelopment || securityConfig.errorHandling.exposeDetails) {
      response.error.details = validationError.toString();
      response.error.errors = error.errors;
    }
  } else if (error instanceof AppError) {
    response.error.code = error.code || 'APP_ERROR';
    response.error.message = error.message;
    
    if (isDevelopment && error.details) {
      response.error.details = error.details;
    }
  } else if (error.message.includes('duplicate key')) {
    response.error.code = 'DUPLICATE_ENTRY';
    response.error.message = 'Resource already exists';
  } else if (error.message.includes('foreign key constraint')) {
    response.error.code = 'FOREIGN_KEY_VIOLATION';
    response.error.message = 'Cannot perform operation due to related data';
  }

  // Add stack trace only in development
  if (isDevelopment && securityConfig.errorHandling.exposeStack) {
    response.stack = error.stack;
  }

  return response;
};

/**
 * Main error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Don't send response if already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Log the error
  logError(error, req);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (error instanceof ZodError) {
    statusCode = 400;
  }
  
  // Create and send error response
  const errorResponse = createErrorResponse(error, isDevelopment);
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      const error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
      next(error);
    }, timeout);
    
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};

/**
 * Security violation handler
 */
export const securityViolationHandler = (
  violation: string,
  req: Request,
  res: Response
) => {
  // Log security violation
  logger.error('Security violation detected', {
    violation,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Send generic response to avoid information leakage
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied'
    }
  });
};