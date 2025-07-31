import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mailgunHealthChecker } from '../../../server/utils/service-health/mailgun-health';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Mailgun Integration Tests', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Tests', () => {
    it('should detect when Mailgun is not configured', async () => {
      // Remove Mailgun environment variables
      delete process.env.MAILGUN_API_KEY;
      delete process.env.MAILGUN_DOMAIN;
      delete process.env.MAILGUN_FROM_EMAIL;

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(false);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('not configured');
      expect(health.details?.apiKeyPresent).toBe(false);
      expect(health.details?.domainPresent).toBe(false);
    });

    it('should detect partial configuration', async () => {
      // Set only API key, missing domain
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      delete process.env.MAILGUN_DOMAIN;

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(false);
      expect(health.details?.apiKeyPresent).toBe(true);
      expect(health.details?.domainPresent).toBe(false);
    });

    it('should detect full configuration', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';
      process.env.MAILGUN_FROM_EMAIL = 'test@example.com';

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.details?.apiKeyPresent).toBe(true);
      expect(health.details?.domainPresent).toBe(true);
      expect(health.details?.fromEmailPresent).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate API key format', async () => {
      process.env.MAILGUN_API_KEY = 'invalid-key';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      const validation = await mailgunHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('MAILGUN_API_KEY appears to be invalid format');
    });

    it('should validate domain format', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'invalid-domain';

      const validation = await mailgunHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('MAILGUN_DOMAIN appears to be invalid format');
    });

    it('should pass validation with correct configuration', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';
      process.env.MAILGUN_FROM_EMAIL = 'test@example.com';

      const validation = await mailgunHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should provide recommendations for missing optional config', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';
      delete process.env.MAILGUN_FROM_EMAIL;

      const validation = await mailgunHealthChecker.validateConfiguration();

      expect(validation.recommendations).toContain(
        'Consider setting MAILGUN_FROM_EMAIL for consistent sender address'
      );
    });
  });

  describe('Health Check Tests', () => {
    it('should return proper health status structure', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      const health = await mailgunHealthChecker.checkHealth();

      expect(health).toHaveProperty('configured');
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('lastChecked');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('apiKeyPresent');
      expect(health.details).toHaveProperty('domainPresent');
      expect(health.details).toHaveProperty('fromEmailPresent');
    });

    it('should measure response time', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      const health = await mailgunHealthChecker.checkHealth();

      if (health.configured) {
        expect(health.responseTime).toBeGreaterThan(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      // Set invalid credentials to trigger API error
      process.env.MAILGUN_API_KEY = 'key-invalid123456789';
      process.env.MAILGUN_DOMAIN = 'invalid.example.com';

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.responseTime).toBeGreaterThan(0);
    });
  });

  describe('Send Capability Tests', () => {
    it('should handle unconfigured service', async () => {
      delete process.env.MAILGUN_API_KEY;
      delete process.env.MAILGUN_DOMAIN;

      const result = await mailgunHealthChecker.testSendCapability();

      expect(result.canSend).toBe(false);
      expect(result.error).toBe('Mailgun not configured');
    });

    it('should test send capability with test mode', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      const result = await mailgunHealthChecker.testSendCapability();

      // This will likely fail with invalid credentials, but should handle gracefully
      if (result.canSend) {
        expect(result.testMessageId).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Configuration Summary', () => {
    it('should provide accurate configuration summary', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';
      process.env.MAILGUN_FROM_EMAIL = 'test@example.com';

      const summary = mailgunHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('Mailgun');
      expect(summary.configured).toBe(true);
      expect(summary.domain).toBe('test.example.com');
      expect(summary.hasApiKey).toBe(true);
      expect(summary.hasFromEmail).toBe(true);
    });

    it('should show unconfigured state correctly', async () => {
      delete process.env.MAILGUN_API_KEY;
      delete process.env.MAILGUN_DOMAIN;
      delete process.env.MAILGUN_FROM_EMAIL;

      const summary = mailgunHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('Mailgun');
      expect(summary.configured).toBe(false);
      expect(summary.hasApiKey).toBe(false);
      expect(summary.hasFromEmail).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      // Mock fetch to simulate timeout
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('Network timeout');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle malformed API responses', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      // Mock fetch to return malformed response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const health = await mailgunHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('HTTP 500');

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should work with circuit breaker patterns', async () => {
      process.env.MAILGUN_API_KEY = 'key-test123456789';
      process.env.MAILGUN_DOMAIN = 'test.example.com';

      // Test multiple rapid calls to simulate circuit breaker scenarios
      const promises = Array(5).fill(null).map(() => 
        mailgunHealthChecker.checkHealth()
      );

      const results = await Promise.allSettled(promises);

      // All promises should settle (not reject)
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      // Each result should have proper structure
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('configured');
          expect(result.value).toHaveProperty('connected');
        }
      });
    });
  });
});
