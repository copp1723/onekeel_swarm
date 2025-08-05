import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { Lead, Campaign } from '../db/schema';
import { EmailAgent } from './email-agent';
import { SMSAgent } from './sms-agent';
import { ChatAgent } from './chat-agent';
import { HandoverService, HandoverEvaluation } from '../services/handover-service';
import { MailgunService } from '../services/email/providers/mailgun';
import { logger } from '../utils/logger';
import twilio from 'twilio';
import { executeWithTwilioBreaker } from '../utils/circuit-breaker';

export interface CampaignStep {
  id: string;
  channel: 'email' | 'sms' | 'chat';
  content: string;
  subject?: string; // For email
  delayDays: number;
  order: number;
}

export interface CampaignConfig {
  name: string;
  steps: CampaignStep[];
  handoverRules?: {
    qualificationScore?: number;
    conversationLength?: number;
    keywordTriggers?: string[];
    timeThreshold?: number;
    goalCompletionRequired?: string[];
    handoverRecipients?: Array<{ name: string; email: string }>;
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
 * Unified Campaign Agent that combines email, SMS, and chat functionality
 * into a single agent for simplified campaign execution
 */
export class UnifiedCampaignAgent extends BaseAgent {
  private emailAgent: EmailAgent;
  private smsAgent: SMSAgent;
  private chatAgent: ChatAgent;
  private twilioClient: any;
  private fromNumber: string;
  private wsConnections: Map<string, any> = new Map(); // WebSocket connections for chat

  constructor() {
    super('unified-campaign');
    
    // Initialize specialized agents
    this.emailAgent = new EmailAgent();
    this.smsAgent = new SMSAgent();
    this.chatAgent = new ChatAgent();
    
    // Initialize Twilio for SMS (replicating SMS agent logic)
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
   * Execute a campaign for a lead with linear progression through steps
   */
  async executeCampaign(lead: Lead, campaign: CampaignConfig): Promise<CampaignExecution> {
    const execution: CampaignExecution = {
      leadId: lead.id,
      campaignId: campaign.name,
      currentStep: 0,
      status: 'running',
      startedAt: new Date(),
      metadata: {
        totalSteps: campaign.steps.length,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        leadSource: lead.source
      }
    };

    try {
      logger.info('Starting unified campaign execution', {
        leadId: lead.id,
        campaignName: campaign.name,
        totalSteps: campaign.steps.length
      });

      // Store campaign start in supermemory
      await this.storeMemory(
        `Started campaign "${campaign.name}" for ${execution.metadata.leadName}`,
        {
          leadId: lead.id,
          campaignName: campaign.name,
          type: 'campaign_started',
          totalSteps: campaign.steps.length
        }
      );

      // Execute steps in order with delays
      for (let i = 0; i < campaign.steps.length; i++) {
        const step = campaign.steps[i];
        execution.currentStep = i;

        // Apply delay (except for first step)
        if (i > 0 && step.delayDays > 0) {
          logger.info(`Delaying execution for ${step.delayDays} days`, {
            leadId: lead.id,
            step: i,
            delayDays: step.delayDays
          });
          
          // In a real implementation, this would be handled by a scheduler
          // For now, we simulate the delay with a simple timeout
          await this.delay(step.delayDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
        }

        // Check if handover should occur before sending this step
        const context: AgentContext = { lead, campaign: campaign as any };
        
        // Try to find existing conversation for this lead
        let conversationId: string | undefined;
        try {
          const { ConversationsRepository } = await import('../db');
          const conversation = await ConversationsRepository.findByLeadIdAndChannel(lead.id, step.channel);
          conversationId = conversation?.id;
        } catch (error) {
          logger.warn('Could not find conversation for handover evaluation', {
            leadId: lead.id,
            channel: step.channel,
            error: (error as Error).message
          });
        }
        
        const shouldHandover = await this.shouldHandover(lead, campaign.handoverRules || {}, conversationId);
        
        if (shouldHandover.shouldHandover) {
          logger.info('Handover triggered during campaign execution', {
            leadId: lead.id,
            step: i,
            reason: shouldHandover.reason,
            score: shouldHandover.score,
            criteria: shouldHandover.triggeredCriteria
          });
          
          execution.status = 'handover';
          const handoverSuccess = await this.executeHandover(
            lead,
            campaign.handoverRules?.handoverRecipients || [],
            conversationId
          );
          
          if (handoverSuccess) {
            await this.storeMemory(
              `Campaign handover completed for ${execution.metadata.leadName}`,
              {
                leadId: lead.id,
                campaignName: campaign.name,
                type: 'campaign_handover_completed',
                step: i,
                reason: shouldHandover.reason,
                score: shouldHandover.score
              }
            );
          }
          
          break;
        }

        // Execute the step
        try {
          const result = await this.sendMessage(lead, step, step.channel);
          
          logger.info('Campaign step executed successfully', {
            leadId: lead.id,
            step: i,
            channel: step.channel,
            messageId: result?.id || result?.sid || 'chat-delivered'
          });

          execution.lastExecutedAt = new Date();
          
          // Store step execution in supermemory
          await this.storeMemory(
            `Campaign step ${i + 1}/${campaign.steps.length} sent via ${step.channel} to ${execution.metadata.leadName}`,
            {
              leadId: lead.id,
              campaignName: campaign.name,
              stepNumber: i + 1,
              channel: step.channel,
              type: 'campaign_step_executed',
              messageId: result?.id || result?.sid || 'chat-delivered'
            }
          );

        } catch (error) {
          logger.error('Campaign step execution failed', {
            leadId: lead.id,
            step: i,
            channel: step.channel,
            error: (error as Error).message
          });

          // Simple retry logic - retry once after 5 minutes
          logger.info('Retrying campaign step after delay', { leadId: lead.id, step: i });
          await this.delay(5 * 60 * 1000); // 5 minutes
          
          try {
            const retryResult = await this.sendMessage(lead, step, step.channel);
            logger.info('Campaign step retry successful', {
              leadId: lead.id,
              step: i,
              messageId: retryResult?.id || retryResult?.sid || 'chat-delivered'
            });
          } catch (retryError) {
            logger.error('Campaign step retry failed, continuing to next step', {
              leadId: lead.id,
              step: i,
              error: (retryError as Error).message
            });
          }
        }
      }

      // Mark campaign as completed if not handed over
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.currentStep = campaign.steps.length;
        
        logger.info('Campaign completed successfully', {
          leadId: lead.id,
          campaignName: campaign.name,
          totalSteps: campaign.steps.length
        });

        // Store campaign completion
        await this.storeMemory(
          `Completed campaign "${campaign.name}" for ${execution.metadata.leadName}`,
          {
            leadId: lead.id,
            campaignName: campaign.name,
            type: 'campaign_completed',
            totalSteps: campaign.steps.length,
            executionTime: Date.now() - execution.startedAt.getTime()
          }
        );
      }

      return execution;

    } catch (error) {
      logger.error('Campaign execution failed', {
        leadId: lead.id,
        campaignName: campaign.name,
        error: (error as Error).message
      });
      
      execution.status = 'paused';
      return execution;
    }
  }

  /**
   * Send a message through the specified channel
   */
  async sendMessage(lead: Lead, message: CampaignStep, channel: 'email' | 'sms' | 'chat'): Promise<any> {
    const personalizedContent = this.personalizeMessage(message.content, lead);
    const personalizedSubject = message.subject ? this.personalizeMessage(message.subject, lead) : undefined;

    switch (channel) {
      case 'email':
        return await this.sendEmail(lead, personalizedSubject || 'Message from our team', personalizedContent);
      
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
          const campaignId = lead.campaignId || execution?.metadata?.campaignId;
          
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
   * Send email using the email agent's functionality
   */
  private async sendEmail(lead: Lead, subject: string, content: string): Promise<any> {
    if (!lead.email) {
      throw new Error('Lead email not available');
    }
    
    return await this.emailAgent.sendEmail(lead.email, subject, content);
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

    // Use the specialized agents for processing based on context
    // This is a simplified approach - in practice, you might determine channel from context
    return await this.chatAgent.processMessage(message, context);
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