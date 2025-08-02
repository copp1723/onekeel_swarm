/**
 * Security Hardening Integration
 * This file demonstrates how to apply all security fixes to the OneKeel Swarm application
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { securityHeaders } from './security-headers';
import { securityMonitor, securityMiddleware } from './security-monitor';
import { RateLimitPresets, createRateLimiter } from './advanced-rate-limiter';
import { envValidator } from './env-validator';

// Import fixed modules from Agent 1
import authRoutes from '../security-fixes/fix-1-remove-hardcoded-credentials';
import {
  authenticate,
  authorize,
} from '../security-fixes/fix-2-remove-auth-bypass';
import { tokenService } from '../security-fixes/fix-3-secure-jwt-config';
import {
  validateRequest,
  sanitizeRequestBody,
  schemas,
} from '../security-fixes/fix-5-input-validation-mass-assignment';

export async function applySecurityHardening(app: Application): Promise<void> {
  console.log('🔒 Applying comprehensive security hardening...\n');

  // 1. Validate environment variables first
  await envValidator.validate();
  const envReport = envValidator.getReport();
  if (!envReport.valid && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Environment validation failed. Cannot start in production.'
    );
  }

  // 2. Apply security headers (should be one of the first middlewares)
  const headerConfig =
    process.env.NODE_ENV === 'production' ? 'strict' : 'moderate';
  app.use(securityHeaders(headerConfig));
  console.log('✅ Security headers applied');

  // 3. Apply security monitoring
  app.use(securityMiddleware);
  console.log('✅ Security monitoring enabled');

  // 4. Apply rate limiting
  // Global rate limit
  app.use(
    createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    }).middleware()
  );

  // Specific rate limits for sensitive endpoints
  app.use('/api/auth/login', RateLimitPresets.auth.middleware());
  app.use('/api/auth/register', RateLimitPresets.auth.middleware());
  app.use('/api/upload', RateLimitPresets.upload.middleware());
  console.log('✅ Rate limiting configured');

  // 5. Apply input sanitization globally
  app.use(sanitizeRequestBody);
  console.log('✅ Input sanitization enabled');

  // 6. Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Log security events
    if (err.code === 'EBADCSRFTOKEN') {
      securityMonitor.logEvent(
        SecurityEventType.CSRF_ATTEMPT,
        SecuritySeverity.HIGH,
        req,
        { message: 'CSRF token validation failed' }
      );
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Internal error:', err);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }

    // Development error response
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'INTERNAL_ERROR',
      stack: err.stack,
    });
  });

  // 7. Replace vulnerable routes with secure versions
  app.use('/api/auth', authRoutes);
  console.log('✅ Secure authentication routes applied');

  // 8. Security event handlers
  securityMonitor.on('security-event', event => {
    console.log(`[SECURITY EVENT] ${event.type} - ${event.details.message}`);
  });

  securityMonitor.on('ip-blocked', data => {
    console.log(`[IP BLOCKED] ${data.ip} for ${data.duration}ms`);
  });

  // 9. Graceful shutdown handler
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');

    // Save security metrics
    const metrics = securityMonitor.getMetrics();
    console.log('Security metrics:', metrics);

    // Close connections
    process.exit(0);
  });

  console.log('\n✅ All security hardening measures applied successfully!\n');
}

// Example of how to secure a route with all protections
export function secureRoute(router: express.Router) {
  router.post(
    '/api/campaigns',
    // Authentication
    authenticate,

    // Authorization
    authorize('admin', 'manager'),

    // Rate limiting
    createRateLimiter({
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many campaign creations',
    }).middleware(),

    // Input validation
    validateRequest({ body: schemas.createCampaignSchema }),

    // Handler
    async (req: Request, res: Response) => {
      try {
        // Secure implementation here
        res.json({ success: true });
      } catch (error) {
        // Log security event if needed
        securityMonitor.logEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          SecuritySeverity.LOW,
          req,
          { message: 'Campaign creation failed', error: error.message }
        );
        throw error;
      }
    }
  );
}

// Security best practices configuration
export const securityConfig = {
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
      sameSite: 'strict' as const,
    },
  },

  // CORS configuration
  cors: {
    origin: (origin: string | undefined, callback: Function) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // File upload configuration
  fileUpload: {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    },
    abortOnLimit: true,
    responseOnLimit: 'File too large',
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
    parseNested: true,
    // Security options
    safeFileNames: true,
    preserveExtension: 4,
    debug: process.env.NODE_ENV === 'development',
  },
};

// Export security utilities
export {
  securityMonitor,
  SecurityEventType,
  SecuritySeverity,
} from './security-monitor';

export { createRateLimiter, RateLimitPresets } from './advanced-rate-limiter';

export { securityHeaders, SecurityHeaderPresets } from './security-headers';

export {
  validateRequest,
  sanitizeRequestBody,
  schemas,
} from '../security-fixes/fix-5-input-validation-mass-assignment';
