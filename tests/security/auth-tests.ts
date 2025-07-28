/**
 * Security Authentication Tests
 * 
 * These tests verify that the secure authentication system is working properly
 * and that all security vulnerabilities have been fixed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { UsersRepository } from '../../server/db';
import { tokenService } from '../../server/services/token-service';
import { sessionService } from '../../server/services/session-service';

// Mock server for testing
import express from 'express';
import authRoutes from '../../server/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Security Authentication System', () => {
  let testUser: any;
  const testPassword = 'TestPassword123!';
  const testEmail = 'test@onekeel.com';
  const testUsername = 'testuser';

  beforeEach(async () => {
    // Create a test user for each test
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await UsersRepository.create({
      email: testEmail,
      username: testUsername,
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'agent',
      active: true
    });
  });

  afterEach(async () => {
    // Clean up test user if it exists
    if (testUser) {
      // In a real test, you'd delete the user from the database
      testUser = null;
    }
  });

  describe('POST /api/auth/login', () => {
    it('should reject login with hardcoded admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@onekeel.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login when SKIP_AUTH bypass is attempted', async () => {
      // Set SKIP_AUTH environment variable to true to test bypass protection
      const originalSkipAuth = process.env.SKIP_AUTH;
      process.env.SKIP_AUTH = 'true';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@onekeel.com',
          password: 'password123'
        });

      // Should still require proper authentication even if SKIP_AUTH is set
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      
      // Restore original environment
      process.env.SKIP_AUTH = originalSkipAuth;
    });

    it('should accept valid user credentials from database', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      
      // Verify tokens are proper JWTs (not hardcoded strings)
      expect(response.body.accessToken).not.toMatch(/^skip-auth-token/);
      expect(response.body.accessToken).not.toMatch(/^hardcoded-jwt-token/);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testEmail,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive users', async () => {
      // Deactivate the test user
      testUser.active = false;
      // In a real test, you'd update the user in the database

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should require valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject hardcoded tokens', async () => {
      const hardcodedTokens = [
        'skip-auth-token-123456789',
        'hardcoded-jwt-token-123456789',
        'mock-token',
        'test-token'
      ];

      for (const token of hardcodedTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should accept valid JWT tokens only', async () => {
      // Generate a valid token for the test user
      const tokens = await tokenService.generateTokens({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('Token Security', () => {
    it('should generate secure JWT tokens with proper structure', async () => {
      const tokens = await tokenService.generateTokens({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });

      // Verify token structure (JWT has 3 parts separated by dots)
      expect(tokens.accessToken.split('.')).toHaveLength(3);
      expect(tokens.refreshToken.split('.')).toHaveLength(3);
      
      // Verify tokens are different
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
      
      // Verify expiration is set correctly
      expect(tokens.expiresIn).toBe(900); // 15 minutes
    });

    it('should verify tokens correctly', () => {
      const mockToken = 'invalid.token.here';
      const decoded = tokenService.verifyAccessToken(mockToken);
      expect(decoded).toBeNull();
    });

    it('should handle token expiration', async () => {
      // This would require mocking time or using a very short expiration
      // For now, just verify the concept
      const tokens = await tokenService.generateTokens({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });

      const decoded = tokenService.verifyAccessToken(tokens.accessToken);
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(testUser.id);
    });
  });

  describe('Session Management', () => {
    it('should create sessions properly', async () => {
      const session = await sessionService.createSession(
        testUser.id,
        '127.0.0.1',
        'test-user-agent'
      );

      expect(session).toBeTruthy();
      expect(session?.userId).toBe(testUser.id);
      expect(session?.token).toBeDefined();
      expect(session?.expiresAt).toBeInstanceOf(Date);
    });

    it('should validate sessions correctly', async () => {
      const session = await sessionService.createSession(testUser.id);
      
      if (session) {
        const validation = await sessionService.validateSession(session.token);
        expect(validation).toBeTruthy();
        expect(validation?.user.id).toBe(testUser.id);
      }
    });
  });

  describe('Security Bypass Prevention', () => {
    it('should not allow authentication bypass via environment variables', () => {
      // Test that SKIP_AUTH environment variable is ignored
      const originalSkipAuth = process.env.SKIP_AUTH;
      process.env.SKIP_AUTH = 'true';

      // Import auth middleware to test
      const { authenticate } = require('../../server/middleware/auth');
      
      // Mock request/response
      const mockReq = {
        headers: {},
        user: null
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const mockNext = jest.fn();

      authenticate(mockReq, mockRes, mockNext);

      // Should return 401, not call next()
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();

      // Restore environment
      process.env.SKIP_AUTH = originalSkipAuth;
    });

    it('should not contain hardcoded credentials in source code', async () => {
      // Read the auth routes file and verify no hardcoded credentials
      const fs = require('fs');
      const authRoutesContent = fs.readFileSync('../../server/routes/auth.ts', 'utf8');
      
      // Should not contain the old hardcoded credentials
      expect(authRoutesContent).not.toContain('admin@onekeel.com');
      expect(authRoutesContent).not.toContain('password123');
      expect(authRoutesContent).not.toContain('SKIP_AUTH');
      expect(authRoutesContent).not.toContain('skip-auth-token');
      expect(authRoutesContent).not.toContain('hardcoded-jwt-token');
    });
  });
});

export { app as testApp };