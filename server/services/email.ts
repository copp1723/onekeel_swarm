// Simple email service stub
export class EmailService {
  static async sendEmail(to: string, subject: string, body: string) {
    console.log(`[EMAIL] Sending email to ${to}: ${subject}`);
    // In a real implementation, this would send actual emails
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  static async sendBulkEmails(emails: Array<{ to: string; subject: string; body: string }>) {
    console.log(`[EMAIL] Sending ${emails.length} bulk emails`);
    // In a real implementation, this would send bulk emails
    return { success: true, sent: emails.length };
  }

  static async getTemplates() {
    // Mock email templates
    return [
      {
        id: '1',
        name: 'Welcome Email',
        subject: 'Welcome to OneKeel!',
        body: 'Welcome to our platform!'
      },
      {
        id: '2',
        name: 'Follow Up',
        subject: 'Following up on our conversation',
        body: 'Hi there, just following up...'
      }
    ];
  }
}

// Mock services for compatibility with existing routes
export const mailgunService = EmailService;

export class EmailTemplateManager {
  static async getTemplates() {
    return EmailService.getTemplates();
  }

  static renderTemplate(templateId: string, variables: Record<string, any>) {
    return {
      subject: `Template ${templateId}`,
      body: `Rendered template with variables: ${JSON.stringify(variables)}`
    };
  }
}

export const emailTemplateManager = EmailTemplateManager;

export class EmailScheduler {
  static async scheduleEmail(email: any, scheduledFor: Date) {
    console.log(`[EMAIL] Scheduling email for ${scheduledFor}`);
    return { success: true, scheduleId: `schedule-${Date.now()}` };
  }

  static async getScheduledEmails() {
    return [];
  }

  static async cancelScheduledEmail(scheduleId: string) {
    console.log(`[EMAIL] Cancelling scheduled email ${scheduleId}`);
    return { success: true };
  }
}

export const emailScheduler = EmailScheduler;
