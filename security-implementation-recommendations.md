# Security Implementation Recommendations

## Critical Fixes Required (Implement Immediately)

### 1. CSRF Protection Implementation

```typescript
// server/middleware/csrf.ts
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Configure CSRF middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// CSRF error handler
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid CSRF token'
      }
    });
  } else {
    next(err);
  }
};

export { csrfProtection };
```

### 2. Error Handling Middleware

```typescript
// server/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  category?: string;
}

export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log full error internally
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id
  });

  // Sanitize error for client
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;
  
  const response: any = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode < 500 ? err.message : 'An error occurred processing your request'
    }
  };

  // Only include stack trace in development
  if (isDevelopment && statusCode >= 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
```

### 3. Input Validation Schemas

```typescript
// server/validation/schemas.ts
import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email().toLowerCase().trim();

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');

// UUID validation
export const uuidSchema = z.string().uuid();

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().max(255),
  mimetype: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/csv'
  ]),
  size: z.number().max(10 * 1024 * 1024) // 10MB limit
});
```

### 4. Security Headers Integration

```typescript
// server/index.ts
import { securityHeaders } from './security-hardening/security-headers';

// Apply security headers based on environment
app.use(securityHeaders(
  process.env.NODE_ENV === 'production' ? 'strict' : 'development'
));
```

### 5. Rate Limiting Enhancement

```typescript
// server/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../utils/redis-client';

// Different limits for different endpoints
export const authLimiter = rateLimit({
  store: redis ? new RedisStore({ client: redis }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  store: redis ? new RedisStore({ client: redis }) : undefined,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Implementation Priority

1. **Immediate (Within 24 hours)**
   - CSRF protection on all state-changing endpoints
   - Error handling middleware
   - Security headers integration

2. **High Priority (Within 48 hours)**
   - Complete input validation schemas
   - File upload security
   - Rate limiting enhancements

3. **Medium Priority (Within 1 week)**
   - Service layer implementation
   - Comprehensive logging
   - Security monitoring dashboard

## Testing Requirements

### Security Test Cases

```typescript
// tests/security/csrf.test.ts
describe('CSRF Protection', () => {
  it('should reject requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/campaigns')
      .send({ name: 'Test' })
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_VALIDATION_FAILED');
  });
  
  it('should accept requests with valid CSRF token', async () => {
    // Get CSRF token
    const tokenResponse = await request(app)
      .get('/api/csrf-token')
      .set('Authorization', `Bearer ${token}`);
      
    const csrfToken = tokenResponse.body.csrfToken;
    
    // Use token in request
    const response = await request(app)
      .post('/api/campaigns')
      .send({ name: 'Test' })
      .set('Authorization', `Bearer ${token}`)
      .set('X-CSRF-Token', csrfToken);
      
    expect(response.status).not.toBe(403);
  });
});
```

## Monitoring and Alerting

### Security Event Monitoring

```typescript
// server/monitoring/security-alerts.ts
import { securityMonitor } from '../security-hardening/security-monitor';

// Alert on suspicious patterns
securityMonitor.on('suspicious-activity', (event) => {
  if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
    // Send immediate alert
    alerting.sendSecurityAlert({
      type: event.type,
      severity: event.severity,
      details: event.details,
      timestamp: event.timestamp
    });
  }
});

// Daily security report
schedule.scheduleJob('0 0 * * *', async () => {
  const report = await securityMonitor.generateDailyReport();
  await emailService.sendSecurityReport(report);
});
```

## Deployment Checklist

- [ ] All environment variables configured
- [ ] CSRF protection enabled
- [ ] Error handling middleware active
- [ ] Security headers verified
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates valid
- [ ] Database connection encrypted
- [ ] WebSocket security enabled
- [ ] Logging configured
- [ ] Monitoring alerts set up

## Security Contact

For security concerns or vulnerability reports:
- Email: security@onekeel.com
- Response time: < 24 hours for critical issues
