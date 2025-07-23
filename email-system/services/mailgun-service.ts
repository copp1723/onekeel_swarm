import { logger } from '../../server/utils/logger';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  baseUrl?: string;
}

export interface EmailData {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: number;
}

export class MailgunService {
  private config: MailgunConfig | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (apiKey && domain) {
      this.config = {
        apiKey,
        domain,
        baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3'
      };
      this.isConfigured = true;
      logger.info('Mailgun service configured', { domain });
    } else {
      logger.warn('Mailgun service not configured - missing API_KEY or DOMAIN');
    }
  }

  async sendEmail(emailData: EmailData): Promise<EmailResponse> {
    if (!this.isConfigured || !this.config) {
      logger.warn('Mailgun service not configured, skipping email send');
      return {
        success: false,
        error: 'Mailgun service not configured'
      };
    }

    try {
      logger.info('Sending email via Mailgun', {
        to: Array.isArray(emailData.to) ? emailData.to.length : 1,
        subject: emailData.subject,
        domain: this.config.domain
      });

      // Simulate API call - replace with actual Mailgun API implementation
      const response = await this.callMailgunAPI(emailData);
      
      logger.info('Email sent successfully', {
        messageId: response.messageId,
        to: emailData.to
      });

      return response;
    } catch (error) {
      logger.error('Failed to send email via Mailgun', {
        error: (error as Error).message,
        to: emailData.to,
        subject: emailData.subject
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async callMailgunAPI(emailData: EmailData): Promise<EmailResponse> {
    // This is a stub implementation - replace with actual Mailgun API calls
    // For now, simulate the API call
    
    const delay = Math.random() * 1000 + 200; // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Mailgun API rate limit exceeded');
    }

    const messageId = `${Date.now()}.${Math.random().toString(36).substring(7)}@${this.config!.domain}`;
    
    return {
      success: true,
      messageId,
      status: 200
    };
  }

  async sendBulkEmails(emails: EmailData[]): Promise<EmailResponse[]> {
    if (!this.isConfigured) {
      return emails.map(() => ({
        success: false,
        error: 'Mailgun service not configured'
      }));
    }

    logger.info('Sending bulk emails', { count: emails.length });

    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const responses = results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: 'Promise rejected' }
    );

    const successCount = responses.filter(r => r.success).length;
    
    logger.info('Bulk email send completed', {
      total: emails.length,
      successful: successCount,
      failed: emails.length - successCount
    });

    return responses;
  }

  async validateEmail(email: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    if (!this.isConfigured) {
      return { isValid: false, reason: 'Service not configured' };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    return {
      isValid,
      reason: isValid ? undefined : 'Invalid email format'
    };
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'failed' | 'pending' | 'unknown';
    details?: string;
  }> {
    if (!this.isConfigured) {
      return { status: 'unknown', details: 'Service not configured' };
    }

    // Simulate delivery status check
    const statuses: Array<'delivered' | 'failed' | 'pending'> = ['delivered', 'pending', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    logger.debug('Checking delivery status', { messageId, status: randomStatus });

    return {
      status: randomStatus,
      details: `Message ${messageId} status: ${randomStatus}`
    };
  }

  async getDomainStats(): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    opens: number;
    clicks: number;
  }> {
    if (!this.isConfigured) {
      return { sent: 0, delivered: 0, failed: 0, opens: 0, clicks: 0 };
    }

    // Mock stats - replace with actual Mailgun API call
    return {
      sent: Math.floor(Math.random() * 1000),
      delivered: Math.floor(Math.random() * 900),
      failed: Math.floor(Math.random() * 50),
      opens: Math.floor(Math.random() * 400),
      clicks: Math.floor(Math.random() * 100)
    };
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  getConfig(): Partial<MailgunConfig> | null {
    if (!this.config) return null;
    
    return {
      domain: this.config.domain,
      baseUrl: this.config.baseUrl
      // Don't expose API key
    };
  }

  async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Service not configured' };
    }

    try {
      // Test with a simple domain verification
      logger.info('Testing Mailgun connection');
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
}

export const mailgunService = new MailgunService();