/**
 * Environment Variable Validator
 * Validates and secures environment variables on application startup
 */

import { z } from 'zod';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Environment variable schemas
const envSchemas = {
  // Security-critical variables
  JWT_SECRET: z.string().min(32).refine(
    (val) => {
      // Check entropy
      const entropy = calculateEntropy(val);
      return entropy > 4.0; // High entropy required
    },
    { message: 'JWT_SECRET has insufficient entropy. Use a cryptographically secure random string.' }
  ),
  
  JWT_REFRESH_SECRET: z.string().min(32).refine(
    (val) => {
      // Must be different from JWT_SECRET
      return val !== process.env.JWT_SECRET;
    },
    { message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET' }
  ),
  
  SESSION_SECRET: z.string().min(32),
  
  // Database configuration
  DATABASE_URL: z.string().url().refine(
    (val) => {
      // Ensure not using default/weak credentials
      const weakPatterns = ['postgres:postgres', 'root:root', 'admin:admin', 'password123'];
      return !weakPatterns.some(pattern => val.includes(pattern));
    },
    { message: 'DATABASE_URL contains weak credentials' }
  ),
  
  // Redis configuration
  REDIS_URL: z.string().url().optional(),
  
  // API keys and external services
  SENDGRID_API_KEY: z.string().regex(/^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/).optional(),
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-z0-9]{32}$/).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32).optional(),
  
  // Application settings
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n < 65536),
  
  // Security settings
  CORS_ORIGIN: z.string().refine(
    (val) => {
      // Validate CORS origins
      if (val === '*') return false; // Don't allow wildcard in production
      try {
        const origins = val.split(',');
        return origins.every(origin => {
          return origin === 'null' || new URL(origin);
        });
      } catch {
        return false;
      }
    },
    { message: 'CORS_ORIGIN must be a valid comma-separated list of URLs' }
  ).optional(),
  
  ENABLE_ACCESS_LOGS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  ENABLE_SECURITY_MONITORING: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
  
  // File upload settings
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'), // 10MB
  ALLOWED_FILE_TYPES: z.string().default('csv,json,xlsx'),
  
  // Session settings
  SESSION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('3600000'), // 1 hour
  
  // Encryption settings
  ENCRYPTION_KEY: z.string().length(32).optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SECURITY_LOG_PATH: z.string().default('./logs/security'),
  
  // Feature flags
  ENABLE_2FA: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  ENABLE_API_VERSIONING: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  
  // Email settings
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  
  // Webhook security
  WEBHOOK_SECRET: z.string().min(32).optional(),
  
  // OAuth settings
  OAUTH_CLIENT_ID: z.string().optional(),
  OAUTH_CLIENT_SECRET: z.string().min(32).optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional()
};

// Calculate entropy of a string
function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Security checks for environment
interface SecurityCheck {
  name: string;
  check: () => boolean | Promise<boolean>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

const securityChecks: SecurityCheck[] = [
  {
    name: 'Production Debug Mode',
    check: () => process.env.NODE_ENV === 'production' && process.env.DEBUG === '*',
    severity: 'high',
    message: 'DEBUG mode is enabled in production'
  },
  {
    name: 'Insecure Protocol',
    check: () => {
      const urls = [process.env.DATABASE_URL, process.env.REDIS_URL].filter(Boolean);
      return urls.some(url => url?.startsWith('http://') && !url.includes('localhost'));
    },
    severity: 'high',
    message: 'Using insecure HTTP protocol for external services'
  },
  {
    name: 'Default Ports',
    check: () => {
      const port = process.env.PORT;
      return ['3000', '8080', '8000'].includes(port || '');
    },
    severity: 'low',
    message: 'Using common default port, consider using a non-standard port'
  },
  {
    name: 'Weak Session Timeout',
    check: () => {
      const timeout = parseInt(process.env.SESSION_TIMEOUT || '3600000');
      return timeout > 86400000; // More than 24 hours
    },
    severity: 'medium',
    message: 'Session timeout is too long'
  },
  {
    name: 'Missing Security Headers',
    check: () => !process.env.ENABLE_SECURITY_HEADERS || process.env.ENABLE_SECURITY_HEADERS === 'false',
    severity: 'high',
    message: 'Security headers are disabled'
  }
];

export class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private validated: boolean = false;

