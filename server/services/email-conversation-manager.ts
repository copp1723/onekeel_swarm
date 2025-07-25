import { logger } from '../utils/logger';
import { db } from '../db/client';
import { leads, communications, conversations, campaigns } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { EmailAgent } from '../agents/email-agent';
import { HandoverService } from './handover-service';
import { EmailServiceFactory } from './email/factory';
import { emailReplyDetector } from './email-reply-detector';

interface EmailReply {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
}

export class EmailConversationManager {
  private emailAgent: EmailAgent;
  private handoverService: HandoverService;

  constructor() {
    this.emailAgent = new EmailAgent();
    this.handoverService = new HandoverService();
  }

  /**
   * Process an incoming email reply and continue the conversation
   */
  async processEmailReply(replyData: EmailReply): Promise<void> {
    try {
      logger.info('Processing email reply for intelligent conversation', {
        from: replyData.from,
        subject: replyData.subject
      });

      // 1. Find the lead by email
      const lead = await this.findLeadByEmail(replyData.from);
      if (!lead) {
        logger.warn('No lead found for email, creating new lead', { email: replyData.from });
        // Create a new lead if none exists
        const newLead = await this.createLeadFromEmail(replyData);
        if (newLead) {
          await this.processEmailReply(replyData); // Retry with new lead
        }
        return;
      }

      // 2. Find or create conversation
      let conversationId = await this.findOrCreateConversation(lead.id);

      // 3. Extract the actual reply content (remove quoted text)
      const replyContent = await emailReplyDetector.extractOriginalMessage(replyData.body);

      // 4. Save the inbound message
      await this.saveMessage({
        conversationId,
        leadId: lead.id,
        direction: 'inbound',
        channel: 'email',
        content: replyContent,
        metadata: {
          subject: replyData.subject,
          messageId: replyData.messageId,
          inReplyTo: replyData.inReplyTo,
          fullBody: replyData.body
        }
      });

      // 5. Get conversation history for context
      const conversationHistory = await this.getConversationHistory(conversationId);

      // 6. Find associated campaign and goals
      const campaign = await this.getLeadCampaign(lead.id);

      // 7. Generate AI response using the email agent
      const aiResponse = await this.emailAgent.processMessage({
        content: replyContent,
        from: replyData.from,
        leadId: lead.id,
        conversationId,
        context: {
          isReply: true,
          subject: replyData.subject,
          conversationHistory,
          campaign: campaign ? {
            goals: campaign.settings?.goals || [],
            context: campaign.description,
            offer: campaign.settings?.offer
          } : undefined,
          lead: {
            name: lead.name || lead.firstName || lead.email?.split('@')[0],
            email: lead.email,
            metadata: lead.metadata
          }
        }
      });

      // 8. Check handover criteria
      const handoverCriteria = campaign?.settings?.handoverCriteria || {
        qualificationScore: 80,
        conversationLength: 5,
        keywordTriggers: [
          'ready to buy', 'purchase', 'pricing', 'cost',
          'schedule a call', 'speak to someone', 'talk to human',
          'manager', 'representative'
        ],
        goalCompletionRequired: ['qualified', 'interested']
      };

      const handoverCheck = await this.handoverService.evaluateConversation(
        conversationId,
        handoverCriteria
      );

      if (handoverCheck.shouldHandover) {
        // 9a. Execute handover to human
        logger.info('Handover criteria met, escalating to human agent', {
          leadId: lead.id,
          reasons: handoverCheck.reasons
        });

        await this.handoverService.executeHandover(conversationId);
        
        // Send a final message informing about handover
        const handoverMessage = this.generateHandoverMessage(lead.firstName || lead.email?.split('@')[0]);
        await this.sendEmail({
          to: replyData.from,
          subject: `Re: ${replyData.subject}`,
          content: handoverMessage,
          leadId: lead.id,
          conversationId
        });

      } else if (aiResponse && typeof aiResponse === 'string') {
        // 9b. Send AI-generated response
        logger.info('Sending AI-generated response', {
          leadId: lead.id,
          responseLength: aiResponse.length
        });

        await this.sendEmail({
          to: replyData.from,
          subject: `Re: ${replyData.subject}`,
          content: aiResponse,
          leadId: lead.id,
          conversationId,
          inReplyTo: replyData.messageId
        });

        // Save the outbound message
        await this.saveMessage({
          conversationId,
          leadId: lead.id,
          direction: 'outbound',
          channel: 'email',
          content: aiResponse,
          metadata: {
            subject: `Re: ${replyData.subject}`,
            agentId: 'email-agent',
            generatedBy: 'ai',
            model: 'gpt-4'
          }
        });
      }

    } catch (error) {
      logger.error('Error processing email reply', { error, from: replyData.from });
    }
  }

