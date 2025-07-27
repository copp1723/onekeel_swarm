# Security Migration Guide: From Opt-In to Secure-By-Default

This guide provides step-by-step instructions to migrate the OneKeel Swarm application from opt-in security to mandatory "secure by default" architecture.

## Overview of Security Issues Fixed

### Critical Issues Addressed:
1. **WebSocket Security**: Was only secure in production, now always secure
2. **CSRF Protection**: Fixed in-memory storage vulnerability, now uses proper session storage
3. **Security Headers**: Were created but not integrated, now mandatory
4. **Error Handling**: Prevented information leakage in production
5. **Session Management**: Implemented secure session storage with Redis

## Migration Steps

### Step 1: Add New Security Files

Copy these new files to your project:
- `/server/config/security.ts` - Centralized security configuration
- `/server/middleware/csrf-secure.ts` - Secure CSRF implementation
- `/server/middleware/error-handler-secure.ts` - Secure error handling
- `/server/middleware/security-integration.ts` - Security middleware integration
- `/server/services/redis.ts` - Redis service for secure storage
- `/server/websocket/secure-websocket-service.ts` - Always-secure WebSocket

### Step 2: Update Environment Variables

Add these required environment variables:

```bash
# Production Required
SESSION_SECRET=<32+ character random string>
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<32+ character random string>
REDIS_URL=redis://your-redis-server:6379

# Optional
CSP_REPORT_URI=https://your-csp-reporting-endpoint
```

### Step 3: Install Required Dependencies

```bash
npm install connect-redis
```

### Step 4: Update server/index.ts

Replace the current `server/index.ts` with the secure version. Key changes:

1. Import security modules at the top:
```typescript
import { initializeSecurity, applyErrorHandlers, getSecurityStatus } from './middleware/security-integration';
import { SecureWebSocketService } from './websocket/secure-websocket-service';
import { shutdownRedis } from './services/redis';
import { securityConfig } from './config/security';
```

2. Initialize security before any other middleware:
```typescript
// Initialize security FIRST - before any other middleware
await initializeSecurity(app);
```

3. Replace WebSocket initialization (remove the production-only check):
```typescript
// OLD CODE - REMOVE THIS:
if (config.nodeEnv === 'production' || process.env.SECURE_WEBSOCKET === 'true') {
  // Conditional secure WebSocket
}

// NEW CODE - ALWAYS SECURE:
if (config.features.enableWebSocket) {
  wss = new WebSocketServer({ server });
  secureWebSocketService = new SecureWebSocketService(wss);
  // ... rest of WebSocket setup
}
```

4. Remove old CSRF configuration:
```typescript
// REMOVE THESE LINES:
import { configureCsrf } from './middleware/csrf';
const csrf = configureCsrf();
app.use(csrf.inject);
app.use('/api', csrf.verify);
```

5. Remove old error handlers:
```typescript
// REMOVE THESE IMPORTS:
import { globalErrorHandler, notFoundHandler } from './utils/error-handler';
import { requestTimeout } from './middleware/error-handler';

// REMOVE THESE LINES AT THE END:
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ADD THIS INSTEAD (after routes):
applyErrorHandlers(app);
```

6. Update health endpoint to include security status:
```typescript
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    // ... existing fields
    security: getSecurityStatus(), // ADD THIS
    uptime: process.uptime()
  });
});
```

7. Add Redis shutdown to graceful shutdown:
```typescript
const shutdown = async () => {
  // ... existing shutdown code
  
  // Shutdown Redis
  await shutdownRedis();
  
  // ... rest of shutdown
};
```

### Step 5: Update Package.json Scripts

Add validation script:
```json
{
  "scripts": {
    "security:check": "tsx scripts/security-check.ts"
  }
}
```

### Step 6: Create Security Check Script

Create `scripts/security-check.ts`:
```typescript
import { validateSecurityConfig, getSecurityStatus } from '../server/config/security';

try {
  validateSecurityConfig();
  console.log('✅ Security configuration is valid');
  console.log('Security Status:', getSecurityStatus());
} catch (error) {
  console.error('❌ Security configuration error:', error.message);
  process.exit(1);
}
```

## Testing the Migration

1. **Development Testing**:
   ```bash
   npm run dev
   ```
   - Check console for security warnings
   - Verify WebSocket requires authentication
   - Test CSRF protection on API endpoints
   - Verify error messages don't leak sensitive info

2. **Production Testing**:
   ```bash
   NODE_ENV=production npm start
   ```
   - Ensure Redis is connected
   - Verify all security headers are present
   - Test that errors return generic messages
   - Confirm WebSocket is using secure handler

3. **Security Validation**:
   ```bash
   npm run security:check
   ```

## Rollback Plan

If issues occur, you can temporarily rollback by:
1. Restoring original `server/index.ts`
2. Keeping new security files (they won't be used)
3. Planning fixes before re-attempting migration

## Security Monitoring

After migration, monitor:
- Redis connection stability
- CSRF token validation rates
- WebSocket authentication failures
- Error rates and types

## Benefits of This Migration

1. **Consistent Security**: Security is enforced in all environments
2. **No Accidental Exposure**: Production never leaks sensitive information
3. **Better Performance**: Redis-backed sessions and CSRF tokens
4. **Audit Trail**: All security events are logged
5. **Future-Proof**: Easy to add new security features

## Common Issues and Solutions

### Redis Connection Errors
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL format: `redis://[username:password@]host:port[/database]`
- In development, the app will fallback to memory storage with warnings

### CSRF Token Errors
- Clear browser cookies and localStorage
- Ensure session middleware is initialized before CSRF
- Check that Redis has enough memory for sessions

### WebSocket Authentication Failures
- Verify JWT tokens are being sent in WebSocket handshake
- Check token expiration times
- Ensure token service is using correct secrets

## Next Steps

1. Enable security monitoring and alerting
2. Set up CSP reporting endpoint
3. Implement security event dashboard
4. Schedule security audits
5. Document security procedures for team

Remember: Security is now mandatory, not optional. This is a feature, not a bug!