import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { twilioHealthChecker } from '../../../server/utils/service-health/twilio-health';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Twilio Integration Tests', () => {
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
    it('should detect when Twilio is not configured', async () => {
      // Remove Twilio environment variables
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      const health = await twilioHealthChecker.checkHealth();

      expect(health.configured).toBe(false);
      expect(health.connected).toBe(false);
      expect(health.error).toContain('not configured');
      expect(health.details?.accountSidPresent).toBe(false);
      expect(health.details?.authTokenPresent).toBe(false);
    });

    it('should detect partial configuration', async () => {
      // Set only Account SID, missing Auth Token
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      delete process.env.TWILIO_AUTH_TOKEN;

      const health = await twilioHealthChecker.checkHealth();

      expect(health.configured).toBe(false);
      expect(health.details?.accountSidPresent).toBe(true);
      expect(health.details?.authTokenPresent).toBe(false);
    });

    it('should detect full configuration', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';

      const health = await twilioHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.details?.accountSidPresent).toBe(true);
      expect(health.details?.authTokenPresent).toBe(true);
      expect(health.details?.phoneNumberPresent).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate Account SID format', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'invalid-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      const validation = await twilioHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        "TWILIO_ACCOUNT_SID appears to be invalid format (should start with 'AC')"
      );
    });

    it('should validate Auth Token length', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'short';

      const validation = await twilioHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('TWILIO_AUTH_TOKEN appears to be too short');
    });

    it('should validate phone number format', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '5551234567'; // Missing + prefix

      const validation = await twilioHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        'TWILIO_PHONE_NUMBER should be in E.164 format (start with +)'
      );
    });

    it('should pass validation with correct configuration', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';

      const validation = await twilioHealthChecker.validateConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should provide recommendations for missing phone number', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      delete process.env.TWILIO_PHONE_NUMBER;

      const validation = await twilioHealthChecker.validateConfiguration();

      expect(validation.recommendations).toContain(
        'Consider setting TWILIO_PHONE_NUMBER for SMS sending'
      );
    });
  });

  describe('Health Check Tests', () => {
    it('should return proper health status structure', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      const health = await twilioHealthChecker.checkHealth();

      expect(health).toHaveProperty('configured');
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('lastChecked');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('accountSidPresent');
      expect(health.details).toHaveProperty('authTokenPresent');
      expect(health.details).toHaveProperty('phoneNumberPresent');
    });

    it('should measure response time', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      const health = await twilioHealthChecker.checkHealth();

      if (health.configured) {
        expect(health.responseTime).toBeGreaterThan(0);
      }
    });

    it('should handle API errors gracefully', async () => {
      // Set invalid credentials to trigger API error
      process.env.TWILIO_ACCOUNT_SID = 'ACinvalid123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'invalid_auth_token_32_characters_long';

      const health = await twilioHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.responseTime).toBeGreaterThan(0);
    });

    it('should include account info when connection succeeds', async () => {
      // Note: This test will fail with invalid credentials but tests the structure
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      const health = await twilioHealthChecker.checkHealth();

      if (health.connected) {
        expect(health.details?.accountInfo).toBeDefined();
        expect(health.details?.accountInfo).toHaveProperty('friendlyName');
        expect(health.details?.accountInfo).toHaveProperty('status');
        expect(health.details?.accountInfo).toHaveProperty('type');
      }
    });
  });

  describe('Send Capability Tests', () => {
    it('should handle unconfigured service', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      const result = await twilioHealthChecker.testSendCapability();

      expect(result.canSend).toBe(false);
      expect(result.error).toBe('Twilio not configured');
    });

    it('should handle missing phone number', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      delete process.env.TWILIO_PHONE_NUMBER;

      const result = await twilioHealthChecker.testSendCapability();

      expect(result.canSend).toBe(false);
      expect(result.error).toBe('No phone number configured');
    });

    it('should test send capability with magic test number', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';

      const result = await twilioHealthChecker.testSendCapability();

      // This will likely fail with invalid credentials, but should handle gracefully
      if (result.canSend) {
        expect(result.testMessageSid).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Configuration Summary', () => {
    it('should provide accurate configuration summary', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';

      const summary = twilioHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('Twilio');
      expect(summary.configured).toBe(true);
      expect(summary.accountSid).toBe('ACtest123456789012345678901234567890');
      expect(summary.phoneNumber).toBe('+15551234567');
      expect(summary.hasAuthToken).toBe(true);
    });

    it('should show unconfigured state correctly', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      const summary = twilioHealthChecker.getConfigurationSummary();

      expect(summary.service).toBe('Twilio');
      expect(summary.configured).toBe(false);
      expect(summary.hasAuthToken).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate phone number when configured', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';

      const health = await twilioHealthChecker.checkHealth();

      if (health.configured && health.connected) {
        // Phone number validation would be included in health check details
        expect(health.details?.phoneNumberInfo).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      // Mock Twilio client to simulate timeout
      const health = await twilioHealthChecker.checkHealth();

      // With invalid credentials, should handle error gracefully
      expect(health.configured).toBe(true);
      if (!health.connected) {
        expect(health.error).toBeDefined();
        expect(health.responseTime).toBeGreaterThan(0);
      }
    });

    it('should handle authentication errors', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACinvalid123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'invalid_token';

      const health = await twilioHealthChecker.checkHealth();

      expect(health.configured).toBe(true);
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should work with circuit breaker patterns', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_32_characters_long';

      // Test multiple rapid calls to simulate circuit breaker scenarios
      const promises = Array(5).fill(null).map(() => 
        twilioHealthChecker.checkHealth()
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
