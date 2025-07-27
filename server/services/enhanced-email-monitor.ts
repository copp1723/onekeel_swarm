import imaps, { ImapSimple } from 'imap-simple';
import { simpleParser } from 'mailparser';
import { db } from '../db/client';
import { leads, campaigns } from '../db/schema';
import { logger } from '../utils/logger';
import { campaignExecutionEngine } from './campaign-execution-engine';
import { eq } from 'drizzle-orm';

import 'dotenv/config';
import * as crypto from 'crypto';

interface EmailTrigger {
  subject: string;
  from: string;
  campaignId?: string;
  action: 'start_campaign' | 'stop_campaign' | 'create_lead';
}

interface LeadData {
  email: string;
  name?: string;
  phone?: string;
  metadata: Record<string, any>;
}

class EnhancedEmailMonitor {
  private connection: ImapSimple | null = null;
  private triggers: EmailTrigger[] = [];
  private isRunning = false;

  constructor() {
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default email triggers for campaign automation
   */
  private initializeDefaultTriggers() {
    this.triggers = [
      {
        subject: 'START CAMPAIGN',
        from: process.env.CAMPAIGN_TRIGGER_EMAIL || 'campaigns@completecarloans.com',
        action: 'start_campaign'
      },
      {
        subject: 'STOP CAMPAIGN',
        from: process.env.CAMPAIGN_TRIGGER_EMAIL || 'campaigns@completecarloans.com',
        action: 'stop_campaign'
      },
      {
        subject: 'NEW LEAD',
        from: process.env.LEAD_TRIGGER_EMAIL || 'leads@completecarloans.com',
        action: 'create_lead'
      }
    ];
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Enhanced email monitor is already running');
      return;
    }

    // Check if IMAP configuration is available
    if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      logger.info('Enhanced email monitor not started - IMAP configuration missing (IMAP_HOST, IMAP_USER, IMAP_PASSWORD)');
      return;
    }

