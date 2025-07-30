import { logger } from '../utils/logger';
import { db } from '../db/client';
import { communications, leads, conversations } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface EmailReply {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: any[];
  date: Date;
}

export class EmailReplyDetector {
  private isRunning = false;
  private replyQueue: EmailReply[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('Email reply detector started');
    
    // Start processing replies every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueuedReplies();
    }, 10000);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    logger.info('Email reply detector stopped');
  }

  async hasLeadReplied(leadId: string): Promise<boolean> {
    try {
      // Check if there are any inbound communications from this lead
      const [reply] = await db
        .select()
        .from(communications)
        .where(
          and(
            eq(communications.leadId, leadId),
            eq(communications.direction, 'inbound')
          )
        )
        .limit(1);
      
      return !!reply;
    } catch (error) {
      logger.error('Error checking if lead has replied', { leadId, error });
      return false;
    }
  }

  async detectReply(subject: string, body: string): Promise<boolean> {
    // Simple reply detection logic
    const replyPatterns = [
      /^(re:|fwd:|fw:)/i,
      /wrote:/i,
      /from:.*sent:/i,
      /original message/i
    ];
    
    const text = (subject + ' ' + body).toLowerCase();
    return replyPatterns.some(pattern => pattern.test(text));
  }

  async extractOriginalMessage(body: string): Promise<string> {
    // Extract original message from reply body
    const separators = [
      /-----original message-----/i,
      /from:.*sent:/i,
      /wrote:/i,
      /on.*wrote:/i
    ];
    
    for (const separator of separators) {
      const match = body.match(separator);
      if (match) {
        return body.substring(0, match.index).trim();
      }
    }
    
    return body;
  }

  async processReply(emailData: EmailReply): Promise<void> {
    logger.info('Processing email reply', { 
      from: emailData.from, 
      subject: emailData.subject 
    });
    
    try {
      // Extract email address from 'from' field (handle "Name <email>" format)
      const fromEmail = this.extractEmailAddress(emailData.from);
      
      // Find the lead by email
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.email, fromEmail))
        .limit(1);
      
      if (!lead) {
        logger.warn('No lead found for email reply', { email: fromEmail });
        // Could create a new lead here if desired
        return;
      }
      
      // Extract the actual reply content (remove quoted text)
      const replyContent = await this.extractOriginalMessage(emailData.body);
      
      // Save the communication record
      const [communication] = await db
        .insert(communications)
        .values({
          leadId: lead.id,
          channel: 'email',
          direction: 'inbound',
          status: 'received',
          subject: emailData.subject,
          content: replyContent,
          externalId: emailData.messageId,
          metadata: {
            fullBody: emailData.body,
            inReplyTo: emailData.inReplyTo,
            references: emailData.references,
            attachments: emailData.attachments?.length || 0
          },
          createdAt: emailData.date
        })
        .returning();
      
      // Update lead's last contacted timestamp
      await db
        .update(leads)
        .set({ lastContactedAt: emailData.date })
        .where(eq(leads.id, lead.id));
      
      // Find or create active conversation
      await this.updateOrCreateConversation(lead.id, replyContent, emailData);
      
      // Trigger any automated responses or workflows
      await this.triggerReplyWorkflows(lead, communication);
      
      logger.info('Email reply processed successfully', { 
        leadId: lead.id, 
        communicationId: communication.id 
      });
    } catch (error) {
      logger.error('Error processing email reply', { error, emailData });
      throw error;
    }
  }
  
  private extractEmailAddress(fromField: string): string {
    const match = fromField.match(/<(.+)>/);
    return match ? match[1] : fromField;
  }
  
  private async updateOrCreateConversation(
    leadId: string, 
    content: string, 
    emailData: EmailReply
  ): Promise<void> {
    try {
      // Find active email conversation
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.leadId, leadId),
            eq(conversations.channel, 'email'),
            eq(conversations.status, 'active')
          )
        )
        .orderBy(desc(conversations.startedAt))
        .limit(1);
      
      if (conversation) {
        // Add message to existing conversation
        const messages = (conversation.messages as any[]) || [];
        messages.push({
          role: 'user',
          content,
          timestamp: emailData.date.toISOString()
        });
        
        await db
          .update(conversations)
          .set({
            messages,
            lastMessageAt: emailData.date
          })
          .where(eq(conversations.id, conversation.id));
      } else {
        // Create new conversation
        await db
          .insert(conversations)
          .values({
            leadId,
            channel: 'email',
            agentType: 'email',
            status: 'active',
            messages: [{
              role: 'user',
              content,
              timestamp: emailData.date.toISOString()
            }],
            startedAt: emailData.date,
            lastMessageAt: emailData.date,
            metadata: {
              subject: emailData.subject
            }
          });
      }
    } catch (error) {
      logger.error('Error updating conversation', { error, leadId });
    }
  }
  
  private async triggerReplyWorkflows(lead: any, communication: any): Promise<void> {
    // This is where you would trigger any automated workflows
    // For example:
    // - Notify assigned agent
    // - Update lead qualification score
    // - Trigger auto-response if configured
    // - Update campaign status
    
    logger.debug('Triggering reply workflows', { 
      leadId: lead.id, 
      communicationId: communication.id 
    });
    
    // Example: Update lead status if it was 'new'
    if (lead.status === 'new') {
      await db
        .update(leads)
        .set({ status: 'contacted' })
        .where(eq(leads.id, lead.id));
    }
  }
  
  async queueReply(emailData: EmailReply): Promise<void> {
    this.replyQueue.push(emailData);
    logger.debug('Email reply queued', { queueSize: this.replyQueue.length });
  }
  
  private async processQueuedReplies(): Promise<void> {
    if (this.replyQueue.length === 0) return;
    
    const replies = [...this.replyQueue];
    this.replyQueue = [];
    
    logger.info(`Processing ${replies.length} queued replies`);
    
    for (const reply of replies) {
      try {
        await this.processReply(reply);
      } catch (error) {
        logger.error('Failed to process queued reply', { error, reply });
        // Could re-queue or send to dead letter queue
      }
    }
  }
}

export const emailReplyDetector = new EmailReplyDetector();