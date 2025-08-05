import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { Lead } from '../db/schema';
import { HandoverService } from '../services/handover-service';
import { MailgunService } from '../services/email/providers/mailgun';
import { logger } from '../utils/logger';
import twilio from 'twilio';
// Simplified - removed individual agent imports per handoff

// Simplified campaign configuration per handoff
export interface CampaignConfig {
  name: string;
  systemPrompt: string;
  templates: Array<{
    content: string;
    channel: 'email' | 'sms' | 'chat';
    subject?: string;
  }>;
  schedule: {
    totalEmails: number;
    daysBetweenEmails: number;
  };
  handoverRules?: {
    qualificationThreshold?: number;
    keywords?: string[];
    recipients: Array<{ name: string; email: string }>;
  };
}

export interface CampaignExecution {
  leadId: string;
  campaignId: string;
  currentStep: number;
  status: 'running' | 'completed' | 'paused' | 'handover';
  startedAt: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Simplified Unified Campaign Agent per handoff plan
 * Handles email/SMS/chat in one agent without complex infrastructure
 */
export class UnifiedCampaignAgent extends BaseAgent {
  private twilioClient: any;
  private fromNumber: string;
  private wsConnections: Map<string, any> = new Map();

  constructor() {
    super('unified-campaign');

    // Initialize Twilio for SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    } else {
      logger.info('Unified campaign agent: Twilio not configured, SMS will be simulated');
      this.twilioClient = null;
      this.fromNumber = '';
    }
  }

  /**
   * Simplified campaign execution per handoff plan
   */
  async executeCampaign(lead: Lead, campaign: CampaignConfig): Promise<void> {
    const { totalEmails, daysBetweenEmails } = campaign.schedule;

    logger.info('Starting simplified campaign execution', {
      leadId: lead.id,
      campaignName: campaign.name,
      totalEmails,
      daysBetweenEmails
    });

    for (let i = 0; i < totalEmails; i++) {
      const message = await this.generateResponse(
        campaign.templates[i].content,
        campaign.systemPrompt,
        { leadId: lead.id, type: 'campaign_message' }
      );

      await this.sendMessage(lead, message, campaign.templates[i].channel);

      // Check handover using wizard config
      const handoverEval = await this.shouldHandover(lead, campaign.handoverRules);
      if (handoverEval.shouldHandover) {
        await this.executeHandover(lead, campaign.handoverRules.recipients, undefined);
        break;
      }

      // Simple delay between messages
      if (i < totalEmails - 1) {
        await this.delay(daysBetweenEmails * 24 * 60 * 60 * 1000);
      }
    }

    logger.info('Campaign execution completed', {
      leadId: lead.id,
      campaignName: campaign.name,
      totalMessages: totalEmails
    });
  }

