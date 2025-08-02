// Additional Security Measures for Campaign System

import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// 1. Security Headers
export function setupSecurityHeaders(app: Express.Application) {
  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS configuration
  const corsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
}

// 2. Request Sanitization Middleware
export function setupRequestSanitization(app: Express.Application) {
  // Prevent NoSQL injection attacks
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logger.warn('Request sanitization triggered', {
          ip: req.ip,
          key,
          path: req.path,
        });
      },
    })
  );

  // Custom request sanitizer
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Sanitize headers
    const dangerousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ];
    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        logger.warn('Dangerous header detected', {
          header,
          value: req.headers[header],
          ip: req.ip,
        });
        delete req.headers[header];
      }
    });

    next();
  });
}

// 3. File Upload Security
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const ALLOWED_FILE_TYPES = ['.csv', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    // Generate safe filename
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

export const secureFileUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      return cb(
        new Error('Invalid file type. Only CSV and TXT files are allowed.')
      );
    }

    // Check MIME type
    const allowedMimes = ['text/csv', 'text/plain', 'application/csv'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file MIME type.'));
    }

    // Check for double extensions
    const filename = file.originalname.toLowerCase();
    if (filename.includes('..') || filename.split('.').length > 2) {
      return cb(new Error('Invalid filename.'));
    }

    cb(null, true);
  },
});

// 4. Session Security
import session from 'express-session';
import MongoStore from 'connect-mongo';

export function setupSecureSession(app: Express.Application) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.DATABASE_URL,
        touchAfter: 24 * 3600, // lazy session update
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
      },
      name: 'sessionId', // Don't use default name
    })
  );
}

// 5. API Key Management for Email Service
export class SecureApiKeyManager {
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = Buffer.from(
      process.env.API_KEY_ENCRYPTION_KEY || 'default-key-change-in-production',
      'hex'
    );
  }

  encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  decryptApiKey(encryptedKey: string): string {
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// 6. Campaign Execution Security
export class SecureCampaignExecutor {
  // Prevent campaign from sending to blacklisted domains
  private blacklistedDomains = new Set([
    'example.com',
    'test.com',
    'localhost',
    'internal.company.com',
  ]);

  // Rate limit per domain
  private domainSendCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  async validateRecipient(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) return false;

    // Check blacklist
    if (this.blacklistedDomains.has(domain)) {
      logger.warn('Attempted to send to blacklisted domain', { email, domain });
      return false;
    }

    // Check domain rate limits (max 100 emails per domain per hour)
    const now = Date.now();
    const domainLimit = this.domainSendCounts.get(domain);

    if (domainLimit) {
      if (now < domainLimit.resetTime && domainLimit.count >= 100) {
        logger.warn('Domain rate limit exceeded', {
          domain,
          count: domainLimit.count,
        });
        return false;
      }

      if (now >= domainLimit.resetTime) {
        domainLimit.count = 1;
        domainLimit.resetTime = now + 3600000; // 1 hour
      } else {
        domainLimit.count++;
      }
    } else {
      this.domainSendCounts.set(domain, {
        count: 1,
        resetTime: now + 3600000,
      });
    }

    return true;
  }
}

// 7. Monitoring and Alerting
export class SecurityMonitor {
  private alertThresholds = {
    failedLogins: 5,
    rateLimitHits: 10,
    suspiciousRequests: 3,
    largePayloads: 5,
  };

  private metrics = new Map<string, number>();

  recordSecurityEvent(eventType: string, userId?: string, details?: any) {
    const key = `${eventType}:${userId || 'anonymous'}`;
    const count = (this.metrics.get(key) || 0) + 1;
    this.metrics.set(key, count);

    // Check thresholds
    if (count >= this.alertThresholds[eventType]) {
      this.sendSecurityAlert(eventType, userId, count, details);
      this.metrics.set(key, 0); // Reset after alert
    }

    // Log all security events
    logger.info('Security event', {
      type: eventType,
      userId,
      count,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  private sendSecurityAlert(
    eventType: string,
    userId: string | undefined,
    count: number,
    details: any
  ) {
    // In production, this would send to alerting service (PagerDuty, etc.)
    logger.error('SECURITY ALERT', {
      type: eventType,
      userId,
      count,
      threshold: this.alertThresholds[eventType],
      details,
      action: 'Immediate investigation required',
    });

    // Could also trigger automated responses like temporary account lockout
  }
}

export const securityMonitor = new SecurityMonitor();
