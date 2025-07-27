/**
 * Centralized Security Configuration
 * 
 * This module provides a "secure by default" configuration for the application.
 * Security is ALWAYS enabled, with minimal controlled exceptions for development.
 * 
 * Principle: Security is mandatory, not optional.
 */

import type { SecurityHeadersConfig } from '../../security-hardening/security-headers';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Security configuration that enforces secure defaults
 * Development mode only relaxes certain restrictions for DX, but maintains core security
 */
export const securityConfig = {
  // HTTPS/TLS Configuration
  https: {
    // Always enforce HTTPS in production
    enforceHttps: !isDevelopment,
    // HSTS is always enabled, just with different max-age
    hsts: {
      enabled: true,
      maxAge: isProduction ? 63072000 : 86400, // 2 years in prod, 1 day in dev
      includeSubDomains: isProduction,
      preload: isProduction
    }
  },

  // WebSocket Security - ALWAYS secure, no exceptions
  websocket: {
    // Always use secure WebSocket implementation
    useSecureHandler: true,
    // Authentication required for all WebSocket connections
    requireAuth: true,
    // Rate limiting for WebSocket messages
    rateLimit: {
      enabled: true,
      maxMessagesPerMinute: isDevelopment ? 120 : 60
    }
  },

  // CSRF Protection - ALWAYS enabled
  csrf: {
    enabled: true,
    // Use Redis in production, fallback to in-memory with warnings in dev
    storage: isProduction ? 'redis' : 'memory-with-warning',
    tokenExpiry: 3600000, // 1 hour
    // Double-submit cookie pattern
    doubleSubmit: true,
    // Strict same-site policy
    sameSite: 'strict'
  },

  // Session Configuration
  session: {
    // Always use secure sessions
    secure: !isDevelopment,
    httpOnly: true,
    sameSite: 'strict' as const,
    // Use Redis in production, memory store with warning in dev
    store: isProduction ? 'redis' : 'memory-with-warning',
    // Session expiry
    maxAge: 86400000, // 24 hours
    // Rolling sessions
    rolling: true,
    // Session secret from env or generate warning
    secret: process.env.SESSION_SECRET || (isDevelopment ? 'dev-secret-change-me' : undefined)
  },

  // Security Headers - ALWAYS applied
  headers: {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': isDevelopment 
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*']
          : ["'self'", "'strict-dynamic'"],
        'style-src': isDevelopment
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': isDevelopment
          ? ["'self'", 'ws://localhost:*', 'http://localhost:*']
          : ["'self'"],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': isProduction ? [] : undefined
      },
      reportOnly: isDevelopment,
      reportUri: process.env.CSP_REPORT_URI
    },
    // Always hide X-Powered-By
    hidePoweredBy: true,
    // Always enable other security headers
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'DENY' as const },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  } as SecurityHeadersConfig,

  // Error Handling - Never leak sensitive info
  errorHandling: {
    // Never expose stack traces in production
    exposeStack: isDevelopment,
    // Never expose error details in production
    exposeDetails: isDevelopment,
    // Log errors but sanitize for production
    logErrors: true,
    // Generic error messages in production
    genericMessage: 'An error occurred processing your request'
  },

  // Authentication & Authorization
  auth: {
    // JWT configuration
    jwt: {
      // Token expiry
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      // Always verify tokens
      verifyExpiry: true,
      // Require secure transport
      requireSecure: !isDevelopment
    },
    // Password requirements
    password: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      // Bcrypt rounds
      saltRounds: 12
    }
  },

  // Rate Limiting - Always enabled
  rateLimit: {
    // Global rate limit
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isDevelopment ? 1000 : 100
    },
    // Auth endpoints have stricter limits
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: false
    },
    // API endpoints
    api: {
      windowMs: 15 * 60 * 1000,
      max: isDevelopment ? 500 : 50
    }
  },

  // Input Validation - Always strict
  validation: {
    // Max request body size
    maxBodySize: '100kb',
    // Max URL length
    maxUrlLength: 2048,
    // Sanitize all inputs
    sanitizeInputs: true,
    // Reject unknown fields
    rejectUnknownFields: true
  },

  // Audit & Monitoring
  audit: {
    // Log all authentication attempts
    logAuthAttempts: true,
    // Log all authorization failures
    logAuthzFailures: true,
    // Log security violations
    logSecurityViolations: true,
    // Send alerts for critical security events
    enableAlerts: isProduction
  }
};

/**
 * Security initialization warnings for development
 */
export function logSecurityWarnings(): void {
  if (isDevelopment) {
    console.warn('⚠️  SECURITY WARNING: Running in development mode');
    console.warn('   - Some security features are relaxed for development experience');
    console.warn('   - In-memory session/CSRF storage is being used (data will be lost on restart)');
    console.warn('   - CSP is in report-only mode');
    console.warn('   - HTTPS enforcement is disabled');
    
    if (!process.env.SESSION_SECRET) {
      console.warn('   - Using default session secret (CHANGE THIS!)');
    }
  }

  if (!process.env.SESSION_SECRET && isProduction) {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }

  if (!process.env.JWT_SECRET && isProduction) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
}

/**
 * Validate security configuration at startup
 */
export function validateSecurityConfig(): void {
  // Ensure Redis is available in production
  if (isProduction && !process.env.REDIS_URL) {
    throw new Error('Redis is required for production security features (sessions, CSRF, rate limiting)');
  }

  // Validate session secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

/**
 * Get security middleware configuration based on current environment
 * This ensures security is always enabled with appropriate settings
 */
export function getSecurityMiddlewareConfig() {
  return {
    headers: securityConfig.headers,
    csrf: securityConfig.csrf,
    session: securityConfig.session,
    rateLimit: securityConfig.rateLimit,
    errorHandling: securityConfig.errorHandling
  };
}