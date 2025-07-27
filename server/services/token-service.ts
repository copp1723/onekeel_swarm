// FIX 3: Secure JWT Configuration
// File: server/services/token-service.ts

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { argv } from 'process';
import { redis } from '../utils/redis-client';

// Secure token configuration
const TOKEN_CONFIG = {
  // Ensure strong secrets from environment
  accessSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  
  // Token expiration times
  accessTokenExpiry: '15m', // 15 minutes
  refreshTokenExpiry: '7d', // 7 days
  
  // Security options
  issuer: 'onekeel-swarm',
  audience: 'onekeel-api',
  
  // Algorithm
  algorithm: 'HS256' as jwt.Algorithm
};

// Validate secrets on startup
function validateSecrets() {
  if (!TOKEN_CONFIG.accessSecret || TOKEN_CONFIG.accessSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  
  if (!TOKEN_CONFIG.refreshSecret || TOKEN_CONFIG.refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
  }
  
  // Ensure secrets are different
  if (TOKEN_CONFIG.accessSecret === TOKEN_CONFIG.refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
}

// Initialize on module load
validateSecrets();

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti?: string;
}

class TokenService {
  private blacklistedTokens: Set<string> = new Set();
  
  /**
   * Generate both access and refresh tokens
   */
  async generateTokens(user: { id: string; email: string; role: string }) {
    const sessionId = crypto.randomUUID();
    const jti = crypto.randomUUID(); // Unique token ID for revocation
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };
    
    // Generate access token with short expiry
    const accessToken = jwt.sign(
      payload,
      TOKEN_CONFIG.accessSecret!,
      {
        expiresIn: TOKEN_CONFIG.accessTokenExpiry,
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithm: TOKEN_CONFIG.algorithm,
        jwtid: jti
      }
    );
    
    // Generate refresh token with longer expiry
    const refreshToken = jwt.sign(
      payload,
      TOKEN_CONFIG.refreshSecret!,
      {
        expiresIn: TOKEN_CONFIG.refreshTokenExpiry,
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithm: TOKEN_CONFIG.algorithm,
        jwtid: crypto.randomUUID()
      }
    );
    
    // Store session in Redis if available
    if (redis) {
      await redis.setex(
        `session:${sessionId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          createdAt: new Date().toISOString()
        })
      );
    }
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }
  
  /**
   * Verify access token
   */
  verifyAccessToken(token: string): DecodedToken | null {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        return null;
      }
      
      const decoded = jwt.verify(token, TOKEN_CONFIG.accessSecret!, {
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithms: [TOKEN_CONFIG.algorithm]
      }) as DecodedToken;
      
      // Additional validation
      if (!decoded.userId || !decoded.email || !decoded.role) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('Token expired:', error.expiredAt);
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.warn('Invalid token:', error.message);
      }
      return null;
    }
  }
  
  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.verify(token, TOKEN_CONFIG.refreshSecret!, {
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithms: [TOKEN_CONFIG.algorithm]
      }) as DecodedToken;
      
      return decoded;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(refreshToken: string) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return null;
    }
    
    // Check if session is still valid in Redis
    if (redis && decoded.sessionId) {
      const session = await redis.get(`session:${decoded.sessionId}`);
      if (!session) {
        return null;
      }
    }
    
    // Generate new tokens
    return this.generateTokens({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(token: string) {
    this.blacklistedTokens.add(token);
    
    // Also revoke in Redis if available
    if (redis) {
      const decoded = this.verifyAccessToken(token) || this.verifyRefreshToken(token);
      if (decoded && decoded.jti) {
        await redis.setex(`blacklist:${decoded.jti}`, 7 * 24 * 60 * 60, '1');
      }
    }
  }
  
  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string) {
    // In production, this would invalidate all sessions in Redis
    if (redis) {
      // Get all sessions for user and delete them
      // This is a simplified version - in production you'd track sessions better
      console.log(`Revoking all tokens for user: ${userId}`);
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();

// Utility to generate secure secrets
export function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
}

// Script to generate secrets (can be run separately)
// For ES modules, check if this file is being run directly
if (import.meta.url === `file://${argv[1]}` || fileURLToPath(import.meta.url) === argv[1]) {
  console.log('Generate these secure secrets for your .env file:');
  console.log(`JWT_SECRET=${generateSecureSecret(64)}`);
  console.log(`JWT_REFRESH_SECRET=${generateSecureSecret(64)}`);
  console.log(`SESSION_SECRET=${generateSecureSecret(32)}`);
}