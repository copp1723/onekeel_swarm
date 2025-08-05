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