    const config = {
      imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT) || 993,
        tls: true,
        authTimeout: 3000,
        connTimeout: 10000,
      },
      onmail: this.handleNewMail.bind(this),
    };

    try {
      this.connection = await imaps.connect(config);
      await this.connection.openBox('INBOX');
      this.isRunning = true;
      logger.info('Enhanced email monitor connected and listening for campaign triggers');
    } catch (error) {
      logger.error('Failed to start enhanced email monitor:', { error: (error as Error).message });
      throw error;
    }
  }

  private async handleNewMail(numNewMails: number) {
    if (!this.connection || !this.isRunning) return;

    try {
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: [''], markSeen: true };
      const messages = await this.connection.search(searchCriteria, fetchOptions);

      for (const message of messages) {
        const all = message.parts.find((part: any) => part.which === '');
        if (!all?.body) continue;

        const parsed = await simpleParser(all.body);
        await this.processEmail(parsed);
      }
    } catch (error) {
      logger.error('Error handling new mail:', { error: (error as Error).message });
    }
  }

  /**
   * Process incoming email for triggers and lead creation
   */
  private async processEmail(parsed: any): Promise<void> {
    try {
      const fromEmail = parsed.from?.value[0].address || '';
      const subject = parsed.subject || '';
      const body = parsed.text || '';

      logger.info('Processing email', { from: fromEmail, subject });

      // Check for campaign triggers
      const trigger = this.triggers.find(t => 
        subject.toUpperCase().includes(t.subject.toUpperCase()) &&
        fromEmail.toLowerCase().includes(t.from.toLowerCase())
      );

      if (trigger) {
        await this.handleTrigger(trigger, parsed);
        return;
      }

      // Check if this is a potential lead email
      if (this.isLeadEmail(parsed)) {
        await this.createLeadFromEmail(parsed);
      }

    } catch (error) {
      logger.error('Error processing email:', { error: (error as Error).message });
    }
  }

  /**
   * Handle campaign trigger emails
   */
  private async handleTrigger(trigger: EmailTrigger, parsed: any): Promise<void> {
    try {
      const body = parsed.text || '';
      
      logger.info('Processing campaign trigger', { 
        action: trigger.action,
        subject: parsed.subject 
      });

      switch (trigger.action) {
        case 'start_campaign':
          await this.handleStartCampaignTrigger(body);
          break;
        case 'stop_campaign':
          await this.handleStopCampaignTrigger(body);
          break;
        case 'create_lead':
          await this.createLeadFromEmail(parsed);
          break;
      }

    } catch (error) {
      logger.error('Error handling trigger:', { 
        error: (error as Error).message,
        action: trigger.action 
      });
    }
  }

  /**
   * Handle start campaign trigger
   * Expected format: "START CAMPAIGN [campaign_id] FOR LEADS [lead_id1,lead_id2,...]"
   */
  private async handleStartCampaignTrigger(body: string): Promise<void> {
    try {
      // Parse campaign ID and lead IDs from email body
      const campaignMatch = body.match(/CAMPAIGN\s+([^\s]+)/i);
      const leadsMatch = body.match(/FOR\s+LEADS\s+([^\n\r]+)/i);

      if (!campaignMatch) {
        logger.warn('No campaign ID found in trigger email');
        return;
      }

      const campaignId = campaignMatch[1].trim();
      
      // If specific leads are mentioned, use those; otherwise auto-assign
      if (leadsMatch) {
        const leadIds = leadsMatch[1]
          .split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0);

        if (leadIds.length > 0) {
          await campaignExecutionEngine.triggerCampaign(campaignId, leadIds);
          logger.info('Campaign triggered via email', { campaignId, leadCount: leadIds.length });
        }
      } else {
        // Auto-assign available leads
        await campaignExecutionEngine.autoAssignLeads();
        logger.info('Auto-assignment triggered via email', { campaignId });
      }

    } catch (error) {
      logger.error('Error handling start campaign trigger:', { error: (error as Error).message });
    }
  }

  /**
   * Handle stop campaign trigger
   */
  private async handleStopCampaignTrigger(body: string): Promise<void> {
    try {
      const campaignMatch = body.match(/CAMPAIGN\s+([^\s]+)/i);
      
      if (!campaignMatch) {
        logger.warn('No campaign ID found in stop trigger email');
        return;
      }

      const campaignId = campaignMatch[1].trim();
      const cancelledCount = await campaignExecutionEngine.cancelExecutions(campaignId);
      
      logger.info('Campaign stopped via email', { campaignId, cancelledCount });

    } catch (error) {
      logger.error('Error handling stop campaign trigger:', { error: (error as Error).message });
    }
  }

  /**
   * Check if email appears to be from a potential lead
   */
  private isLeadEmail(parsed: any): boolean {
    const fromEmail = parsed.from?.value[0].address || '';
    const subject = parsed.subject || '';
    const body = parsed.text || '';

    // Skip emails from known system addresses
    const systemDomains = [
      'completecarloans.com',
      'noreply',
      'no-reply',
      'mailer-daemon',
      'postmaster'
    ];

    if (systemDomains.some(domain => fromEmail.toLowerCase().includes(domain))) {
      return false;
    }

    // Look for lead indicators in subject or body
    const leadKeywords = [
      'loan', 'financing', 'car', 'auto', 'vehicle', 'credit',
      'application', 'interested', 'quote', 'rate', 'payment'
    ];

    const text = (subject + ' ' + body).toLowerCase();
    return leadKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Create lead from email
   */
  private async createLeadFromEmail(parsed: any): Promise<void> {
    try {
      const fromEmail = parsed.from?.value[0].address || '';
      const fromName = parsed.from?.value[0].name || '';
      
      const leadData: LeadData = {
        email: fromEmail,
        name: fromName || this.extractNameFromEmail(fromEmail),
        metadata: {
          source: 'email',
          originalSubject: parsed.subject,
          originalBody: parsed.text,
          receivedAt: new Date().toISOString()
        }
      };

      // Extract phone number if present in email
      const phoneMatch = parsed.text?.match(/(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
      if (phoneMatch) {
        leadData.phone = phoneMatch[1];
      }

      await this.createLead(leadData);
      
      // Auto-assign to campaign if enabled
      await campaignExecutionEngine.autoAssignLeads();

    } catch (error) {
      logger.error('Failed to create lead from email:', { error: (error as Error).message });
    }
  }

  /**
   * Extract name from email address
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Create lead in database
   */
  private async createLead(data: LeadData): Promise<void> {
    try {
      const leadId = crypto.randomUUID();
      
      await db.insert(leads).values({
        id: leadId,
        name: data.name || 'Unknown Lead',
        email: data.email,
        phone: data.phone,
        source: 'email',
        status: 'new',
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Created lead from email', { 
        leadId, 
        email: data.email,
        name: data.name 
      });

    } catch (error) {
      logger.error('Failed to create lead in database:', { error: (error as Error).message });
    }
  }

  /**
   * Add custom trigger
   */
  addTrigger(trigger: EmailTrigger): void {
    this.triggers.push(trigger);
    logger.info('Added email trigger', { trigger });
  }

  /**
   * Remove trigger
   */
  removeTrigger(subject: string, from: string): boolean {
    const initialLength = this.triggers.length;
    this.triggers = this.triggers.filter(t => 
      !(t.subject === subject && t.from === from)
    );
    
    const removed = this.triggers.length < initialLength;
    if (removed) {
      logger.info('Removed email trigger', { subject, from });
    }
    
    return removed;
  }

  /**
   * Get current triggers
   */
  getTriggers(): EmailTrigger[] {
    return [...this.triggers];
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.connection) {
      this.connection.end();
      this.connection = null;
      logger.info('Enhanced email monitor stopped');
    }
  }
}

export const enhancedEmailMonitor = new EnhancedEmailMonitor();
export default enhancedEmailMonitor;