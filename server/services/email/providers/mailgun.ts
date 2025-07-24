import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { BaseEmailService } from '../base-service';
import { EmailData, EmailResult } from '../types';

interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
}

export class MailgunService extends BaseEmailService {
  private mg: any;
  private domain: string;
  private fromEmail: string;
  private apiKey: string;

  constructor(config: MailgunConfig) {
    super('mailgun', `Support <${config.fromEmail}>`);
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({
      username: 'api',
      key: config.apiKey,
    });
    this.domain = config.domain;
    this.fromEmail = config.fromEmail;
    this.apiKey = config.apiKey;
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      // Simple HTML sanitization
      const sanitizedHtml = emailData.html
        ? emailData.html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        : undefined;

      const data = {
        from: emailData.from || this.defaultFrom,
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        subject: emailData.subject,
        html: sanitizedHtml,
        text: emailData.text || (sanitizedHtml ? this.stripHtml(sanitizedHtml) : undefined),
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachment: emailData.attachments?.map(att => ({
          data: att.content,
          filename: att.filename,
        })),
      };

      const result = await this.mg.messages.create(this.domain, data);
      console.log(`Email sent to ${emailData.to}:`, result.id);
      
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error: any) {
      console.error(`Failed to send email to ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<{ sent: number; failed: number; errors: any[] }> {
    let sent = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push({ 
            email: Array.isArray(email.to) ? email.to.join(', ') : email.to, 
            error: result.error 
          });
        }
        // Add small delay to avoid rate limiting
        await this.delay(100);
      } catch (error: any) {
        failed++;
        errors.push({
          email: Array.isArray(email.to) ? email.to.join(', ') : email.to,
          error: error.message || 'Failed to send email',
        });
      }
    }

    return { sent, failed, errors };
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.domain);
  }

  getStatus(): { configured: boolean; provider: string; domain?: string; apiKeyPresent: boolean } {
    return {
      configured: this.isConfigured(),
      provider: 'mailgun',
      domain: this.domain,
      apiKeyPresent: !!this.apiKey,
    };
  }
}