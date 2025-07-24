export interface EmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
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
}

export interface EmailProviderConfig {
  provider: 'mailgun' | 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  domain?: string;
  fromEmail?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface EmailService {
  sendEmail(emailData: EmailData): Promise<EmailResult>;
  sendBulkEmails(emails: EmailData[]): Promise<{ sent: number; failed: number; errors: any[] }>;
  sendCampaignEmails(
    leads: Array<{ email: string; firstName?: string; lastName?: string; [key: string]: any }>,
    template: EmailTemplate
  ): Promise<{ sent: number; failed: number; errors: any[] }>;
  processTemplate(template: string, variables: Record<string, any>): string;
  isConfigured(): boolean;
  getStatus(): {
    configured: boolean;
    provider: string;
    [key: string]: any;
  };
}