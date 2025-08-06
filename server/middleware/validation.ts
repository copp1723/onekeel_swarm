import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (options: { body?: z.ZodSchema, query?: z.ZodSchema, params?: z.ZodSchema }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body if schema provided
      if (options.body) {
        options.body.parse(req.body);
      }

      // Validate query params if schema provided
      if (options.query) {
        options.query.parse(req.query);
      }

      // Validate route params if schema provided
      if (options.params) {
        options.params.parse(req.params);
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      return res.status(400).json({ error: 'Invalid request data' });
    }
  };
};
