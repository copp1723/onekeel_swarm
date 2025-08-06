import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Middleware factory for request validation
 */
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { 
          path: req.path, 
          errors: error.errors 
        });
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.flatten(),
            category: 'validation'
          }
        });
      }
      return next(error);
    }
  };
}

/**
 * Sanitize SQL identifiers to prevent injection
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Validate and sanitize pagination parameters
 */
export function getPaginationParams(query: any) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 100);
  const offset = Math.max(parseInt(query.offset) || 0, 0);
  return { limit, offset };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safe JSON stringify with error handling
 */
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.error('JSON stringify error', { error });
    return '{}';
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch (error) {
    logger.error('JSON parse error', { error, input: str });
    return null;
  }
}