  /**
   * Validate all environment variables
   */
  async validate(): Promise<void> {
    console.log('🔒 Validating environment variables...\n');
    
    // Check for .env file in production
    if (process.env.NODE_ENV === 'production' && fs.existsSync('.env')) {
      this.errors.push('⚠️  .env file found in production environment');
    }
    
    // Validate each environment variable
    for (const [key, schema] of Object.entries(envSchemas)) {
      try {
        const value = process.env[key];
        
        // Check if required variable is missing
        if (!schema.isOptional() && !value) {
          this.errors.push(`❌ ${key} is required but not set`);
          continue;
        }
        
        // Validate the value
        if (value) {
          schema.parse(value);
          console.log(`✅ ${key} validated`);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.errors.push(`❌ ${key}: ${error.errors[0].message}`);
        } else {
          this.errors.push(`❌ ${key}: Validation failed`);
        }
      }
    }
    
    // Run security checks
    console.log('\n🔍 Running security checks...\n');
    for (const check of securityChecks) {
      const failed = await check.check();
      if (failed) {
        const message = `⚠️  ${check.name}: ${check.message}`;
        if (check.severity === 'critical' || check.severity === 'high') {
          this.errors.push(message);
        } else {
          this.warnings.push(message);
        }
        console.log(message);
      } else {
        console.log(`✅ ${check.name} passed`);
      }
    }
    
    // Generate missing secrets
    this.generateMissingSecrets();
    
    // Final validation status
    this.validated = true;
    
    if (this.errors.length > 0) {
      console.error('\n❌ Environment validation failed with errors:');
      this.errors.forEach(error => console.error(error));
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed. Cannot start application.');
      }
    }
    
    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Environment validation warnings:');
      this.warnings.forEach(warning => console.warn(warning));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ Environment validation passed!');
    }
  }
  
  /**
   * Generate missing secret keys
   */
  private generateMissingSecrets(): void {
    const secretKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'ENCRYPTION_KEY', 'WEBHOOK_SECRET'];
    const missingSecrets: string[] = [];
    
    for (const key of secretKeys) {
      if (!process.env[key] && !envSchemas[key as keyof typeof envSchemas].isOptional()) {
        const secret = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        missingSecrets.push(`${key}=${secret}`);
      }
    }
    
    if (missingSecrets.length > 0) {
      console.log('\n🔑 Generated missing secrets (add these to your .env file):');
      missingSecrets.forEach(secret => console.log(secret));
      
      // In development, auto-set them
      if (process.env.NODE_ENV === 'development') {
        missingSecrets.forEach(secret => {
          const [key, value] = secret.split('=');
          process.env[key] = value;
        });
        console.log('\n✅ Secrets auto-configured for development');
      }
    }
  }
  
  /**
   * Get validation report
   */
  getReport(): { valid: boolean; errors: string[]; warnings: string[] } {
    return {
      valid: this.validated && this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  
  /**
   * Write secure .env.example file
   */
  static generateEnvExample(): void {
    const examples: string[] = [
      '# Security Settings',
      'NODE_ENV=production',
      'JWT_SECRET= # Generate with: openssl rand -base64 48',
      'JWT_REFRESH_SECRET= # Generate with: openssl rand -base64 48',
      'SESSION_SECRET= # Generate with: openssl rand -base64 32',
      '',
      '# Database',
      'DATABASE_URL=postgresql://user:password@localhost:5432/onekeel',
      '',
      '# Redis (optional)',
      'REDIS_URL=redis://localhost:6379',
      '',
      '# Application',
      'PORT=3001',
      'CORS_ORIGIN=https://app.onekeel.com',
      '',
      '# Security Features',
      'ENABLE_ACCESS_LOGS=true',
      'ENABLE_SECURITY_MONITORING=true',
      'ENABLE_2FA=true',
      '',
      '# Rate Limiting',
      'RATE_LIMIT_WINDOW_MS=60000',
      'RATE_LIMIT_MAX_REQUESTS=100',
      '',
      '# File Upload',
      'MAX_FILE_SIZE=10485760',
      'ALLOWED_FILE_TYPES=csv,json,xlsx',
      '',
      '# Session',
      'SESSION_TIMEOUT=3600000',
      '',
      '# Logging',
      'LOG_LEVEL=info',
      'SECURITY_LOG_PATH=./logs/security',
      '',
      '# Email (optional)',
      'SENDGRID_API_KEY=',
      'EMAIL_FROM=noreply@onekeel.com',
      'EMAIL_REPLY_TO=support@onekeel.com',
      '',
      '# Monitoring (optional)',
      'SENTRY_DSN=',
      'NEW_RELIC_LICENSE_KEY='
    ];
    
    fs.writeFileSync('.env.example', examples.join('\n'));
    console.log('✅ Generated .env.example file');
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();

// Validate on import if not in test environment
if (process.env.NODE_ENV !== 'test') {
  envValidator.validate().catch(error => {
    console.error('Failed to validate environment:', error);
    process.exit(1);
  });
}