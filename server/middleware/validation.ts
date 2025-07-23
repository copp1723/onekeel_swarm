import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Generic validation middleware factory
export const validate = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationError.toString(),
            errors: validationResult.error.errors
          }
        });
      }
      
      // Replace body with validated data
      req.body = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Query validation middleware
export const validateQuery = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.query);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query validation failed',
            details: validationError.toString(),
            errors: validationResult.error.errors
          }
        });
      }
      
      // Replace query with validated data
      req.query = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Params validation middleware
export const validateParams = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.params);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Params validation failed',
            details: validationError.toString(),
            errors: validationResult.error.errors
          }
        });
      }
      
      // Replace params with validated data
      req.params = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // ID validation
  id: z.string().min(1, 'ID is required'),
  
  // Pagination
  pagination: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    page: z.string().transform(Number).pipe(z.number().min(1)).optional()
  }),
  
  // Common filters
  filters: z.object({
    search: z.string().optional(),
    active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    status: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Phone validation
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Date range
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine(data => new Date(data.start) < new Date(data.end), {
    message: 'Start date must be before end date'
  })
};

// Sanitization helpers
export const sanitize = {
  // Remove HTML tags
  stripHtml: (value: string) => {
    return value.replace(/<[^>]*>/g, '');
  },
  
  // Trim whitespace
  trim: (value: string) => {
    return value.trim();
  },
  
  // Convert to lowercase
  toLowerCase: (value: string) => {
    return value.toLowerCase();
  },
  
  // Normalize phone number
  normalizePhone: (value: string) => {
    return value.replace(/[^0-9+]/g, '');
  },
  
  // Normalize email
  normalizeEmail: (value: string) => {
    return value.toLowerCase().trim();
  }
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize.trim(req.body[key]);
      }
    });
  }
  
  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize.trim(req.query[key] as string);
      }
    });
  }
  
  next();
};

// Rate limiting by user/IP
export const rateLimitByUser = (limit: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const userAttempts = attempts.get(key);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (userAttempts.count >= limit) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
        }
      });
    }
    
    userAttempts.count++;
    next();
  };
};