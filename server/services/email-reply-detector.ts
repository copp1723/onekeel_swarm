import { logger } from '../utils/logger.js';
import { db } from '../db/client.js';
import { leads, communications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

interface EmailReply {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  leadId?: string;
}

export class EmailReplyDetector {
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring for email replies
   */
  async start(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('Starting email reply monitoring');

    // Check for replies every 5 minutes
    this.monitorInterval = setInterval(async () => {
      await this.checkForReplies();
    }, 5 * 60 * 1000);

    // Check immediately
    await this.checkForReplies();
  }

  /**
   * Stop monitoring for email replies
   */
  async stop(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    logger.info('Stopped email reply monitoring');
  }

  /**
   * Check for new email replies
   */
  private async checkForReplies(): Promise<void> {
    try {
      // In a real implementation, this would connect to your email service
      // (Mailgun, Gmail API, IMAP, etc.) to check for new replies
      
      // For now, we'll simulate checking by looking for webhook data
      // or checking a mailbox via IMAP
      
      logger.debug('Checking for email replies...');
      
      // This is where you would implement actual email checking logic
      // For example, with Mailgun webhooks or IMAP polling
      
    } catch (error) {
      logger.error('Error checking for email replies', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Process an incoming email reply (called by webhook or IMAP)
   */
  async processReply(reply: EmailReply): Promise<void> {
    try {
      // Find the lead associated with this email
      const leadId = await this.findLeadByEmail(reply.from);
      if (!leadId) {
        logger.warn('Received reply from unknown email', { from: reply.from });
        return;
      }

      // Record the reply as a communication
      await db.insert(communications).values({
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId: leadId,
        channel: 'email',
        direction: 'inbound',
        content: reply.subject,
        status: 'received',
        externalId: reply.messageId,
        metadata: {
          from: reply.from,
          to: reply.to,
          subject: reply.subject,
          content: reply.content,
          timestamp: reply.timestamp.toISOString(),
          isReply: true
        }
      });

      // Update lead status to indicate they've replied
      await db.update(leads)
        .set({ 
          status: 'contacted',
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      logger.info('Email reply processed', {
        leadId,
        from: reply.from,
        subject: reply.subject
      });

      // Trigger any reply-based workflows
      await this.triggerReplyWorkflows(leadId, reply);

    } catch (error) {
      logger.error('Error processing email reply', {
        from: reply.from,
        error: (error as Error).message
      });
    }
  }

  /**
   * Find lead by email address
   */
  private async findLeadByEmail(email: string): Promise<string | null> {
    try {
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.email, email))
        .limit(1);

      return lead[0]?.id || null;
    } catch (error) {
      logger.error('Error finding lead by email', {
        email,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Check if a lead has replied to any emails
   */
  async hasLeadReplied(leadId: string): Promise<boolean> {
    try {
      const replies = await db.select()
        .from(communications)
        .where(
          and(
            eq(communications.leadId, leadId),
            eq(communications.channel, 'email'),
            eq(communications.direction, 'inbound')
          )
        )
        .limit(1);

      return replies.length > 0;
    } catch (error) {
      logger.error('Error checking if lead replied', {
        leadId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get the latest reply from a lead
   */
  async getLatestReply(leadId: string): Promise<any | null> {
    try {
      const reply = await db.select()
        .from(communications)
        .where(
          and(
            eq(communications.leadId, leadId),
            eq(communications.channel, 'email'),
            eq(communications.direction, 'inbound')
          )
        )
        .orderBy(desc(communications.createdAt))
        .limit(1);

      return reply[0] || null;
    } catch (error) {
      logger.error('Error getting latest reply', {
        leadId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Trigger workflows based on email replies
   */
  private async triggerReplyWorkflows(leadId: string, reply: EmailReply): Promise<void> {
    try {
      // Stop any active email sequences for this lead
      const { campaignExecutionEngine: _campaignExecutionEngine } = await import('./campaign-execution-engine');
      // This would stop scheduled emails for the lead
      
      // Notify human agents if configured
      const { queueManager } = await import('../workers/queue-manager');
      await queueManager.addJob('notifications', 'lead_replied', {
        leadId,
        reply: {
          from: reply.from,
          subject: reply.subject,
          timestamp: reply.timestamp
        }
      }, 2); // High priority

      logger.info('Reply workflows triggered', { leadId });

    } catch (error) {
      logger.error('Error triggering reply workflows', {
        leadId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Setup webhook endpoint for email service (Mailgun example)
   */
  static setupMailgunWebhook(app: any): void {
    app.post('/webhooks/mailgun/replies', async (req: any, res: any) => {
      try {
        const { sender, recipient, subject, 'body-plain': content, 'Message-Id': messageId } = req.body;

        const reply: EmailReply = {
          messageId,
          from: sender,
          to: recipient,
          subject,
          content,
          timestamp: new Date()
        };

        const detector = new EmailReplyDetector();
        await detector.processReply(reply);

        res.status(200).send('OK');
      } catch (error) {
        logger.error('Webhook processing error', {
          error: (error as Error).message
        });
        res.status(500).send('Error');
      }
    });
  }
}

export const emailReplyDetector = new EmailReplyDetector();