import { EmailService, EmailData, EmailTemplate, EmailResult } from './types';

export abstract class BaseEmailService implements EmailService {
  protected defaultFrom: string;
  protected providerName: string;

  constructor(providerName: string, defaultFrom: string) {
    this.providerName = providerName;
    this.defaultFrom = defaultFrom;
  }

  abstract sendEmail(emailData: EmailData): Promise<EmailResult>;
  abstract sendBulkEmails(emails: EmailData[]): Promise<{ sent: number; failed: number; errors: any[] }>;
  abstract isConfigured(): boolean;
  abstract getStatus(): { configured: boolean; provider: string; [key: string]: any };

  async sendCampaignEmails(
    leads: Array<{ email: string; firstName?: string; lastName?: string; [key: string]: any }>,
    template: EmailTemplate
  ): Promise<{ sent: number; failed: number; errors: any[] }> {
    const emails: EmailData[] = leads.map(lead => ({
      to: lead.email,
      subject: this.processTemplate(template.subject, lead),
      html: this.processTemplate(template.body, lead),
    }));

    return await this.sendBulkEmails(emails);
  }

  processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;

    // Sanitize all variable values to prevent XSS
    const sanitizedVariables: Record<string, string> = {};
    Object.entries(variables).forEach(([key, value]) => {
      // Convert to string and remove any HTML tags
      sanitizedVariables[key] = String(value || "")
        .replace(/<[^>]*>/g, '')
        .trim();
    });

    // Replace common variables
    if (sanitizedVariables.firstName) {
      processed = processed.replace(/\{\{firstName\}\}/g, sanitizedVariables.firstName);
      processed = processed.replace(/\{\{first_name\}\}/g, sanitizedVariables.firstName);
    }

    if (sanitizedVariables.lastName) {
      processed = processed.replace(/\{\{lastName\}\}/g, sanitizedVariables.lastName);
      processed = processed.replace(/\{\{last_name\}\}/g, sanitizedVariables.lastName);
    }

    if (sanitizedVariables.email) {
      processed = processed.replace(/\{\{email\}\}/g, sanitizedVariables.email);
    }

    // Replace any other custom variables
    Object.entries(sanitizedVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  protected stripHtml(html: string): string {
    // Remove HTML tags and clean up whitespace
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}