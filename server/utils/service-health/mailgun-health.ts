import formData from "form-data";
import Mailgun from "mailgun.js";
import { logger } from '../logger';
import { mailgunCircuitBreaker } from '../circuit-breaker';

export interface MailgunHealthStatus {
  configured: boolean;
  connected: boolean;
  domain?: string;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  details?: {
    apiKeyPresent: boolean;
    domainPresent: boolean;
    fromEmailPresent: boolean;
    accountInfo?: any;
  };
}

export class MailgunHealthChecker {
  private mg: any;
  private domain: string;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      process.env.MAILGUN_API_KEY && 
      process.env.MAILGUN_DOMAIN
    );

    if (this.isConfigured) {
      const mailgun = new Mailgun(formData);
      this.mg = mailgun.client({
        username: "api",
        key: process.env.MAILGUN_API_KEY || "",
      });
      this.domain = process.env.MAILGUN_DOMAIN || "";
    }
  }

  async checkHealth(): Promise<MailgunHealthStatus> {
    const startTime = Date.now();
    const status: MailgunHealthStatus = {
      configured: this.isConfigured,
      connected: false,
      lastChecked: new Date().toISOString(),
      details: {
        apiKeyPresent: !!process.env.MAILGUN_API_KEY,
        domainPresent: !!process.env.MAILGUN_DOMAIN,
        fromEmailPresent: !!process.env.MAILGUN_FROM_EMAIL,
      }
    };

    if (!this.isConfigured) {
      status.error = "Mailgun not configured - missing API key or domain";
      return status;
    }

    status.domain = this.domain;

    try {
      // Test connection by getting domain info with circuit breaker protection
      const domainInfo = await mailgunCircuitBreaker.execute(async () => {
        return await this.mg.domains.get(this.domain);
      });
      
      status.connected = true;
      status.responseTime = Date.now() - startTime;
      status.details!.accountInfo = {
        state: domainInfo.state,
        type: domainInfo.type,
        created_at: domainInfo.created_at
      };

      logger.info('Mailgun health check passed', {
        domain: this.domain,
        responseTime: status.responseTime,
        state: domainInfo.state
      });

    } catch (error) {
      status.connected = false;
      status.responseTime = Date.now() - startTime;
      status.error = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Mailgun health check failed', {
        domain: this.domain,
        error: status.error,
        responseTime: status.responseTime
      });
    }

    return status;
  }

  async testSendCapability(): Promise<{
    canSend: boolean;
    error?: string;
    testMessageId?: string;
  }> {
    if (!this.isConfigured) {
      return {
        canSend: false,
        error: "Mailgun not configured"
      };
    }

    try {
      // Send a test email to a test address (this won't actually send)
      const testData = {
        from: `Test <test@${this.domain}>`,
        to: 'test@example.com',
        subject: 'Mailgun Health Check Test',
        text: 'This is a test message for health checking.',
        'o:testmode': 'yes' // This prevents actual sending
      };

      const result = await this.mg.messages.create(this.domain, testData);
      
      return {
        canSend: true,
        testMessageId: result.id
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

    if (!process.env.MAILGUN_API_KEY) {
      issues.push("MAILGUN_API_KEY environment variable not set");
    } else if (!process.env.MAILGUN_API_KEY.startsWith('key-')) {
      issues.push("MAILGUN_API_KEY appears to be invalid format");
    }

    if (!process.env.MAILGUN_DOMAIN) {
      issues.push("MAILGUN_DOMAIN environment variable not set");
    }

    if (!process.env.MAILGUN_FROM_EMAIL) {
      recommendations.push("Consider setting MAILGUN_FROM_EMAIL for consistent sender address");
    }

    // Check domain format
    if (process.env.MAILGUN_DOMAIN && !process.env.MAILGUN_DOMAIN.includes('.')) {
      issues.push("MAILGUN_DOMAIN appears to be invalid format");
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
    domain?: string;
    hasApiKey: boolean;
    hasFromEmail: boolean;
  } {
    return {
      service: 'Mailgun',
      configured: this.isConfigured,
      domain: process.env.MAILGUN_DOMAIN,
      hasApiKey: !!process.env.MAILGUN_API_KEY,
      hasFromEmail: !!process.env.MAILGUN_FROM_EMAIL
    };
  }
}

// Export singleton instance
export const mailgunHealthChecker = new MailgunHealthChecker();
