import { EmailService, EmailData, EmailResult } from '../types';

export class MockEmailService implements EmailService {
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    console.log('🔧 Mock Email Service: Simulating email send');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('---');
    
    // Simulate successful send
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      response: {
        id: `mock-${Date.now()}`,
        message: 'Mock email sent successfully'
      }
    };
  }

  async sendBulkEmails(emails: EmailData[]): Promise<{ sent: number; failed: number; errors: any[] }> {
    console.log(`🔧 Mock Email Service: Simulating bulk send of ${emails.length} emails`);
    
    return {
      sent: emails.length,
      failed: 0,
      errors: []
    };
  }

  getStatus() {
    return {
      configured: true,
      provider: 'mock',
      domain: 'mock.example.com',
      apiKeyPresent: true,
      fromEmail: 'noreply@mock.example.com'
    };
  }

  processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return processed;
  }
}