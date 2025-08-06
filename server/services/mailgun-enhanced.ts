import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { logger } from '../utils/logger';

export interface EmailConfig {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: any[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface HandoffEmailData {
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  conversationSummary: string;
  qualificationScore: number;
  keyPoints: string[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

export class MailgunEnhancedService {
  private mailgun: any;
  private domain: string = '';
  private fromEmail: string = '';
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'noreply@mg.watchdogai.us';

    if (!apiKey || !domain) {
      logger.warn('Mailgun service not configured - missing API key or domain');
      this.domain = domain || '';
      this.fromEmail = fromEmail;
      this.isConfigured = false;
      return;
    }

    try {
      const mg = new (Mailgun as any)(FormData);
      this.mailgun = mg.client({
        username: 'api',
        key: apiKey,
        url: 'https://api.mailgun.net'
      });
      
      this.domain = domain;
      this.fromEmail = fromEmail;
      this.isConfigured = true;
      
      logger.info('Mailgun service initialized successfully', { domain });
    } catch (error) {
      logger.error('Failed to initialize Mailgun service', error as Error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email using Mailgun
   */
  async sendEmail(config: EmailConfig): Promise<any> {
    if (!this.isConfigured) {
      logger.error('Attempted to send email but Mailgun is not configured');
      throw new Error('Email service not configured');
    }

    try {
      const message: any = {
        from: config.from || this.fromEmail,
        to: Array.isArray(config.to) ? config.to.join(', ') : config.to,
        subject: config.subject,
      };

      // Add content
      if (config.html) message.html = config.html;
      if (config.text) message.text = config.text;
      
      // Add optional fields
      if (config.tags) message['o:tag'] = config.tags;
      if (config.metadata) {
        Object.entries(config.metadata).forEach(([key, value]) => {
          message[`v:${key}`] = value;
        });
      }
      if (config.attachments) message.attachment = config.attachments;

      const result = await this.mailgun.messages.create(this.domain, message);
      
      logger.info('Email sent successfully', {
        to: config.to,
        subject: config.subject,
        messageId: result.id
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error as Error,
        to: config.to,
        subject: config.subject
      });
      throw error;
    }
  }

  /**
   * Send a handoff notification email
   */
  async sendHandoffEmail(
    recipientEmail: string,
    handoffData: HandoffEmailData
  ): Promise<boolean> {
    try {
      const urgencyColors = {
        low: '#28a745',
        medium: '#ffc107',
        high: '#dc3545'
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Lead Handoff: ${handoffData.leadName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .urgency-badge { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 4px; 
            color: white; 
            font-weight: bold;
            background-color: ${urgencyColors[handoffData.urgencyLevel]};
        }
        .section { margin-bottom: 20px; }
        .key-point { padding: 8px; background-color: #e9ecef; margin: 5px 0; border-radius: 4px; }
        .recommendation { padding: 10px; background-color: #d1ecf1; margin: 8px 0; border-radius: 4px; border-left: 4px solid #17a2b8; }
        .qualification-score { font-size: 24px; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🤝 Lead Handoff Required</h2>
            <p>Urgency: <span class="urgency-badge">${handoffData.urgencyLevel.toUpperCase()}</span></p>
        </div>
        
        <div class="section">
            <h3>Lead Information</h3>
            <p><strong>Name:</strong> ${handoffData.leadName}</p>
            ${handoffData.leadEmail ? `<p><strong>Email:</strong> ${handoffData.leadEmail}</p>` : ''}
            ${handoffData.leadPhone ? `<p><strong>Phone:</strong> ${handoffData.leadPhone}</p>` : ''}
            <p><strong>Qualification Score:</strong> <span class="qualification-score">${handoffData.qualificationScore}/10</span></p>
        </div>
        
        <div class="section">
            <h3>Conversation Summary</h3>
            <p>${handoffData.conversationSummary}</p>
        </div>
        
        <div class="section">
            <h3>Key Points Discussed</h3>
            ${handoffData.keyPoints.map(point => `<div class="key-point">• ${point}</div>`).join('')}
        </div>
        
        <div class="section">
            <h3>Recommended Next Steps</h3>
            ${handoffData.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>
        
        <div class="section" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
                This lead has been automatically qualified and requires human attention. 
                Please respond promptly based on the urgency level indicated above.
            </p>
        </div>
    </div>
</body>
</html>
      `.trim();

      const text = `
Lead Handoff: ${handoffData.leadName}
Urgency: ${handoffData.urgencyLevel.toUpperCase()}

Lead Information:
- Name: ${handoffData.leadName}
${handoffData.leadEmail ? `- Email: ${handoffData.leadEmail}` : ''}
${handoffData.leadPhone ? `- Phone: ${handoffData.leadPhone}` : ''}
- Qualification Score: ${handoffData.qualificationScore}/10

Conversation Summary:
${handoffData.conversationSummary}

Key Points:
${handoffData.keyPoints.map(point => `• ${point}`).join('\n')}

Recommendations:
${handoffData.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

This lead requires immediate human attention.
      `.trim();

      await this.sendEmail({
        to: recipientEmail,
        subject: `[${handoffData.urgencyLevel.toUpperCase()}] Lead Handoff: ${handoffData.leadName} (Score: ${handoffData.qualificationScore}/10)`,
        html,
        text,
        tags: ['handoff', `urgency-${handoffData.urgencyLevel}`],
        metadata: {
          leadName: handoffData.leadName,
          qualificationScore: handoffData.qualificationScore.toString(),
          urgencyLevel: handoffData.urgencyLevel
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to send handoff email', { error: error as Error });
      return false;
    }
  }

  /**
   * Send a campaign email with template processing
   */
  async sendCampaignEmail(
    to: string,
    templateId: string,
    variables: Record<string, any>,
    campaignMetadata?: Record<string, any>
  ): Promise<any> {
    try {
      // Process template with variables (this would connect to your template system)
      const processedTemplate = await this.processTemplate(templateId, variables);
      
      return await this.sendEmail({
        to,
        subject: processedTemplate.subject,
        html: processedTemplate.html,
        text: processedTemplate.text,
        tags: ['campaign', `template-${templateId}`],
        metadata: {
          ...campaignMetadata,
          templateId,
          sentAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send campaign email', { error: error as Error, to, templateId });
      throw error;
    }
  }

  /**
   * Process a template with variables
   */
  private async processTemplate(_templateId: string, variables: Record<string, any>): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    // This is a placeholder - you would fetch the template from your database
    // and process it with the variables
    
    // For now, return a simple template
    const template = {
      subject: `Hello ${variables.firstName || 'there'}!`,
      html: `<p>Hello ${variables.firstName || 'there'},</p><p>This is a test campaign email.</p>`,
      text: `Hello ${variables.firstName || 'there'}, This is a test campaign email.`
    };

    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template.subject = template.subject.replace(regex, value);
      template.html = template.html.replace(regex, value);
      template.text = template.text.replace(regex, value);
    });

    return template;
  }

  /**
   * Verify Mailgun webhook signature
   */
  verifyWebhookSignature(timestamp: string, token: string, signature: string): boolean {
    const crypto = require('crypto');
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
    
    if (!signingKey) {
      logger.warn('Mailgun webhook signing key not configured');
      return false;
    }

    const value = timestamp + token;
    const hash = crypto
      .createHmac('sha256', signingKey)
      .update(value)
      .digest('hex');
    
    return hash === signature;
  }

  /**
   * Get service status
   */
  getStatus(): {
    configured: boolean;
    domain?: string;
    fromEmail?: string;
  } {
    return {
      configured: this.isConfigured,
      domain: this.domain,
      fromEmail: this.fromEmail
    };
  }
}

// Export singleton instance
export const mailgunService = new MailgunEnhancedService();