  /**
   * Send a message through the specified channel (simplified version)
   */
  async sendMessage(lead: Lead, message: string, channel: 'email' | 'sms' | 'chat', subject?: string): Promise<any> {
    const personalizedContent = this.personalizeMessage(message, lead);
    const personalizedSubject = subject ? this.personalizeMessage(subject, lead) : 'Message from our team';

    switch (channel) {
      case 'email':
        return await this.sendEmail(lead, personalizedSubject, personalizedContent);

      case 'sms':
        if (!lead.phone) {
          throw new Error('Lead phone number not available for SMS');
        }
        return await this.sendSMS(lead.phone, personalizedContent);

      case 'chat':
        return await this.sendChatMessage(lead, personalizedContent);

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Evaluate if handover should occur using HandoverService
   */
  async shouldHandover(lead: Lead, handoverRules: any, conversationId?: string): Promise<HandoverEvaluation> {
    try {
      // If we have a conversation ID, use the comprehensive HandoverService evaluation
      if (conversationId) {
        return await HandoverService.evaluateHandover(conversationId);
      }

      // If no conversation ID, do basic evaluation based on lead data and rules
      if (!handoverRules || Object.keys(handoverRules).length === 0) {
        return {
          shouldHandover: false,
          reason: 'No handover rules configured',
          score: 0,
          triggeredCriteria: [],
          nextActions: ['Continue campaign execution']
        };
      }

      const evaluation: HandoverEvaluation = {
        shouldHandover: false,
        reason: '',
        score: lead.qualificationScore || 0,
        triggeredCriteria: [],
        nextActions: []
      };

      // Check qualification score threshold
      if (handoverRules.qualificationScore && lead.qualificationScore >= handoverRules.qualificationScore) {
        evaluation.shouldHandover = true;
        evaluation.triggeredCriteria.push('qualification_score');
        evaluation.reason = `Lead qualification score (${lead.qualificationScore}) meets threshold (${handoverRules.qualificationScore})`;
      }

      // Check for keyword triggers in lead metadata or notes
      if (handoverRules.keywordTriggers && Array.isArray(handoverRules.keywordTriggers)) {
        const leadText = `${lead.notes || ''} ${JSON.stringify(lead.metadata || {})}`.toLowerCase();
        const triggeredKeywords = handoverRules.keywordTriggers.filter(keyword =>
          leadText.includes(keyword.toLowerCase())
        );
        
        if (triggeredKeywords.length > 0) {
          evaluation.shouldHandover = true;
          evaluation.triggeredCriteria.push('keyword_triggers');
          evaluation.reason += evaluation.reason ? ' and ' : '';
          evaluation.reason += `Triggered keywords: ${triggeredKeywords.join(', ')}`;
        }
      }

      if (evaluation.shouldHandover) {
        evaluation.nextActions = ['Transfer to human agent', 'Generate lead dossier'];
      } else {
        evaluation.nextActions = ['Continue campaign', 'Monitor for handover triggers'];
      }

      return evaluation;
    } catch (error) {
      logger.error('Error evaluating handover in unified agent', {
        leadId: lead.id,
        error: (error as Error).message
      });
      
      // Return safe default
      return {
        shouldHandover: false,
        reason: 'Error evaluating handover criteria',
        score: 0,
        triggeredCriteria: [],
        nextActions: ['Continue campaign with caution']
      };
    }
  }

  /**
   * Execute handover to human agents using HandoverService
   */
  async executeHandover(lead: Lead, recipients: Array<{ name: string; email: string }>, conversationId?: string): Promise<boolean> {
    try {
      logger.info('Executing handover for unified campaign', {
        leadId: lead.id,
        recipientCount: recipients.length,
        conversationId
      });

      // Store handover initiation in supermemory
      await this.storeMemory(
        `Handover initiated for ${lead.firstName || ''} ${lead.lastName || ''}`,
        {
          leadId: lead.id,
          type: 'handover_initiated',
          recipients: recipients.map(r => r.email),
          conversationId,
          timestamp: new Date().toISOString()
        }
      );

      let success = false;

      if (conversationId) {
        // Use the comprehensive HandoverService for full handover execution
        success = await HandoverService.executeHandover(
          conversationId,
          'Campaign handover triggered by unified agent',
          undefined // Let HandoverService determine human agent assignment
        );
      } else {
        // Create a basic conversation record for the handover if none exists
        try {
          const { ConversationsRepository } = await import('../db');
          
          // Get campaign ID from lead or use a default
          const campaignId = lead.campaignId || 'default-campaign';
          
          const conversation = await ConversationsRepository.create(
            lead.id,
            'email', // Default channel for campaign handovers
            'unified-campaign',
            campaignId
          );
          
          if (conversation) {
            success = await HandoverService.executeHandover(
              conversation.id,
              'Campaign handover triggered by unified agent'
            );
          }
        } catch (conversationError) {
          logger.warn('Could not create conversation for handover, using fallback', {
            leadId: lead.id,
            error: (conversationError as Error).message
          });
          
          // Fallback: notify recipients directly
          success = await this.executeDirectHandoverNotification(lead, recipients);
        }
      }

      if (success) {
        await this.storeMemory(
          `Handover completed successfully for ${lead.firstName || ''} ${lead.lastName || ''}`,
          {
            leadId: lead.id,
            type: 'handover_completed',
            conversationId,
            timestamp: new Date().toISOString()
          }
        );
      }

      return success;
    } catch (error) {
      logger.error('Handover execution failed', {
        leadId: lead.id,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Fallback method for direct handover notification when conversation doesn't exist
   */
  private async executeDirectHandoverNotification(lead: Lead, recipients: Array<{ name: string; email: string }>): Promise<boolean> {
    try {
      const { HandoverEmailService } = await import('../services/handover-email-service');
      const { LeadDossierService } = await import('../services/lead-dossier-service');
      
      // Generate a simplified dossier for direct handover
      const simplifiedDossier = {
        leadSnapshot: {
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown Lead',
          email: lead.email || 'No email provided',
          phone: lead.phone || 'No phone provided',
          source: lead.source || 'Unknown',
          status: lead.status || 'new'
        },
        handoverTrigger: {
          reason: 'Campaign handover triggered by unified agent',
          urgency: 'medium' as const,
          timestamp: new Date().toISOString()
        },
        recommendations: {
          nextSteps: ['Contact lead via preferred channel', 'Review lead qualification', 'Schedule follow-up'],
          approachStrategy: 'Standard campaign follow-up'
        }
      };

      // Send handover notification
      const emailSent = await HandoverEmailService.sendHandoverNotification(
        simplifiedDossier.leadSnapshot.name,
        simplifiedDossier,
        recipients,
        'campaign-handover'
      );

      if (emailSent) {
        logger.info('Direct handover notification sent successfully', {
          leadId: lead.id,
          recipientCount: recipients.length
        });
      } else {
        logger.warn('Direct handover notification failed', {
          leadId: lead.id,
          recipientCount: recipients.length
        });
      }

      return emailSent;
    } catch (error) {
      logger.error('Direct handover notification failed', {
        leadId: lead.id,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Simple delay utility
   */
  async delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Send email using MailgunService directly (simplified)
   */
  private async sendEmail(lead: Lead, subject: string, content: string): Promise<any> {
    if (!lead.email) {
      throw new Error('Lead email not available');
    }

    try {
      const mailgunService = new MailgunService();
      const result = await mailgunService.sendEmail(lead.email, subject, content);
      logger.info('Email sent successfully', {
        to: lead.email,
        subject,
        messageId: result?.id || 'unknown'
      });
      return result;
    } catch (error) {
      logger.error('Email send failed', {
        to: lead.email,
        subject,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Send SMS using Twilio
   */
  private async sendSMS(to: string, content: string): Promise<any> {
    try {
      if (!this.twilioClient || !this.fromNumber) {
        logger.info('SMS simulated - Twilio not configured', { to });
        return {
          sid: `mock-sms-${Date.now()}`,
          to: to,
          from: this.fromNumber || '+1234567890',
          body: content,
          status: 'sent',
          message: 'Simulated SMS send (Twilio not configured)'
        };
      }

      const message = await executeWithTwilioBreaker(async () => {
        return await this.twilioClient.messages.create({
          body: content,
          from: this.fromNumber,
          to: to
        });
      });

      logger.info('SMS sent successfully', { to, sid: message.sid });
      return message;

    } catch (error) {
      logger.error('SMS send failed', { to, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Send chat message via WebSocket
   */
  private async sendChatMessage(lead: Lead, content: string): Promise<any> {
    try {
      const leadKey = `lead_${lead.id}`;
      const wsConnection = this.wsConnections.get(leadKey);

      if (wsConnection && wsConnection.readyState === 1) { // WebSocket.OPEN
        const message = {
          type: 'agent_message',
          content: content,
          timestamp: new Date().toISOString(),
          leadId: lead.id
        };

        wsConnection.send(JSON.stringify(message));
        logger.info('Chat message sent via WebSocket', { leadId: lead.id });
        
        return {
          id: `chat-${Date.now()}`,
          content: content,
          channel: 'chat',
          status: 'delivered'
        };
      } else {
        logger.warn('No active chat connection for lead', { leadId: lead.id });
        
        // Return mock response indicating no active connection
        return {
          id: `chat-offline-${Date.now()}`,
          content: content,
          channel: 'chat',
          status: 'no_connection',
          message: 'Chat message queued - no active connection'
        };
      }
    } catch (error) {
      logger.error('Chat message send failed', { leadId: lead.id, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Register a WebSocket connection for a lead
   */
  registerChatConnection(leadId: string, wsConnection: any): void {
    const leadKey = `lead_${leadId}`;
    this.wsConnections.set(leadKey, wsConnection);
    
    logger.info('Chat connection registered', { leadId });

    // Clean up connection when it closes
    wsConnection.on('close', () => {
      this.wsConnections.delete(leadKey);
      logger.info('Chat connection removed', { leadId });
    });
  }

  /**
   * Personalize message content with lead data
   */
  private personalizeMessage(content: string, lead: Lead): string {
    return content
      .replace(/{firstName}/g, lead.firstName || 'there')
      .replace(/{lastName}/g, lead.lastName || '')
      .replace(/{fullName}/g, `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'there')
      .replace(/{email}/g, lead.email || '')
      .replace(/{phone}/g, lead.phone || '')
      .replace(/{source}/g, lead.source || 'website');
  }

  // Override base agent methods
  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead } = context;
    
    // Store incoming message
    await this.storeMemory(
      `Unified campaign agent received message from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`,
      {
        leadId: lead.id,
        type: 'message_received',
        source: 'unified_campaign'
      }
    );

    // Generate response using base agent functionality (simplified)
    return await this.generateResponse(
      message,
      'You are a helpful campaign assistant. Respond to the user\'s message in a friendly and professional manner.',
      { leadId: lead.id, type: 'chat_response' }
    );
  }

  async makeDecision(context: AgentContext): Promise<AgentDecision> {
    return {
      action: 'execute_campaign_step',
      reasoning: 'Unified campaign agent managing multi-channel communication',
      data: {
        agentType: this.agentType,
        leadId: context.lead.id
      }
    };
  }

  protected getMockResponse(prompt: string): string {
    return `Unified campaign agent response: I'll help coordinate your multi-channel campaign communication needs. Whether it's email, SMS, or chat, I'll ensure your message reaches the right people at the right time.`;
  }
}