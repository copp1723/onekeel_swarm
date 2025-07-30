import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

// Extend Express Request interface to include context
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  startTime: number;
}

/**
 * Request context middleware
 * Adds request tracking information to each request
 */
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = nanoid();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent');
  const startTime = Date.now();

  req.context = {
    requestId,
    ip,
    userAgent,
    startTime
  };

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${requestId}`);

  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Request ID: ${requestId}`);
  });

  next();
};

/**
 * Get current request context from Express request
 */
export const getCurrentContext = (req?: Request): Partial<RequestContext> => {
  if (!req?.context) {
    return {};
  }
  
  return {
    requestId: req.context.requestId,
    ip: req.context.ip,
    userAgent: req.context.userAgent,
    userId: req.context.userId
  };
};

/**
 * Set user ID in request context (called after authentication)
 */
export const setUserId = (req: Request, userId: string) => {
  if (req.context) {
    req.context.userId = userId;
  }
};
