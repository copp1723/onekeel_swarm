// Mean & Lean Rate Limiting Middleware for CCL-3
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// One-size-fits-all configuration: tune these as needed
const API_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,                 // 500 requests per window
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id || req.ip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        retryable: true
      }
    });
  }
};

// Export a single API rate limiter
export const apiRateLimit = rateLimit(API_RATE_LIMIT);

// Optional: stricter limit for unauthenticated requests (if you care)
export const unauthRateLimit = rateLimit({
  ...API_RATE_LIMIT,
  max: 100, // lower limit for unauth
  keyGenerator: (req: Request) => req.ip,
});

// (Optional) Attach rate-limit headers/info to req if you need it for UI
export function addRateLimitInfo(_req: Request, res: Response, next: NextFunction) {
  // You can add rate-limit info to the response here if desired
  next();
}