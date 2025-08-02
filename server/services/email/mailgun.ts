import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { outboundEmailWatchdog, OutboundEmailData } from '../outbound-email-watchdog';

const mailgun = new Mailgun(formData);

// Lazy initialization of Mailgun client
let mg: any = null;
function getMailgunClient() {
  if (!mg) {
    const apiKey = process.env.MAILGUN_API_KEY;
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY is required but not set');
    }
    mg = mailgun.client({
      username: 'api',
      key: apiKey,
    });
  }
  return mg;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  variables?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  blocked?: boolean;
  riskScore?: number;
}

export class MailgunService {
  private domain: string;
  private defaultFrom: string;

  constructor() {
    this.domain = process.env.MAILGUN_DOMAIN || 'mail.onekeel.com';
    this.defaultFrom = `Support <support@${this.domain}>`;
  }

  /**
   * Send a single email with outbound watchdog validation
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      // 🚨 OUTBOUND EMAIL WATCHDOG - Validate before sending
      const watchdogData: OutboundEmailData = {
        to: emailData.to,
        from: emailData.from || this.defaultFrom,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || '',
        metadata: emailData,
      };

      const validation = await outboundEmailWatchdog.validateOutboundEmail(watchdogData);

      // Block email if not allowed
      if (!validation.allowed) {
        console.warn(`🚫 Email BLOCKED by watchdog:`, {
          to: emailData.to,
          subject: emailData.subject,
          reasons: validation.reasons,
          riskScore: validation.riskScore,
        });

        return {
          success: false,
          error: `Email blocked: ${validation.reasons.join(', ')}`,
          blocked: true,
          riskScore: validation.riskScore,
        };
      }

      // Log if email has warnings but is allowed
      if (validation.riskScore > 0) {
        console.warn(`⚠️ Email has risk score ${validation.riskScore}:`, {
          to: emailData.to,
          reasons: validation.reasons,
        });
      }

      // Simple HTML sanitization
      const sanitizedHtml = emailData.html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

      const messageData = {
        from: emailData.from || this.defaultFrom,
        to: emailData.to,
        subject: emailData.subject,
        html: sanitizedHtml,
        text: emailData.text || this.stripHtml(sanitizedHtml),
      };

      const result = await getMailgunClient().messages.create(
        this.domain,
        messageData
      );
      console.log(`✅ Email sent to ${emailData.to}:`, result.id);

      return {
        success: true,
        messageId: result.id,
        riskScore: validation.riskScore,
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${emailData.to}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails (for campaigns)
   */
  async sendBulkEmails(
    emails: EmailData[]
  ): Promise<{ sent: number; failed: number; errors: any[] }> {
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
          errors.push({ email: email.to, error: result.error });
        }
        // Add delay to respect rate limits
        await this.delay(100);
      } catch (error) {
        failed++;
        errors.push({ email: email.to, error });
      }
    }

    return { sent, failed, errors };
  }

  /**
   * Send campaign emails with template
   */
  async sendCampaignEmails(
    leads: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      [key: string]: any;
    }>,
    template: EmailTemplate
  ): Promise<{ sent: number; failed: number; errors: any[] }> {
    const emails: EmailData[] = leads.map(lead => ({
      to: lead.email,
      subject: this.processTemplate(template.subject, lead),
      html: this.processTemplate(template.body, lead),
    }));

    return await this.sendBulkEmails(emails);
  }

  /**
   * Process template with variables (simple replacement)
   */
  processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;

    // Sanitize all variable values to prevent XSS
    const sanitizedVariables: Record<string, string> = {};
    Object.entries(variables).forEach(([key, value]) => {
      // Convert to string and remove any HTML tags
      sanitizedVariables[key] = String(value || '')
        .replace(/<[^>]*>/g, '')
        .trim();
    });

    // Replace common variables
    if (sanitizedVariables.firstName) {
      processed = processed.replace(
        /\{\{firstName\}\}/g,
        sanitizedVariables.firstName
      );
      processed = processed.replace(
        /\{\{first_name\}\}/g,
        sanitizedVariables.firstName
      );
    }

    if (sanitizedVariables.lastName) {
      processed = processed.replace(
        /\{\{lastName\}\}/g,
        sanitizedVariables.lastName
      );
      processed = processed.replace(
        /\{\{last_name\}\}/g,
        sanitizedVariables.lastName
      );
    }

    if (sanitizedVariables.email) {
      processed = processed.replace(/\{\{email\}\}/g, sanitizedVariables.email);
    }

    // Replace any other custom variables
    Object.entries(sanitizedVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    // Remove HTML tags and clean up whitespace
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Add delay between emails
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate email configuration
   */
  isConfigured(): boolean {
    return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      domain: this.domain,
      apiKeyPresent: !!process.env.MAILGUN_API_KEY,
    };
  }
}

// Export singleton instance
export const mailgunService = new MailgunService();
