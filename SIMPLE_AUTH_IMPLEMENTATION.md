# Simple Authentication System Implementation

## Overview
This document outlines the implementation of a simplified authentication system that replaces the complex token/session services with a basic JWT-based system supporting only two roles: **admin** and **user**.

## Changes Made

### 1. Created Simple Authentication Middleware
**File:** `server/middleware/simple-auth.ts`

- **`isAuthenticated`**: Basic JWT token verification middleware
- **`isAdmin`**: Admin-only access middleware 
- **`optionalAuth`**: Optional authentication for public endpoints
- **`ownsResourceOrAdmin`**: Resource ownership or admin access middleware
- **`generateToken`**: Simple JWT token generation
- **`hashPassword`** & **`verifyPassword`**: Basic password utilities

### 2. Updated Database Schema
**File:** `server/db/schema.ts`
**Migration:** `migrations/0012_simplify_user_roles.sql`

- Simplified `userRoleEnum` from `['admin', 'manager', 'agent', 'viewer']` to `['admin', 'user']`
- Updated default role from `'agent'` to `'user'`
- Migration script converts existing roles: admin stays admin, everything else becomes user

### 3. Updated Authentication Routes
**File:** `server/routes/auth.ts`

- Replaced complex token service with simple JWT generation
- Removed refresh token functionality (24-hour tokens instead)
- Simplified logout (client-side token removal)
- Removed complex session management

### 4. Updated Route Protection
**Files:** Various route files (`users.ts`, `campaigns.ts`, etc.)

- Added `isAuthenticated` middleware to protected endpoints
- Added `isAdmin` middleware to admin-only endpoints like user management
- Replaced complex role-based authorization with simple admin/user checks

### 5. Updated WebSocket Authentication
**File:** `server/websocket/secure-websocket-service.ts`

- Replaced complex token service with simple JWT verification
- Maintained secure WebSocket connection handling
- Simplified token validation logic

## Security Features Maintained

✅ **JWT Token Security**: Strong secret validation, proper token verification  
✅ **Password Hashing**: bcrypt with 12 rounds  
✅ **User Account Validation**: Active user checks  
✅ **Input Validation**: Zod schemas for request validation  
✅ **Error Handling**: Proper error responses without information leakage  

## Security Features Removed

❌ **Refresh Tokens**: Now using 24-hour access tokens  
❌ **Session Tracking**: Server-side session management removed  
❌ **Token Blacklisting**: Relies on token expiration  
❌ **Complex Role Hierarchy**: Simplified to admin/user binary  
❌ **Multi-tenant Isolation**: Removed complex permission matrices  

## Role System

### Admin Role
- Full access to all endpoints
- Can manage users, campaigns, and system settings
- Can access admin-only routes like `/api/users`

### User Role  
- Access to own data and general application features
- Cannot access admin-only endpoints
- Can view and manage own campaigns, leads, etc.

## Configuration

### Environment Variables Required
```bash
JWT_SECRET=your-64-character-secret-key-here
```

### Default Token Settings
- **Expiration**: 24 hours
- **Algorithm**: HS256
- **Issuer**: Simple auth system

## Testing

A comprehensive test script is available at `test-simple-auth.js`:

```bash
node test-simple-auth.js
```

Tests cover:
- Admin and user login
- Token validation
- Access control enforcement
- Logout functionality

## API Changes

### Login Response (Simplified)
```json
{
  "success": true,
  "user": { "id": "...", "role": "admin|user", ... },
  "accessToken": "jwt-token-here",
  "expiresIn": 86400
}
```

### Removed Endpoints
- `POST /api/auth/refresh` (no longer needed)

## Implementation Benefits

1. **Simplicity**: Much easier to understand and maintain
2. **Performance**: Reduced database queries and Redis dependencies  
3. **Security**: Focused security model with clear boundaries
4. **Scalability**: Stateless JWT tokens scale better than sessions
5. **Development Speed**: Faster development with simpler auth logic

## Migration Notes

1. Run the database migration: `migrations/0012_simplify_user_roles.sql`
2. Update client applications to handle new token format
3. Remove refresh token logic from frontend
4. Test all protected endpoints with new auth system

## Files Modified

- `server/middleware/simple-auth.ts` (new)
- `server/db/schema.ts`
- `server/routes/auth.ts`
- `server/routes/users.ts`
- `server/routes/campaigns.ts`
- `server/websocket/secure-websocket-service.ts`
- `migrations/0012_simplify_user_roles.sql` (new)
- `test-simple-auth.js` (new)

This simplified authentication system provides secure, maintainable authentication suitable for 2-3 clients while removing unnecessary complexity.