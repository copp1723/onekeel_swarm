import twilio from 'twilio';
import { logger } from '../utils/logger';

export interface SMSConfig {
  to: string;
  body: string;
  campaignId?: string;
  leadId?: string;
  metadata?: Record<string, any>;
}

export interface SMSTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
}

export class SMSService {
  private twilioClient: any;
  private fromNumber: string = '';
  private isConfigured: boolean = false;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      logger.warn('Twilio service not configured - missing credentials');
      this.fromNumber = phoneNumber || '';
      this.isConfigured = false;
      return;
    }

    try {
      this.twilioClient = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      this.isConfigured = true;
      
      logger.info('Twilio SMS service initialized successfully', { fromNumber: phoneNumber });
    } catch (error) {
      logger.error('Failed to initialize Twilio service', error as Error);
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
   * Send an SMS message
   */
  async sendSMS(config: SMSConfig): Promise<any> {
    try {
      // If not configured, return mock response
      if (!this.isConfigured) {
        logger.info('SMS service not configured, returning mock response', { to: config.to });
        return {
          sid: `mock-sms-${Date.now()}`,
          to: config.to,
          from: this.fromNumber || '+1234567890',
          body: config.body,
          status: 'sent',
          mock: true,
          message: 'SMS simulated (Twilio not configured)'
        };
      }

      // Send real SMS
      const message = await this.twilioClient.messages.create({
        body: config.body,
        from: this.fromNumber,
        to: config.to
      });

      logger.info('SMS sent successfully', {
        to: config.to,
        sid: message.sid,
        status: message.status,
        campaignId: config.campaignId,
        leadId: config.leadId
      });

      return message;
    } catch (error) {
      logger.error('Failed to send SMS', {
        error: error as Error,
        to: config.to,
        body: config.body.substring(0, 50) + '...'
      });
      
      // Return mock response on error
      return {
        sid: `mock-error-${Date.now()}`,
        to: config.to,
        from: this.fromNumber || '+1234567890',
        body: config.body,
        status: 'failed',
        mock: true,
        error: (error as Error).message
      };
    }
  }

  /**
   * Generate SMS content based on context and prompt
   */
  async generateSMSContent(
    prompt: string,
    context: {
      leadName?: string;
      previousMessages?: string[];
      campaignGoals?: string[];
      customVariables?: Record<string, any>;
    }
  ): Promise<string> {
    // This would integrate with your AI service (OpenRouter)
    // For now, return template-based responses
    
    if (prompt.includes('initial') || prompt.includes('first')) {
      return `Hi ${context.leadName || 'there'}! Thanks for your interest. We'd love to help you. Reply YES to learn more or call us at ${process.env.COMPANY_PHONE || '1-800-EXAMPLE'}.`;
    }
    
    if (prompt.includes('follow-up')) {
      return `Hi ${context.leadName || 'there'}, just following up on our previous conversation. Is there anything specific you'd like to know? Reply or call us anytime.`;
    }
    
    if (prompt.includes('appointment')) {
      return `Great! When would be a good time for a quick call? We have availability tomorrow afternoon or Thursday morning. Let me know what works best.`;
    }
    
    // Default response
    return `Thanks for your message! Our team will get back to you shortly. Reply STOP to opt out.`;
  }

  /**
   * Process SMS template with variables
   */
  processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    });
    
    // Ensure SMS length compliance (160 chars for single SMS)
    if (processed.length > 160) {
      logger.warn('SMS message exceeds 160 characters', { 
        length: processed.length,
        truncated: true 
      });
      // Optionally truncate or split into multiple messages
    }
    
    return processed;
  }

  /**
   * Send campaign SMS with template
   */
  async sendCampaignSMS(
    to: string,
    templateId: string,
    variables: Record<string, any>,
    campaignMetadata?: Record<string, any>
  ): Promise<any> {
    try {
      // Get template (this would fetch from your database)
      const template = await this.getTemplate(templateId);
      
      // Process template with variables
      const body = this.processTemplate(template.template, variables);
      
      // Send SMS
      return await this.sendSMS({
        to,
        body,
        campaignId: campaignMetadata?.campaignId,
        leadId: campaignMetadata?.leadId,
        metadata: {
          templateId,
          ...campaignMetadata
        }
      });
    } catch (error) {
      logger.error('Failed to send campaign SMS', { 
        error: error as Error, 
        to, 
        templateId 
      });
      throw error;
    }
  }

  /**
   * Get SMS template (placeholder - would fetch from database)
   */
  private async getTemplate(templateId: string): Promise<SMSTemplate> {
    // This would fetch from your database
    // For now, return mock templates
    const templates: Record<string, SMSTemplate> = {
      'welcome': {
        id: 'welcome',
        name: 'Welcome Message',
        template: 'Hi {{firstName}}! Welcome to {{companyName}}. We\'re excited to help you. Reply YES to get started!',
        variables: ['firstName', 'companyName']
      },
      'follow-up': {
        id: 'follow-up',
        name: 'Follow Up',
        template: 'Hi {{firstName}}, following up on your {{interest}}. Still interested? Reply YES or call {{phone}}.',
        variables: ['firstName', 'interest', 'phone']
      },
      'appointment': {
        id: 'appointment',
        name: 'Appointment Reminder',
        template: 'Reminder: Your appointment is {{date}} at {{time}}. Reply C to confirm or R to reschedule.',
        variables: ['date', 'time']
      }
    };
    
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return template;
  }

  /**
   * Handle incoming SMS webhook from Twilio
   */
  async handleIncomingSMS(data: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
    [key: string]: any;
  }): Promise<void> {
    try {
      logger.info('Received incoming SMS', {
        from: data.From,
        to: data.To,
        sid: data.MessageSid,
        bodyLength: data.Body.length
      });
      
      // Process the incoming message
      // This would trigger conversation handling, lead updates, etc.
      
      // Store in database
      // Trigger AI response if needed
      // Update lead status
      
    } catch (error) {
      logger.error('Failed to process incoming SMS', { 
        error: error as Error,
        sid: data.MessageSid 
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: Array<{ to: string; body: string; [key: string]: any }>): Promise<Array<{ success: boolean; sid?: string; error?: string }>> {
    const results = [];
    
    for (const message of messages) {
      try {
        const result = await this.sendSMS({
          to: message.to,
          body: message.body,
          metadata: message.metadata
        });
        results.push({ success: true, sid: result.sid });
      } catch (error) {
        results.push({ success: false, error: (error as Error).message });
      }
    }
    
    return results;
  }

  /**
   * Get available SMS templates
   */
  async getTemplates(): Promise<SMSTemplate[]> {
    return [
      {
        id: 'welcome',
        name: 'Welcome Message',
        template: 'Hi {{firstName}}! Welcome to {{companyName}}. We\'re excited to help you. Reply YES to get started!',
        variables: ['firstName', 'companyName']
      },
      {
        id: 'follow-up',
        name: 'Follow Up',
        template: 'Hi {{firstName}}, following up on your {{interest}}. Still interested? Reply YES or call {{phone}}.',
        variables: ['firstName', 'interest', 'phone']
      },
      {
        id: 'appointment',
        name: 'Appointment Reminder',
        template: 'Reminder: Your appointment is {{date}} at {{time}}. Reply C to confirm or R to reschedule.',
        variables: ['date', 'time']
      }
    ];
  }

  /**
   * Render template with variables
   */
  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<{ template: SMSTemplate; renderedBody: string }> {
    const template = await this.getTemplate(templateId);
    const renderedBody = this.processTemplate(template.template, variables);
    return { template, renderedBody };
  }

  /**
   * Get service status
   */
  getStatus(): {
    configured: boolean;
    fromNumber?: string;
    accountSid?: string;
  } {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
      accountSid: this.isConfigured ? process.env.TWILIO_ACCOUNT_SID : undefined
    };
  }
}

// Export singleton instance
export const smsService = new SMSService();