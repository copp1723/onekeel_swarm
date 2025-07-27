import { EmailService, EmailProviderConfig } from './types';
import { MailgunService } from './providers/mailgun';
import { MockEmailService } from './providers/mock';

export class EmailServiceFactory {
  static createService(config: EmailProviderConfig): EmailService {
    switch (config.provider) {
      case 'mailgun':
        if (!config.apiKey || !config.domain || !config.fromEmail) {
          throw new Error('Mailgun requires apiKey, domain, and fromEmail');
        }
        return new MailgunService({
          apiKey: config.apiKey,
          domain: config.domain,
          fromEmail: config.fromEmail,
        });

      case 'sendgrid':
        throw new Error('SendGrid provider not yet implemented');

      case 'ses':
        throw new Error('SES provider not yet implemented');

      case 'smtp':
        throw new Error('SMTP provider not yet implemented');

      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  static createServiceFromEnv(): EmailService | null {
    const provider = process.env.EMAIL_PROVIDER as 'mailgun' | 'sendgrid' | 'ses' | 'smtp' | undefined;
    
    // Auto-detect provider if not explicitly set
    let detectedProvider = provider;
    if (!provider) {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        detectedProvider = 'mailgun';
        console.log('Auto-detected Mailgun configuration');
      }
    }
    
    // If no provider configured, use mock email service
    // Don't use mock just because database is mock - email can still work!
    const useMock = !detectedProvider || process.env.USE_MOCK_EMAIL === 'true';
    
    if (useMock) {
      console.log('Using mock email service (no email provider configured or mock mode)');
      return new MockEmailService();
    }

    switch (detectedProvider) {
      case 'mailgun':
        if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_FROM_EMAIL) {
          console.warn('Mailgun configuration incomplete. Required: MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL');
          return null;
        }
        return new MailgunService({
          apiKey: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN,
          fromEmail: process.env.MAILGUN_FROM_EMAIL,
        });

      case 'sendgrid':
        console.warn('SendGrid provider not yet implemented');
        return null;

      case 'ses':
        console.warn('SES provider not yet implemented');
        return null;

      case 'smtp':
        console.warn('SMTP provider not yet implemented');
        return null;

      default:
        console.warn(`Unsupported email provider: ${provider}`);
        return null;
    }
  }
}