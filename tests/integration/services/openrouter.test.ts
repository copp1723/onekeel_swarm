import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openRouterHealthChecker } from '../../../server/utils/service-health/openrouter-health';

// Mock environment variables for testing
const originalEnv = process.env;

describe('OpenRouter Integration Tests', () => {
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
    it('should detect when OpenRouter is not configured', async () => {
      // Remove OpenRouter environment variables
      delete process.env.OPENROUTER_API_KEY;

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(false);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('not configured');
      expect(health.details?.apiKeyPresent).toBe(false);
    });

    it('should detect when OpenRouter is configured', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.details?.apiKeyPresent).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate API key presence', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const validation = await openRouterHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('OPENROUTER_API_KEY environment variable not set');
    });

    it('should validate API key length', async () => {
      process.env.OPENROUTER_API_KEY = 'short';

      const validation = await openRouterHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('OPENROUTER_API_KEY appears to be too short');
    });

    it('should pass validation with correct API key', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const validation = await openRouterHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should provide recommendations for fallback configuration', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';
      delete process.env.OPENAI_API_KEY;

      const validation = await openRouterHealthChecker.validateConfiguration();

      expect(validation.recommendations).toContain(
        'Consider setting OPENAI_API_KEY as a fallback for AI operations'
      );
    });
  });

  describe('Health Check Tests', () => {
    it('should return proper health status structure', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      expect(health).toHaveProperty('configured');
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('lastChecked');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('apiKeyPresent');
    });

    it('should measure response time', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      if (health.configured) {
        expect(health.responseTime).toBeGreaterThan(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      // Set invalid API key to trigger API error
      process.env.OPENROUTER_API_KEY = 'sk-or-invalid-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.responseTime).toBeGreaterThan(0);
    });

    it('should include models list when connection succeeds', async () => {
      // Note: This test will fail with invalid credentials but tests the structure
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      if (health.connected) {
        expect(health.details?.modelsAvailable).toBeDefined();
        expect(Array.isArray(health.details?.modelsAvailable)).toBe(true);
      }
    });

    it('should include account info when available', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const health = await openRouterHealthChecker.checkHealth();

      if (health.connected && health.details?.accountInfo) {
        expect(health.details.accountInfo).toHaveProperty('label');
        expect(health.details.accountInfo).toHaveProperty('usage');
        expect(health.details.accountInfo).toHaveProperty('limit');
      }
    });
  });

  describe('Generation Capability Tests', () => {
    it('should handle unconfigured service', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await openRouterHealthChecker.testGenerationCapability();

      expect(result.canGenerate).toBe(false);
      expect(result.error).toBe('OpenRouter not configured');
    });

    it('should test generation capability', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const result = await openRouterHealthChecker.testGenerationCapability();

      // This will likely fail with invalid credentials, but should handle gracefully
      if (result.canGenerate) {
        expect(result.testResponse).toBeDefined();
        expect(result.model).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle API rate limits', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      // Mock fetch to simulate rate limit
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const result = await openRouterHealthChecker.testGenerationCapability();

      expect(result.canGenerate).toBe(false);
      expect(result.error).toContain('HTTP 429');

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Models API Tests', () => {
    it('should handle unconfigured service for models', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await openRouterHealthChecker.getAvailableModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenRouter not configured');
    });

    it('should fetch available models', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const result = await openRouterHealthChecker.getAvailableModels();

      // This will likely fail with invalid credentials, but should handle gracefully
      if (result.success) {
        expect(result.models).toBeDefined();
        expect(Array.isArray(result.models)).toBe(true);
        if (result.models && result.models.length > 0) {
          expect(result.models[0]).toHaveProperty('id');
          expect(result.models[0]).toHaveProperty('name');
        }
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle API errors when fetching models', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-invalid-key-1234567890abcdef';

      // Mock fetch to simulate API error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await openRouterHealthChecker.getAvailableModels();

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Configuration Summary', () => {
    it('should provide accurate configuration summary', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      const summary = openRouterHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('OpenRouter');
      expect(summary.configured).toBe(true);
      expect(summary.hasApiKey).toBe(true);
      expect(summary.baseUrl).toBe('https://openrouter.ai/api/v1');
    });

    it('should show unconfigured state correctly', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const summary = openRouterHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('OpenRouter');
      expect(summary.configured).toBe(false);
      expect(summary.hasApiKey).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      // Mock fetch to simulate timeout
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('Network timeout');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle malformed JSON responses', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      // Mock fetch to return malformed JSON
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('Invalid JSON');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle authentication errors', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-invalid-key-1234567890abcdef';

      // Mock fetch to simulate auth error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const health = await openRouterHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('HTTP 401');

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should work with circuit breaker patterns', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890abcdef';

      // Test multiple rapid calls to simulate circuit breaker scenarios
      const promises = Array(5).fill(null).map(() => 
        openRouterHealthChecker.checkHealth()
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
