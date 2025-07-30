import twilio from 'twilio';
import { logger } from '../logger';
import { twilioCircuitBreaker } from '../circuit-breaker';

export interface TwilioHealthStatus {
  configured: boolean;
  connected: boolean;
  accountSid?: string;
  phoneNumber?: string;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  details?: {
    accountSidPresent: boolean;
    authTokenPresent: boolean;
    phoneNumberPresent: boolean;
    accountInfo?: any;
    phoneNumberInfo?: any;
  };
}

export class TwilioHealthChecker {
  private client: any;
  private isConfigured: boolean;
  private accountSid: string;
  private phoneNumber: string;

  constructor() {
    this.isConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN
    );

    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || "";

    if (this.isConfigured) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async checkHealth(): Promise<TwilioHealthStatus> {
    const startTime = Date.now();
    const status: TwilioHealthStatus = {
      configured: this.isConfigured,
      connected: false,
      lastChecked: new Date().toISOString(),
      details: {
        accountSidPresent: !!process.env.TWILIO_ACCOUNT_SID,
        authTokenPresent: !!process.env.TWILIO_AUTH_TOKEN,
        phoneNumberPresent: !!process.env.TWILIO_PHONE_NUMBER,
      }
    };

    if (!this.isConfigured) {
      status.error = "Twilio not configured - missing Account SID or Auth Token";
      return status;
    }

    status.accountSid = this.accountSid;
    status.phoneNumber = this.phoneNumber;

    try {
      // Test connection by fetching account info with circuit breaker protection
      const account = await twilioCircuitBreaker.execute(async () => {
        return await this.client.api.accounts(this.accountSid).fetch();
      });
      
      status.connected = true;
      status.responseTime = Date.now() - startTime;
      status.details!.accountInfo = {
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated
      };

      // If phone number is configured, validate it
      if (this.phoneNumber) {
        try {
          const phoneNumberInfo = await this.client.incomingPhoneNumbers.list({
            phoneNumber: this.phoneNumber,
            limit: 1
          });

          if (phoneNumberInfo.length > 0) {
            status.details!.phoneNumberInfo = {
              friendlyName: phoneNumberInfo[0].friendlyName,
              capabilities: phoneNumberInfo[0].capabilities,
              status: 'valid'
            };
          } else {
            status.details!.phoneNumberInfo = {
              status: 'not_found',
              message: 'Phone number not found in account'
            };
          }
        } catch (phoneError) {
          status.details!.phoneNumberInfo = {
            status: 'error',
            error: phoneError instanceof Error ? phoneError.message : 'Unknown error'
          };
        }
      }

      logger.info('Twilio health check passed', {
        accountSid: this.accountSid,
        responseTime: status.responseTime,
        accountStatus: account.status
      });

    } catch (error) {
      status.connected = false;
      status.responseTime = Date.now() - startTime;
      status.error = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Twilio health check failed', {
        accountSid: this.accountSid,
        error: status.error,
        responseTime: status.responseTime
      });
    }

    return status;
  }

  async testSendCapability(): Promise<{
    canSend: boolean;
    error?: string;
    testMessageSid?: string;
  }> {
    if (!this.isConfigured) {
      return {
        canSend: false,
        error: "Twilio not configured"
      };
    }

    if (!this.phoneNumber) {
      return {
        canSend: false,
        error: "No phone number configured"
      };
    }

    try {
      // Create a test message (this will actually send, so we use a safe test number)
      // In production, you might want to use Twilio's test credentials
      const testMessage = await this.client.messages.create({
        body: 'Twilio Health Check Test - Please ignore',
        from: this.phoneNumber,
        to: '+15005550006' // Twilio's magic test number that always succeeds
      });

      return {
        canSend: true,
        testMessageSid: testMessage.sid
      };

    } catch (error) {
      return {
        canSend: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!process.env.TWILIO_ACCOUNT_SID) {
      issues.push("TWILIO_ACCOUNT_SID environment variable not set");
    } else if (!process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      issues.push("TWILIO_ACCOUNT_SID appears to be invalid format (should start with 'AC')");
    }

    if (!process.env.TWILIO_AUTH_TOKEN) {
      issues.push("TWILIO_AUTH_TOKEN environment variable not set");
    } else if (process.env.TWILIO_AUTH_TOKEN.length < 32) {
      issues.push("TWILIO_AUTH_TOKEN appears to be too short");
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      recommendations.push("Consider setting TWILIO_PHONE_NUMBER for SMS sending");
    } else if (!process.env.TWILIO_PHONE_NUMBER.startsWith('+')) {
      issues.push("TWILIO_PHONE_NUMBER should be in E.164 format (start with +)");
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  getConfigurationSummary(): {
    service: string;
    configured: boolean;
    accountSid?: string;
    phoneNumber?: string;
    hasAuthToken: boolean;
  } {
    return {
      service: 'Twilio',
      configured: this.isConfigured,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN
    };
  }
}

// Export singleton instance
export const twilioHealthChecker = new TwilioHealthChecker();
