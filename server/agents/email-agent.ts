import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { logger } from '../utils/logger';

/**
 * Email Agent - Handles email communication
 * This is a stub implementation to restore system connectivity
 */
export class EmailAgent extends BaseAgent {
  constructor() {
    super('email');
  }

  /**
   * Send an email using the configured email service
   */
  async sendEmail(to: string, subject: string, content: string, options?: any): Promise<any> {
    try {
      logger.info('EmailAgent: Sending email', { to, subject });
      
      // Import email service dynamically to avoid circular dependencies
      const { MailgunService } = await import('../services/email/providers/mailgun');
      
      const result = await MailgunService.sendEmail({
        to,
        subject,
        html: content,
        text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        ...options
      });

      logger.info('EmailAgent: Email sent successfully', { 
        to, 
        subject, 
        messageId: result?.id || 'unknown' 
      });

      return result;
    } catch (error) {
      logger.error('EmailAgent: Failed to send email', {
        to,
        subject,
        error: (error as Error).message
      });
      
      // Return mock response for development/testing
      return {
        id: `mock-email-${Date.now()}`,
        to,
        subject,
        status: 'simulated',
        message: 'Email simulated - service not available'
      };
    }
  }

  /**
   * Process incoming email message
   */
  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead } = context;
    
    // Store the message in supermemory
    await this.storeMemory(
      `Email received from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`,
      {
        leadId: lead.id,
        type: 'email_received',
        channel: 'email'
      }
    );

    // Generate a contextual response
    const response = this.generateEmailResponse(message, context);
    
    logger.info('EmailAgent: Processed email message', {
      leadId: lead.id,
      messageLength: message.length,
      responseLength: response.length
    });

    return response;
  }

  /**
   * Make decision about email handling
   */
  async makeDecision(context: AgentContext): Promise<AgentDecision> {
    const { lead } = context;
    
    return {
      action: 'send_email_response',
      reasoning: 'Email agent handling email communication',
      data: {
        agentType: this.agentType,
        leadId: lead.id,
        channel: 'email'
      }
    };
  }

  /**
   * Generate contextual email response
   */
  private generateEmailResponse(message: string, context: AgentContext): string {
    const { lead } = context;
    const firstName = lead.firstName || 'there';
    
    // Simple response generation based on message content
    if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
      return `Hi ${firstName},\n\nThank you for your inquiry about pricing. I'd be happy to discuss our options with you. Let me connect you with someone who can provide detailed pricing information.\n\nBest regards,\nThe Team`;
    }
    
    if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('appointment')) {
      return `Hi ${firstName},\n\nI'd be happy to help you schedule a time to talk. Let me connect you with our scheduling team to find a time that works best for you.\n\nBest regards,\nThe Team`;
    }
    
    if (message.toLowerCase().includes('question') || message.toLowerCase().includes('help')) {
      return `Hi ${firstName},\n\nThank you for reaching out. I want to make sure you get the best possible help with your question. Let me connect you with one of our specialists who can assist you further.\n\nBest regards,\nThe Team`;
    }
    
    // Default response
    return `Hi ${firstName},\n\nThank you for your message. I've received your inquiry and want to make sure you get the best possible assistance. Let me connect you with someone from our team who can help you further.\n\nBest regards,\nThe Team`;
  }

  /**
   * Mock response for development
   */
  protected getMockResponse(prompt: string): string {
    return `Email Agent: I'll help you with email communication. Whether you need to send emails, process incoming messages, or manage email campaigns, I'm here to assist.`;
  }
}
