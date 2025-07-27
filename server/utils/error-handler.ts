// Simple error handling for onekeel_swarm
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Essential error types
export type SimpleErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'DATABASE_ERROR'
  | 'NOT_FOUND'
  | 'SYSTEM_ERROR';

export class SimpleError extends Error {
  code: SimpleErrorCode;
  status: number;
  constructor(message: string, code: SimpleErrorCode = 'SYSTEM_ERROR', status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Express error middleware
export function globalErrorHandler(err: Error, req: Request, res: Response) {
  let status = 500;
  let code: SimpleErrorCode = 'SYSTEM_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  if (err instanceof SimpleError) {
    status = err.status;
    code = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    code = 'AUTH_ERROR';
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    code = 'AUTH_ERROR';
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Not found';
  }

  // Log only the basics
  if (status >= 500) {
    logger.error('System Error', { url: req.url, code, message, stack: err.stack });
  } else {
    logger.warn('Request Error', { url: req.url, code, message });
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      status
    }
  });
}

// Not found handler
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
      status: 404
    }
  });
}

// Helper for handling API errors
export function handleApiError(res: Response, error: any) {
  const customError = error instanceof SimpleError ? error : 
    new SimpleError(
      error.message || 'An unexpected error occurred',
      'SYSTEM_ERROR',
      500
    );
  
  res.status(customError.status).json({
    success: false,
    error: {
      code: customError.code,
      message: customError.message,
      status: customError.status
    }
  });
}

// Async handler wrapper to catch errors
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}