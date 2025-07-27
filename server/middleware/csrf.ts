import { Request, Response, NextFunction } from 'express';

/**
 * Simple CSRF protection middleware
 * This is a basic implementation for development purposes
 */
export function configureCsrf() {
  return {
    inject: (req: Request, res: Response, next: NextFunction) => {
      // For development, just pass through
      // In production, you would inject CSRF tokens here
      next();
    },
    verify: (req: Request, res: Response, next: NextFunction) => {
      // For development, just pass through
      // In production, you would verify CSRF tokens here
      next();
    }
  };
}
