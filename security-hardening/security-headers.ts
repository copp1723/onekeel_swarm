/**
 * Security Headers Middleware
 * Implements comprehensive security headers to protect against common web vulnerabilities
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: {
    directives?: Record<string, string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  } | false;
  
  // HTTP Strict Transport Security
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  } | false;
  
  // X-Frame-Options
  frameguard?: {
    action?: 'DENY' | 'SAMEORIGIN';
  } | false;
  
  // X-Content-Type-Options
  noSniff?: boolean;
  
  // X-XSS-Protection (legacy but still useful)
  xssFilter?: boolean;
  
  // Referrer-Policy
  referrerPolicy?: {
    policy?: string | string[];
  } | false;
  
  // Permissions-Policy (formerly Feature-Policy)
  permissionsPolicy?: {
    features?: Record<string, string[]>;
  } | false;
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy?: {
    policy?: 'require-corp' | 'credentialless' | 'unsafe-none';
  } | false;
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy?: {
    policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  } | false;
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy?: {
    policy?: 'same-origin' | 'same-site' | 'cross-origin';
  } | false;
  
  // Expect-CT
  expectCt?: {
    maxAge?: number;
    enforce?: boolean;
    reportUri?: string;
  } | false;
  
  // Remove powered by header
  hidePoweredBy?: boolean;
  
  // Custom headers
  customHeaders?: Record<string, string>;
}

// Default CSP directives for a secure application
const defaultCspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'", "'unsafe-inline'"], // Consider using nonces instead
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private nonces: Map<string, string> = new Map();

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(config: SecurityHeadersConfig): SecurityHeadersConfig {
    return {
      contentSecurityPolicy: config.contentSecurityPolicy !== false ? {
        directives: { ...defaultCspDirectives, ...(config.contentSecurityPolicy?.directives || {}) },
        reportOnly: config.contentSecurityPolicy?.reportOnly || false,
        reportUri: config.contentSecurityPolicy?.reportUri
      } : false,
      
      hsts: config.hsts !== false ? {
        maxAge: config.hsts?.maxAge || 31536000, // 1 year
        includeSubDomains: config.hsts?.includeSubDomains !== false,
        preload: config.hsts?.preload || false
      } : false,
      
      frameguard: config.frameguard !== false ? {
        action: config.frameguard?.action || 'DENY'
      } : false,
      
      noSniff: config.noSniff !== false,
      xssFilter: config.xssFilter !== false,
      
      referrerPolicy: config.referrerPolicy !== false ? {
        policy: config.referrerPolicy?.policy || 'strict-origin-when-cross-origin'
      } : false,
      
      permissionsPolicy: config.permissionsPolicy !== false ? {
        features: config.permissionsPolicy?.features || {
          camera: ['none'],
          microphone: ['none'],
          geolocation: ['none'],
          payment: ['none']
        }
      } : false,
      
      crossOriginEmbedderPolicy: config.crossOriginEmbedderPolicy !== false ? {
        policy: config.crossOriginEmbedderPolicy?.policy || 'require-corp'
      } : false,
      
      crossOriginOpenerPolicy: config.crossOriginOpenerPolicy !== false ? {
        policy: config.crossOriginOpenerPolicy?.policy || 'same-origin'
      } : false,
      
      crossOriginResourcePolicy: config.crossOriginResourcePolicy !== false ? {
        policy: config.crossOriginResourcePolicy?.policy || 'same-origin'
      } : false,
      
      expectCt: config.expectCt || false,
      hidePoweredBy: config.hidePoweredBy !== false,
      customHeaders: config.customHeaders || {}
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate nonce for CSP
      const nonce = this.generateNonce();
      res.locals.cspNonce = nonce;

      // Apply security headers
      this.applyHeaders(req, res, nonce);

      next();
    };
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  private applyHeaders(req: Request, res: Response, nonce: string) {
    // Content Security Policy
    if (this.config.contentSecurityPolicy) {
      const csp = this.buildCSP(nonce);
      const headerName = this.config.contentSecurityPolicy.reportOnly 
        ? 'Content-Security-Policy-Report-Only' 
        : 'Content-Security-Policy';
      res.setHeader(headerName, csp);
    }

    // HSTS
    if (this.config.hsts) {
      let hstsValue = `max-age=${this.config.hsts.maxAge}`;
      if (this.config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (this.config.hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    if (this.config.frameguard) {
      res.setHeader('X-Frame-Options', this.config.frameguard.action);
    }

    // X-Content-Type-Options
    if (this.config.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (this.config.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (this.config.referrerPolicy) {
      const policy = Array.isArray(this.config.referrerPolicy.policy)
        ? this.config.referrerPolicy.policy.join(', ')
        : this.config.referrerPolicy.policy;
      res.setHeader('Referrer-Policy', policy);
    }

    // Permissions-Policy
    if (this.config.permissionsPolicy) {
      const policy = this.buildPermissionsPolicy();
      res.setHeader('Permissions-Policy', policy);
    }

    // Cross-Origin-Embedder-Policy
    if (this.config.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy.policy);
    }

    // Cross-Origin-Opener-Policy
    if (this.config.crossOriginOpenerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy.policy);
    }

    // Cross-Origin-Resource-Policy
    if (this.config.crossOriginResourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy.policy);
    }

    // Expect-CT
    if (this.config.expectCt) {
      let expectCtValue = `max-age=${this.config.expectCt.maxAge || 86400}`;
      if (this.config.expectCt.enforce) {
        expectCtValue += ', enforce';
      }
      if (this.config.expectCt.reportUri) {
        expectCtValue += `, report-uri="${this.config.expectCt.reportUri}"`;
      }
      res.setHeader('Expect-CT', expectCtValue);
    }

    // Remove X-Powered-By
    if (this.config.hidePoweredBy) {
      res.removeHeader('X-Powered-By');
    }

    // Custom headers
    for (const [header, value] of Object.entries(this.config.customHeaders)) {
      res.setHeader(header, value);
    }
  }

  private buildCSP(nonce: string): string {
    if (!this.config.contentSecurityPolicy || this.config.contentSecurityPolicy === false) {
      return '';
    }

    const directives = this.config.contentSecurityPolicy.directives || {};
    const cspParts: string[] = [];

    for (const [directive, values] of Object.entries(directives)) {
      let directiveStr = directive;
      
      if (values.length > 0) {
        // Add nonce to script-src and style-src if they exist
        const processedValues = values.map(value => {
          if ((directive === 'script-src' || directive === 'style-src') && value === "'strict-dynamic'") {
            return `'nonce-${nonce}' ${value}`;
          }
          return value;
        });
        
        directiveStr += ' ' + processedValues.join(' ');
      }
      
      cspParts.push(directiveStr);
    }

    // Add report-uri if specified
    if (this.config.contentSecurityPolicy.reportUri) {
      cspParts.push(`report-uri ${this.config.contentSecurityPolicy.reportUri}`);
    }

    return cspParts.join('; ');
  }

  private buildPermissionsPolicy(): string {
    if (!this.config.permissionsPolicy || this.config.permissionsPolicy === false) {
      return '';
    }

    const features = this.config.permissionsPolicy.features || {};
    const policyParts: string[] = [];

    for (const [feature, allowList] of Object.entries(features)) {
      const allowListStr = allowList.map(item => {
        if (item === 'self') return 'self';
        if (item === 'none') return '()';
        return `"${item}"`;
      }).join(' ');
      
      policyParts.push(`${feature}=(${allowListStr})`);
    }

    return policyParts.join(', ');
  }

  // Helper to generate secure inline script/style hashes
  static generateHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(content);
    return `'${algorithm}-${hash.digest('base64')}'`;
  }

  // Helper to generate CSP meta tag for SPAs
  static generateMetaTag(config: SecurityHeadersConfig): string {
    const headers = new SecurityHeaders(config);
    const csp = headers.buildCSP('');
    return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  }
}

// Preset configurations for different security levels
export const SecurityHeaderPresets = {
  // Strict security (recommended for production)
  strict: new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        ...defaultCspDirectives,
        'script-src': ["'self'", "'strict-dynamic'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'worker-src': ["'self'"],
        'manifest-src': ["'self'"]
      }
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    },
    expectCt: {
      maxAge: 86400,
      enforce: true
    }
  }),

  // API-only configuration (no UI)
  api: new SecurityHeaders({
    contentSecurityPolicy: false, // Not needed for APIs
    frameguard: false, // APIs don't render in frames
    crossOriginResourcePolicy: {
      policy: 'cross-origin' // Allow cross-origin requests
    },
    customHeaders: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),

  // Development configuration (more permissive)
  development: new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        ...defaultCspDirectives,
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*']
      },
      reportOnly: true
    },
    hsts: false, // Disable for local development
    expectCt: false
  }),

  // Moderate security (balance between security and compatibility)
  moderate: new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        ...defaultCspDirectives,
        'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:']
      }
    }
  })
};

// Middleware factory
export function securityHeaders(config?: SecurityHeadersConfig | 'strict' | 'api' | 'development' | 'moderate') {
  if (typeof config === 'string') {
    return SecurityHeaderPresets[config].middleware();
  }
  
  const headers = new SecurityHeaders(config);
  return headers.middleware();
}