  private async findLeadByEmail(email: string): Promise<any> {
    try {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.email, email))
        .limit(1);
      
      return lead;
    } catch (error) {
      logger.error('Error finding lead by email', { error, email });
      return null;
    }
  }

  private async createLeadFromEmail(emailData: EmailReply): Promise<any> {
    try {
      const name = emailData.from.split('@')[0].replace(/[._-]/g, ' ');
      const [lead] = await db
        .insert(leads)
        .values({
          id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: emailData.from,
          firstName: name,
          source: 'email_reply',
          status: 'new',
          metadata: {
            firstContactSubject: emailData.subject,
            firstContactDate: new Date().toISOString()
          }
        })
        .returning();
      
      return lead;
    } catch (error) {
      logger.error('Error creating lead from email', { error });
      return null;
    }
  }

  private async findOrCreateConversation(leadId: string): Promise<string> {
    try {
      // Check for existing conversation
      const [existing] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.leadId, leadId))
        .orderBy(desc(conversations.createdAt))
        .limit(1);
      
      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const [newConv] = await db
        .insert(conversations)
        .values({
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          leadId,
          channel: 'email',
          status: 'active',
          metadata: {}
        })
        .returning();
      
      return newConv.id;
    } catch (error) {
      logger.error('Error finding/creating conversation', { error });
      // Return a temporary ID
      return `temp_conv_${leadId}`;
    }
  }

  private async getConversationHistory(conversationId: string): Promise<any[]> {
    try {
      const messages = await db
        .select()
        .from(communications)
        .where(eq(communications.conversationId, conversationId))
        .orderBy(communications.createdAt);
      
      return messages;
    } catch (error) {
      logger.error('Error getting conversation history', { error });
      return [];
    }
  }

  private async getLeadCampaign(leadId: string): Promise<any> {
    try {
      // In production, this would join lead_campaign_enrollments with campaigns
      // For now, return mock campaign data
      return {
        id: 'campaign-1',
        name: 'Auto Loan Campaign',
        settings: {
          goals: ['Generate interest in auto loans', 'Qualify leads for financing'],
          handoverCriteria: {
            qualificationScore: 80,
            conversationLength: 5,
            keywordTriggers: ['ready', 'buy', 'purchase', 'pricing', 'call', 'human'],
            goalCompletionRequired: ['qualified']
          }
        }
      };
    } catch (error) {
      logger.error('Error getting lead campaign', { error });
      return null;
    }
  }

  private async saveMessage(message: any): Promise<void> {
    try {
      await db.insert(communications).values({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: message.conversationId,
        leadId: message.leadId,
        direction: message.direction,
        channel: message.channel,
        content: message.content,
        status: 'delivered',
        metadata: message.metadata
      });
    } catch (error) {
      logger.error('Error saving message', { error });
    }
  }

  private async sendEmail(params: any): Promise<void> {
    try {
      const emailService = EmailServiceFactory.createServiceFromEnv();
      if (!emailService) {
        logger.warn('Email service not configured');
        throw new Error('Email service not available');
      }
      
      const result = await emailService.sendEmail({
        to: params.to,
        subject: params.subject,
        html: params.content,
        text: params.content.replace(/<[^>]*>/g, ''),
        metadata: {
          leadId: params.leadId,
          conversationId: params.conversationId,
          inReplyTo: params.inReplyTo
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Email sent successfully', { to: params.to, messageId: result.messageId });
    } catch (error) {
      logger.error('Error sending email', { error });
      throw error;
    }
  }

  private async updateLeadScore(leadId: string, score: number): Promise<void> {
    try {
      await db
        .update(leads)
        .set({ 
          score,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));
    } catch (error) {
      logger.error('Error updating lead score', { error });
    }
  }

  private generateHandoverMessage(leadName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3>Thank you for your interest, ${leadName || 'there'}!</h3>
        <p>I can see you're ready to take the next step. I'm connecting you with one of our financing specialists who can provide more detailed information and personalized assistance.</p>
        <p>They will reach out to you shortly to continue our conversation and help you with your specific needs.</p>
        <p>In the meantime, feel free to reply with any additional questions or information you'd like to share.</p>
        <p>Best regards,<br>The Complete Car Loans Team</p>
      </div>
    `;
  }
}

// Export singleton instance
export const emailConversationManager = new EmailConversationManager();