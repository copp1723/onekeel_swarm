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
        baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3',
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
        error: 'Mailgun service not configured',
      };
    }

    try {
      logger.info('Sending email via Mailgun', {
        to: Array.isArray(emailData.to) ? emailData.to.length : 1,
        subject: emailData.subject,
        domain: this.config.domain,
      });

      // Simulate API call - replace with actual Mailgun API implementation
      const response = await this.callMailgunAPI(emailData);

      logger.info('Email sent successfully', {
        messageId: response.messageId,
        to: emailData.to,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send email via Mailgun', {
        error: (error as Error).message,
        to: emailData.to,
        subject: emailData.subject,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async callMailgunAPI(emailData: EmailData): Promise<EmailResponse> {
    if (!this.config) {
      throw new Error('Mailgun not configured');
    }

    const formData = new FormData();
    formData.append('from', emailData.from);

    // Handle multiple recipients
    if (Array.isArray(emailData.to)) {
      emailData.to.forEach(recipient => formData.append('to', recipient));
    } else {
      formData.append('to', emailData.to);
    }

    formData.append('subject', emailData.subject);

    if (emailData.html) {
      formData.append('html', emailData.html);
    }

    if (emailData.text) {
      formData.append('text', emailData.text);
    }

    // Add tags if provided
    if (emailData.tags) {
      emailData.tags.forEach(tag => formData.append('o:tag', tag));
    }

    // Add metadata if provided
    if (emailData.metadata) {
      Object.entries(emailData.metadata).forEach(([key, value]) => {
        formData.append(`v:${key}`, String(value));
      });
    }

    const response = await fetch(
      `${this.config.baseUrl}/${this.config.domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Mailgun API error: ${responseData.message || response.statusText}`
      );
    }

    return {
      success: true,
      messageId: responseData.id,
      status: response.status,
    };
  }

  async sendBulkEmails(emails: EmailData[]): Promise<EmailResponse[]> {
    if (!this.isConfigured) {
      return emails.map(() => ({
        success: false,
        error: 'Mailgun service not configured',
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
      failed: emails.length - successCount,
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
      reason: isValid ? undefined : 'Invalid email format',
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
    const statuses: Array<'delivered' | 'failed' | 'pending'> = [
      'delivered',
      'pending',
      'failed',
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    logger.debug('Checking delivery status', {
      messageId,
      status: randomStatus,
    });

    return {
      status: randomStatus,
      details: `Message ${messageId} status: ${randomStatus}`,
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
      clicks: Math.floor(Math.random() * 100),
    };
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  getConfig(): Partial<MailgunConfig> | null {
    if (!this.config) return null;

    return {
      domain: this.config.domain,
      baseUrl: this.config.baseUrl,
      // Don't expose API key
    };
  }

  async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isConfigured || !this.config) {
      return { success: false, error: 'Service not configured' };
    }

    try {
      logger.info('Testing Mailgun connection');

      // Test connection by getting domain info
      const response = await fetch(
        `${this.config.baseUrl}/${this.config.domain}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Mailgun API error: ${errorData.message || response.statusText}`
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

export const mailgunService = new MailgunService();
