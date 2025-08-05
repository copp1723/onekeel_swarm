import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { LeadsRepository, CommunicationsRepository } from '../../db';

const router = Router();

interface MailgunEventData {
  event: 'delivered' | 'opened' | 'clicked' | 'complained' | 'bounced' | 'failed' | 'unsubscribed';
  timestamp: number;
  id: string;
  'log-level': string;
  'event-data': {
    event: string;
    timestamp: number;
    id: string;
    recipient: string;
    'message-id': string;
    'user-variables'?: Record<string, any>;
    severity?: 'permanent' | 'temporary';
    reason?: string;
    code?: string;
    error?: string;
    url?: string;
    'client-info'?: {
      'client-os': string;
      'device-type': string;
      'client-name': string;
      'client-type': string;
      'user-agent': string;
    };
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    tags?: string[];
  };
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
}

export class MailgunWebhookHandler {
  private webhookSigningKey: string;

  constructor() {
    this.webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '';
    if (!this.webhookSigningKey) {
      logger.warn('Mailgun webhook signing key not configured');
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(timestamp: string, token: string, signature: string): boolean {
    if (!this.webhookSigningKey) {
      logger.warn('Cannot verify webhook signature - no signing key');
      return false;
    }

    const encodedToken = crypto
      .createHmac('sha256', this.webhookSigningKey)
      .update(timestamp.concat(token))
      .digest('hex');

    return encodedToken === signature;
  }

  /**
   * Process webhook event
   */
  async processEvent(event: MailgunEventData): Promise<void> {
    const eventData = event['event-data'];
    const eventType = eventData.event;
    const recipient = eventData.recipient;
    const messageId = eventData['message-id'];
    const timestamp = new Date(eventData.timestamp * 1000);

    logger.info('Processing Mailgun webhook event', {
      event: eventType,
      recipient,
      messageId,
      timestamp
    });

    try {
      switch (eventType) {
        case 'delivered':
          await this.handleDelivered(recipient, messageId, timestamp);
          break;

        case 'opened':
          await this.handleOpened(recipient, messageId, timestamp, eventData['client-info']);
          break;

        case 'clicked':
          await this.handleClicked(recipient, messageId, timestamp, eventData.url);
          break;

        case 'complained':
          await this.handleComplained(recipient, messageId, timestamp);
          break;

        case 'bounced':
        case 'failed':
          await this.handleFailed(
            recipient, 
            messageId, 
            timestamp,
            eventData.severity || 'temporary',
            eventData.reason || eventData.error || 'Unknown error',
            eventData.code
          );
          break;

        case 'unsubscribed':
          await this.handleUnsubscribed(recipient, messageId, timestamp);
          break;

        default:
          logger.warn('Unknown webhook event type', { eventType });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', {
        event: eventType,
        recipient,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async handleDelivered(email: string, messageId: string, timestamp: Date) {
    logger.info('Email delivered', { email, messageId });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      status: 'delivered',
      deliveredAt: timestamp
    });

    // Update lead email status
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      await LeadsRepository.updateEmailStatus(lead.id, {
        lastEmailDelivered: timestamp,
        emailDeliverable: true
      });
    }
  }

  private async handleOpened(
    email: string, 
    messageId: string, 
    timestamp: Date,
    clientInfo?: any
  ) {
    logger.info('Email opened', { 
      email, 
      messageId,
      device: clientInfo?.['device-type'],
      client: clientInfo?.['client-name']
    });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      openedAt: timestamp,
      openCount: 1, // Increment if already opened
      clientInfo
    });

    // Update lead engagement
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      await LeadsRepository.updateEngagement(lead.id, {
        lastEmailOpened: timestamp,
        emailEngagement: 'active'
      });
    }
  }

  private async handleClicked(
    email: string,
    messageId: string,
    timestamp: Date,
    url?: string
  ) {
    logger.info('Email link clicked', { email, messageId, url });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      clickedAt: timestamp,
      clickedLinks: [url || ''],
      clickCount: 1
    });

    // Update lead engagement
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      await LeadsRepository.updateEngagement(lead.id, {
        lastEmailClicked: timestamp,
        emailEngagement: 'highly_engaged'
      });
    }
  }

  private async handleComplained(email: string, messageId: string, timestamp: Date) {
    logger.warn('Spam complaint received', { email, messageId });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      complainedAt: timestamp,
      status: 'complained'
    });

    // Mark lead as complained
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      await LeadsRepository.updateEmailStatus(lead.id, {
        emailStatus: 'complained',
        emailComplainedAt: timestamp,
        doNotEmail: true
      });

      // Add note about complaint
      await LeadsRepository.addNote(lead.id, {
        type: 'system',
        content: 'Email marked as spam by recipient',
        metadata: { messageId, timestamp }
      });
    }
  }

  private async handleFailed(
    email: string,
    messageId: string,
    timestamp: Date,
    severity: 'permanent' | 'temporary',
    reason: string,
    code?: string
  ) {
    logger.error('Email delivery failed', {
      email,
      messageId,
      severity,
      reason,
      code
    });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      status: 'failed',
      failedAt: timestamp,
      failureReason: reason,
      failureCode: code,
      failureSeverity: severity
    });

    // Update lead based on severity
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      if (severity === 'permanent') {
        // Hard bounce - mark as undeliverable
        await LeadsRepository.updateEmailStatus(lead.id, {
          emailStatus: 'bounced',
          emailBouncedAt: timestamp,
          emailDeliverable: false,
          bounceReason: reason,
          doNotEmail: true
        });

        await LeadsRepository.addNote(lead.id, {
          type: 'system',
          content: `Email permanently bounced: ${reason}`,
          metadata: { messageId, code, timestamp }
        });
      } else {
        // Soft bounce - temporary failure
        await LeadsRepository.updateEmailStatus(lead.id, {
          lastEmailFailed: timestamp,
          softBounceCount: (lead.softBounceCount || 0) + 1,
          lastBounceReason: reason
        });

        // Mark as undeliverable after 3 soft bounces
        if ((lead.softBounceCount || 0) >= 2) {
          await LeadsRepository.updateEmailStatus(lead.id, {
            emailDeliverable: false,
            doNotEmail: true
          });

          await LeadsRepository.addNote(lead.id, {
            type: 'system',
            content: 'Email marked undeliverable after multiple soft bounces',
            metadata: { bounceCount: lead.softBounceCount + 1 }
          });
        }
      }
    }
  }

  private async handleUnsubscribed(email: string, messageId: string, timestamp: Date) {
    logger.info('Email unsubscribed', { email, messageId });

    // Update communication record
    await CommunicationsRepository.updateByMessageId(messageId, {
      unsubscribedAt: timestamp,
      status: 'unsubscribed'
    });

    // Mark lead as unsubscribed
    const lead = await LeadsRepository.findByEmail(email);
    if (lead) {
      await LeadsRepository.updateEmailStatus(lead.id, {
        emailStatus: 'unsubscribed',
        emailUnsubscribedAt: timestamp,
        doNotEmail: true
      });

      await LeadsRepository.addNote(lead.id, {
        type: 'system',
        content: 'Unsubscribed from email communications',
        metadata: { messageId, timestamp }
      });
    }
  }
}

// Create handler instance
const webhookHandler = new MailgunWebhookHandler();

// Webhook endpoint
router.post('/mailgun', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());
    const { signature } = body;

    // Verify signature
    if (!webhookHandler.verifySignature(
      signature.timestamp,
      signature.token,
      signature.signature
    )) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        timestamp: signature.timestamp
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process event asynchronously
    webhookHandler.processEvent(body).catch(error => {
      logger.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

    // Respond immediately
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(400).json({ error: 'Bad request' });
  }
});

// Health check endpoint for Mailgun
router.get('/mailgun/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;