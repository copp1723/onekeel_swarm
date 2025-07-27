/**
 * Automated Security Testing Suite
 * Comprehensive security tests to verify all fixes are properly implemented
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  testTimeout: 30000,
  sqlInjectionPayloads: [
    "' OR '1'='1",
    "1'; DROP TABLE users--",
    "1' UNION SELECT NULL, username, password FROM users--",
    "admin' --",
    "1 OR 1=1",
    "${1+1}",
    "'; EXEC xp_cmdshell('dir'); --"
  ],
  xssPayloads: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>'
  ],
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '....//....//....//etc/passwd'
  ]
};

describe('Security Test Suite', () => {
  let app: Application;
  let authToken: string;
  let csrfToken: string;

  beforeAll(async () => {
    // Initialize test environment
    // In real tests, you would start your server here
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Authentication Security', () => {
    it('should not allow hardcoded admin credentials', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'admin@onekeel.com',
          password: 'password123'
        });

      // Should fail with proper error, not succeed
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not allow authentication bypass via SKIP_AUTH', async () => {
      // Set SKIP_AUTH env var temporarily
      process.env.SKIP_AUTH = 'true';

      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      // Should still require valid authentication
      expect(response.status).toBe(401);
      
      // Clean up
      delete process.env.SKIP_AUTH;
    });

    it('should enforce strong JWT secrets', async () => {
      // Test that weak JWT secrets are rejected
      const weakSecrets = ['secret', '12345', 'password', 'jwt-secret'];
      
      for (const secret of weakSecrets) {
        process.env.JWT_SECRET = secret;
        
        // Server should refuse to start or validate with weak secret
        try {
          // Attempt to initialize auth middleware
          const { authenticate } = require('../server/middleware/auth');
          expect(authenticate).toThrow(); // Should throw on weak secret
        } catch (error) {
          expect(error.message).toContain('JWT_SECRET must be');
        }
      }
    });

    it('should implement proper rate limiting on login', async () => {
      const attempts = 10;
      const responses = [];

      // Make multiple login attempts
      for (let i = 0; i < attempts; i++) {
        const response = await request(TEST_CONFIG.baseUrl)
          .post('/api/auth/login')
          .send({
            username: 'test@example.com',
            password: 'wrongpassword'
          });
        responses.push(response);
      }

      // Should rate limit after 5 attempts
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should validate JWT tokens properly', async () => {
      // Test various invalid tokens
      const invalidTokens = [
        'invalid-token',
        jwt.sign({ userId: 'test' }, 'wrong-secret'),
        jwt.sign({ userId: 'test' }, process.env.JWT_SECRET || 'test', { expiresIn: '-1h' }), // Expired
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJ0ZXN0In0.' // Algorithm: none
      ];

      for (const token of invalidTokens) {
        const response = await request(TEST_CONFIG.baseUrl)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in search queries', async () => {
      for (const payload of TEST_CONFIG.sqlInjectionPayloads) {
        const response = await request(TEST_CONFIG.baseUrl)
          .get('/api/campaigns')
          .query({ search: payload })
          .set('Authorization', `Bearer ${authToken}`);

        // Should not return SQL error or expose schema
        expect(response.status).not.toBe(500);
        if (response.body.error) {
          expect(response.body.error.message).not.toMatch(/sql|syntax|column/i);
        }
      }
    });

    it('should use parameterized queries for IDs', async () => {
      const maliciousIds = [
        "1' OR '1'='1",
        "1; DELETE FROM campaigns--",
        "1 UNION SELECT * FROM users"
      ];

      for (const id of maliciousIds) {
        const response = await request(TEST_CONFIG.baseUrl)
          .get(`/api/campaigns/${encodeURIComponent(id)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should handle gracefully
        expect(response.status).toBe(400); // Bad request for invalid ID format
      }
    });

    it('should validate array inputs to prevent injection', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/campaigns/execution/trigger')
        .send({
          campaignId: 'valid-uuid',
          leadIds: ["1' OR '1'='1", "2; DROP TABLE leads--"]
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Should validate IDs properly
      expect(response.status).toBe(400);
      expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input to prevent XSS', async () => {
      for (const payload of TEST_CONFIG.xssPayloads) {
        const response = await request(TEST_CONFIG.baseUrl)
          .post('/api/leads')
          .send({
            firstName: payload,
            lastName: payload,
            email: 'test@example.com',
            notes: payload
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 201) {
          // Check that payload was sanitized
          expect(response.body.lead.firstName).not.toContain('<script>');
          expect(response.body.lead.firstName).not.toContain('javascript:');
          expect(response.body.lead.notes).not.toContain('<script>');
        }
      }
    });

    it('should set proper Content-Security-Policy headers', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-security-policy']).toBeDefined();
      const csp = response.headers['content-security-policy'];
      
      // Check for secure directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    });
  });

  describe('Mass Assignment Protection', () => {
    it('should prevent setting protected fields', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/users')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'ValidPassword123!',
          firstName: 'New',
          lastName: 'User',
          // Attempt to set protected fields
          role: 'admin',
          id: 'custom-id',
          passwordHash: 'custom-hash',
          active: true,
          createdAt: '2020-01-01'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        // Protected fields should not be set
        expect(response.body.user.role).not.toBe('admin');
        expect(response.body.user.id).not.toBe('custom-id');
        expect(response.body.user.passwordHash).toBeUndefined();
      }
    });

    it('should use strict validation schemas', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/campaigns')
        .send({
          name: 'Test Campaign',
          type: 'drip',
          // Extra fields that shouldn't be allowed
          __proto__: { isAdmin: true },
          constructor: { name: 'hack' },
          prototype: { hack: true }
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Should strip dangerous fields
      expect(response.body.campaign?.__proto__).toBeUndefined();
      expect(response.body.campaign?.constructor).not.toEqual({ name: 'hack' });
    });
  });

  describe('Security Headers', () => {
    it('should set all required security headers', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/health');

      // Check security headers
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@domain',
        '<script>@example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(TEST_CONFIG.baseUrl)
          .post('/api/auth/login')
          .send({
            username: email,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error?.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '12345678', // No uppercase, lowercase, special
        'Password', // No number, special
        'password123', // No uppercase, special
        'Password123', // No special
        'Pass!23' // Too short
      ];

      for (const password of weakPasswords) {
        const response = await request(TEST_CONFIG.baseUrl)
          .post('/api/users')
          .send({
            email: 'test@example.com',
            username: 'testuser',
            password: password,
            firstName: 'Test',
            lastName: 'User'
          })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error?.message).toContain('password');
      }
    });

    it('should validate UUID formats', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '../etc/passwd'
      ];

      for (const id of invalidUUIDs) {
        const response = await request(TEST_CONFIG.baseUrl)
          .get(`/api/campaigns/${id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens on state-changing operations', async () => {
      // Attempt POST without CSRF token
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/campaigns')
        .send({ name: 'Test' })
        .set('Authorization', `Bearer ${authToken}`);

      // Should require CSRF token
      if (response.headers['x-csrf-token']) {
        expect(response.status).toBe(403);
        expect(response.body.error).toContain('CSRF');
      }
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFiles = [
        { name: 'test.exe', type: 'application/exe' },
        { name: 'test.php', type: 'application/php' },
        { name: '../../../etc/passwd', type: 'text/plain' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(TEST_CONFIG.baseUrl)
          .post('/api/upload')
          .attach('file', Buffer.from('malicious content'), file)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      for (const payload of TEST_CONFIG.pathTraversalPayloads) {
        const response = await request(TEST_CONFIG.baseUrl)
          .get(`/api/files/${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should not expose system files
        expect(response.status).not.toBe(200);
        if (response.text) {
          expect(response.text).not.toContain('root:');
          expect(response.text).not.toContain('[boot loader]');
        }
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      // Login
      const loginResponse = await request(TEST_CONFIG.baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'ValidPassword123!'
        });

      const token = loginResponse.body.accessToken;

      // Logout
      await request(TEST_CONFIG.baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the token
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should implement secure session cookies', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'ValidPassword123!'
        });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
        expect(cookies.some((c: string) => c.includes('Secure'))).toBe(true);
        expect(cookies.some((c: string) => c.includes('SameSite'))).toBe(true);
      }
    });
  });

  describe('API Security', () => {
    it('should implement proper CORS configuration', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .options('/api/campaigns')
        .set('Origin', 'https://evil.com');

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
    });

    it('should rate limit API endpoints', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(TEST_CONFIG.baseUrl)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/internal-error-test')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 500) {
        // Should not expose stack traces or internal details
        expect(response.body).not.toContain('at ');
        expect(response.body).not.toContain('node_modules');
        expect(response.body).not.toContain('.ts:');
        expect(response.body.error?.code).toBe('INTERNAL_ERROR');
      }
    });
  });
});

// Security test utilities
export class SecurityTestUtils {
  /**
   * Generate a valid JWT token for testing
   */
  static generateTestToken(payload: any, secret: string = process.env.JWT_SECRET || 'test-secret'): string {
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  /**
   * Test for timing attacks in authentication
   */
  static async testTimingAttack(endpoint: string, validPayload: any, invalidPayload: any, iterations: number = 100) {
    const validTimes: number[] = [];
    const invalidTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Test valid credentials
      const validStart = process.hrtime.bigint();
      await request(endpoint).post('/api/auth/login').send(validPayload);
      const validEnd = process.hrtime.bigint();
      validTimes.push(Number(validEnd - validStart));

      // Test invalid credentials
      const invalidStart = process.hrtime.bigint();
      await request(endpoint).post('/api/auth/login').send(invalidPayload);
      const invalidEnd = process.hrtime.bigint();
      invalidTimes.push(Number(invalidEnd - invalidStart));
    }

    // Calculate averages
    const validAvg = validTimes.reduce((a, b) => a + b) / validTimes.length;
    const invalidAvg = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;

    // The difference should be minimal to prevent timing attacks
    const difference = Math.abs(validAvg - invalidAvg);
    const threshold = validAvg * 0.1; // 10% threshold

    return {
      vulnerable: difference > threshold,
      validAvg,
      invalidAvg,
      difference
    };
  }

  /**
   * Check for common security misconfigurations
   */
  static async checkSecurityMisconfigurations(baseUrl: string) {
    const issues = [];

    // Check for exposed debug endpoints
    const debugEndpoints = ['/debug', '/metrics', '/health/detailed', '/.env', '/config'];
    for (const endpoint of debugEndpoints) {
      const response = await request(baseUrl).get(endpoint);
      if (response.status === 200) {
        issues.push(`Exposed debug endpoint: ${endpoint}`);
      }
    }

    // Check for directory listing
    const response = await request(baseUrl).get('/uploads/');
    if (response.text.includes('Index of') || response.text.includes('<title>Directory listing')) {
      issues.push('Directory listing enabled');
    }

    return issues;
  }
}