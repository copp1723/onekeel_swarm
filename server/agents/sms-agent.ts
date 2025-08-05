import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { logger } from '../utils/logger';
import twilio from 'twilio';
import { executeWithTwilioBreaker } from '../utils/circuit-breaker';

/**
 * SMS Agent - Handles SMS communication via Twilio
 * This is a stub implementation to restore system connectivity
 */
export class SMSAgent extends BaseAgent {
  private twilioClient: any;
  private fromNumber: string;

  constructor() {
    super('sms');
    
    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    } else {
      logger.info('SMSAgent: Twilio not configured, SMS will be simulated');
      this.twilioClient = null;
      this.fromNumber = '';
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(to: string, content: string, options?: any): Promise<any> {
    try {
      if (!this.twilioClient || !this.fromNumber) {
        logger.info('SMSAgent: SMS simulated - Twilio not configured', { to });
        return {
          sid: `mock-sms-${Date.now()}`,
          to: to,
          from: this.fromNumber || '+1234567890',
          body: content,
          status: 'simulated',
          message: 'SMS simulated - Twilio not configured'
        };
      }

      const message = await executeWithTwilioBreaker(async () => {
        return await this.twilioClient.messages.create({
          body: content,
          from: this.fromNumber,
          to: to,
          ...options
        });
      });

      logger.info('SMSAgent: SMS sent successfully', { 
        to, 
        sid: message.sid,
        status: message.status 
      });

      return message;
    } catch (error) {
      logger.error('SMSAgent: Failed to send SMS', {
        to,
        error: (error as Error).message
      });
      
      // Return mock response for development/testing
      return {
        sid: `error-sms-${Date.now()}`,
        to,
        from: this.fromNumber || '+1234567890',
        body: content,
        status: 'failed',
        error: (error as Error).message
      };
    }
  }

  /**
   * Process incoming SMS message
   */
  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead } = context;
    
    // Store the message in supermemory
    await this.storeMemory(
      `SMS received from ${lead.firstName || ''} ${lead.lastName || ''} (${lead.phone}): ${message}`,
      {
        leadId: lead.id,
        type: 'sms_received',
        channel: 'sms',
        phone: lead.phone
      }
    );

    // Generate a contextual response
    const response = this.generateSMSResponse(message, context);
    
    logger.info('SMSAgent: Processed SMS message', {
      leadId: lead.id,
      phone: lead.phone,
      messageLength: message.length,
      responseLength: response.length
    });

    return response;
  }

  /**
   * Make decision about SMS handling
   */
  async makeDecision(context: AgentContext): Promise<AgentDecision> {
    const { lead } = context;
    
    return {
      action: 'send_sms_response',
      reasoning: 'SMS agent handling text message communication',
      data: {
        agentType: this.agentType,
        leadId: lead.id,
        channel: 'sms',
        phone: lead.phone
      }
    };
  }

  /**
   * Generate contextual SMS response (keep it short for SMS)
   */
  private generateSMSResponse(message: string, context: AgentContext): string {
    const { lead } = context;
    const firstName = lead.firstName || 'there';
    
    // Keep SMS responses short and direct
    if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
      return `Hi ${firstName}! Thanks for asking about pricing. I'll have someone call you with details. When's a good time?`;
    }
    
    if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('appointment')) {
      return `Hi ${firstName}! I'd love to help you schedule something. What day works best for you?`;
    }
    
    if (message.toLowerCase().includes('stop') || message.toLowerCase().includes('unsubscribe')) {
      return `Got it ${firstName}, you've been removed from our SMS list. Thanks for letting us know!`;
    }
    
    if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('interested')) {
      return `Great ${firstName}! I'll have someone reach out to you shortly to help with next steps.`;
    }
    
    if (message.toLowerCase().includes('no') || message.toLowerCase().includes('not interested')) {
      return `No problem ${firstName}, thanks for letting us know. Have a great day!`;
    }
    
    // Default response
    return `Hi ${firstName}! Thanks for your message. I'll make sure someone gets back to you soon.`;
  }

  /**
   * Mock response for development
   */
  protected getMockResponse(prompt: string): string {
    return `SMS Agent: I'll help you with text message communication. I can send SMS messages, process incoming texts, and manage SMS campaigns through Twilio.`;
  }
}
