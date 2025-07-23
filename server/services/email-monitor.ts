import imaps, { ImapSimple } from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';
import { db } from '../db';
import { leads, campaigns } from '../db/schema';
import { logger } from '../utils/logger';
import { LeadProcessor } from './lead-processor';
import { CampaignsRepository, LeadsRepository } from '../db';
import { eq, and, or, like } from 'drizzle-orm';
import { emailReplyDetector } from './email-reply-detector';

import 'dotenv/config';
import * as crypto from 'crypto';

interface LeadData {
  email: string;
  name?: string;
  phone?: string;
  metadata?: any;
}

interface EmailTriggerRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    from?: string | string[];
    subject?: string | RegExp;
    body?: string | RegExp;
    hasAttachment?: boolean;
  };
  actions: {
    createLead: boolean;
    assignCampaign?: string;
    addTags?: string[];
    setSource?: string;
    setPriority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

class EmailMonitor {
  private connection: ImapSimple | null = null;
  private leadProcessor: LeadProcessor;
  private triggerRules: EmailTriggerRule[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.leadProcessor = new LeadProcessor();
    this.loadTriggerRules();
  }

  async start() {
    // Check if IMAP configuration is available
    if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      logger.info('Email monitor not started - IMAP configuration missing (IMAP_HOST, IMAP_USER, IMAP_PASSWORD)');
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
    };

    try {
      this.connection = await imaps.connect(config);
      await this.connection.openBox('INBOX');
      logger.info('Email monitor connected and listening');
      
      // Start periodic checking for new emails
      this.startPeriodicCheck();
      
      // Also set up real-time monitoring if supported
      if (this.connection.imap) {
        this.connection.imap.on('mail', (numNewMails: number) => {
          this.handleNewMail(numNewMails);
        });
      }
    } catch (error) {
      logger.error('Failed to start email monitor:', error as Error);
      throw error;
    }
  }

  private startPeriodicCheck() {
    // Check for new emails every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkForNewEmails();
    }, 30000);
  }

  private async checkForNewEmails() {
    if (!this.connection) return;

    try {
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { 
        bodies: ['HEADER', 'TEXT', ''], 
        markSeen: false,
        struct: true 
      };
      
      const messages = await this.connection.search(searchCriteria, fetchOptions);
      
      if (messages.length > 0) {
        logger.info(`Found ${messages.length} new emails to process`);
        await this.processEmails(messages);
      }
    } catch (error) {
      logger.error('Error checking for new emails:', error as Error);
    }
  }

  private async handleNewMail(numNewMails: number) {
    logger.info(`New mail notification: ${numNewMails} new emails`);
    await this.checkForNewEmails();
  }

  private async processEmails(messages: any[]) {
    for (const message of messages) {
      try {
        const all = message.parts.find((part: any) => part.which === '');
        if (!all?.body) continue;

        const parsed = await simpleParser(all.body);
        const processResult = await this.processEmail(parsed);
        
        if (processResult.processed) {
          // Mark as seen after successful processing
          const uid = message.attributes.uid;
          await this.connection!.addFlags(uid, ['\\Seen']);
        }
      } catch (error) {
        logger.error('Error processing individual email:', error as Error);
      }
    }
  }

  private async processEmail(email: ParsedMail): Promise<{ processed: boolean; leadId?: string }> {
    const fromAddress = email.from?.value[0]?.address || '';
    const fromName = email.from?.value[0]?.name || '';
    const subject = email.subject || '';
    const textBody = email.text || '';
    const htmlBody = email.html || '';
    const hasAttachments = (email.attachments?.length || 0) > 0;

    logger.info('Processing email', {
      from: fromAddress,
      subject: subject.substring(0, 50),
      hasAttachments
    });

    // Check if this is a reply to an existing conversation
    const isReply = this.isEmailReply(email);
    if (isReply) {
      await emailReplyDetector.processReply({
        messageId: email.messageId || '',
        from: fromAddress,
        to: email.to?.value[0]?.address || '',
        subject,
        content: textBody,
        timestamp: email.date || new Date()
      });
      return { processed: true };
    }

    // Check trigger rules
    const matchedRule = this.findMatchingRule(email);
    
    if (!matchedRule) {
      logger.debug('No matching trigger rule found for email', { from: fromAddress });
      return { processed: false };
    }

    logger.info('Email matched trigger rule', { 
      rule: matchedRule.name,
      from: fromAddress 
    });

    // Extract lead data
    const leadData = this.extractLeadData(email, matchedRule);

    // Check if lead already exists
    let lead = await this.findExistingLead(leadData.email);
    
    if (!lead && matchedRule.actions.createLead) {
      // Create new lead
      lead = await this.createLead(leadData);
      logger.info('Created new lead from email', { 
        leadId: lead.id,
        email: lead.email 
      });
    } else if (lead) {
      // Update existing lead
      await this.updateLead(lead.id, leadData);
      logger.info('Updated existing lead from email', { 
        leadId: lead.id,
        email: lead.email 
      });
    }

    if (!lead) {
      return { processed: true };
    }

    // Apply rule actions
    if (matchedRule.actions.assignCampaign) {
      await this.assignLeadToCampaign(lead.id, matchedRule.actions.assignCampaign);
    }

    if (matchedRule.actions.addTags) {
      await this.addTagsToLead(lead.id, matchedRule.actions.addTags);
    }

    if (matchedRule.actions.setPriority) {
      await this.setLeadPriority(lead.id, matchedRule.actions.setPriority);
    }

    // Process lead through agent system
    await this.leadProcessor.processNewLead(lead, true);

    return { processed: true, leadId: lead.id };
  }

  private findMatchingRule(email: ParsedMail): EmailTriggerRule | null {
    const fromAddress = email.from?.value[0]?.address || '';
    const subject = email.subject || '';
    const body = email.text || email.html || '';

    for (const rule of this.triggerRules) {
      if (!rule.enabled) continue;

      let matches = true;

      // Check from condition
      if (rule.conditions.from) {
        const fromPatterns = Array.isArray(rule.conditions.from) 
          ? rule.conditions.from 
          : [rule.conditions.from];
        
        matches = fromPatterns.some(pattern => 
          fromAddress.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (!matches) continue;
      }

      // Check subject condition
      if (rule.conditions.subject) {
        if (rule.conditions.subject instanceof RegExp) {
          matches = rule.conditions.subject.test(subject);
        } else {
          matches = subject.toLowerCase().includes(rule.conditions.subject.toLowerCase());
        }
        
        if (!matches) continue;
      }

      // Check body condition
      if (rule.conditions.body) {
        if (rule.conditions.body instanceof RegExp) {
          matches = rule.conditions.body.test(body);
        } else {
          matches = body.toLowerCase().includes(rule.conditions.body.toLowerCase());
        }
        
        if (!matches) continue;
      }

      // Check attachment condition
      if (rule.conditions.hasAttachment !== undefined) {
        const hasAttachments = (email.attachments?.length || 0) > 0;
        matches = rule.conditions.hasAttachment === hasAttachments;
        
        if (!matches) continue;
      }

      // All conditions matched
      return rule;
    }

    return null;
  }

  private extractLeadData(email: ParsedMail, rule: EmailTriggerRule): LeadData {
    const fromAddress = email.from?.value[0]?.address || '';
    const fromName = email.from?.value[0]?.name || '';
    
    // Try to extract phone number from email body
    const phoneRegex = /(\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
    const phoneMatch = (email.text || '').match(phoneRegex);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    return {
      email: fromAddress,
      name: fromName || this.extractNameFromEmail(fromAddress),
      phone,
      metadata: {
        emailSubject: email.subject,
        emailBody: email.text?.substring(0, 1000),
        emailDate: email.date,
        source: rule.actions.setSource || 'email-monitor',
        triggerRule: rule.name,
        hasAttachments: (email.attachments?.length || 0) > 0,
        messageId: email.messageId
      }
    };
  }

  private extractNameFromEmail(email: string): string {
    const [localPart] = email.split('@');
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async findExistingLead(email: string): Promise<any> {
    const leads = await LeadsRepository.findAll({ limit: 1000 });
    return leads.find((l: any) => l.email === email);
  }

  private async createLead(data: LeadData) {
    const newLead = {
      id: crypto.randomUUID(),
      name: data.name || 'Unnamed Lead',
      email: data.email,
      phone: data.phone,
      source: data.metadata?.source || 'email',
      status: 'new' as const,
      metadata: data.metadata,
      qualificationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(leads).values(newLead);
    logger.info(`Created new lead from email: ${newLead.id}`);
    
    return newLead;
  }

  private async updateLead(leadId: string, data: LeadData) {
    const updates: any = {
      updatedAt: new Date()
    };

    if (data.phone) {
      updates.phone = data.phone;
    }

    if (data.metadata) {
      // Merge metadata
      const lead = await LeadsRepository.findById(leadId);
      if (lead) {
        updates.metadata = {
          ...lead.metadata,
          ...data.metadata,
          lastEmailReceived: new Date()
        };
      }
    }

    await db.update(leads)
      .set(updates)
      .where(eq(leads.id, leadId));
  }

  private async assignLeadToCampaign(leadId: string, campaignId: string) {
    try {
      await db.update(leads)
        .set({ 
          campaignId,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));
      
      logger.info('Assigned lead to campaign', { leadId, campaignId });
    } catch (error) {
      logger.error('Failed to assign lead to campaign', error as Error);
    }
  }

  private async addTagsToLead(leadId: string, tags: string[]) {
    try {
      const lead = await LeadsRepository.findById(leadId);
      if (lead) {
        const existingTags = lead.metadata?.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])];
        
        await db.update(leads)
          .set({ 
            metadata: {
              ...lead.metadata,
              tags: newTags
            },
            updatedAt: new Date()
          })
          .where(eq(leads.id, leadId));
        
        logger.info('Added tags to lead', { leadId, tags });
      }
    } catch (error) {
      logger.error('Failed to add tags to lead', error as Error);
    }
  }

  private async setLeadPriority(leadId: string, priority: string) {
    try {
      const lead = await LeadsRepository.findById(leadId);
      if (lead) {
        await db.update(leads)
          .set({ 
            metadata: {
              ...lead.metadata,
              priority
            },
            updatedAt: new Date()
          })
          .where(eq(leads.id, leadId));
        
        logger.info('Set lead priority', { leadId, priority });
      }
    } catch (error) {
      logger.error('Failed to set lead priority', error as Error);
    }
  }

  private async loadTriggerRules() {
    // For now, just use default rules since emailTriggerRules table doesn't exist yet
    this.triggerRules = this.getDefaultTriggerRules();
    logger.info(`Loaded ${this.triggerRules.length} email trigger rules`);
  }

  private getDefaultTriggerRules(): EmailTriggerRule[] {
    return [
      {
        id: 'auto-loan-inquiry',
        name: 'Auto Loan Inquiry',
        enabled: true,
        conditions: {
          subject: /auto loan|car loan|vehicle financing/i,
        },
        actions: {
          createLead: true,
          assignCampaign: 'auto-loan-campaign',
          setSource: 'email-inquiry',
          setPriority: 'high'
        }
      },
      {
        id: 'contact-form',
        name: 'Contact Form Submission',
        enabled: true,
        conditions: {
          from: ['noreply@', 'contact@', 'form@'],
          subject: /contact form|inquiry|submission/i
        },
        actions: {
          createLead: true,
          setSource: 'contact-form',
          addTags: ['website-lead']
        }
      },
      {
        id: 'general-inquiry',
        name: 'General Inquiry',
        enabled: true,
        conditions: {
          // Matches any email not caught by other rules
        },
        actions: {
          createLead: true,
          setSource: 'email',
          setPriority: 'normal'
        }
      }
    ];
  }

  async addTriggerRule(rule: EmailTriggerRule) {
    this.triggerRules.push(rule);
    logger.info('Added new email trigger rule', { rule: rule.name });
  }

  async removeTriggerRule(ruleId: string) {
    this.triggerRules = this.triggerRules.filter(r => r.id !== ruleId);
    logger.info('Removed email trigger rule', { ruleId });
  }

  async updateTriggerRule(ruleId: string, updates: Partial<EmailTriggerRule>) {
    const index = this.triggerRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.triggerRules[index] = { ...this.triggerRules[index], ...updates };
      logger.info('Updated email trigger rule', { ruleId });
    }
  }

  getTriggerRules(): EmailTriggerRule[] {
    return this.triggerRules;
  }

  /**
   * Check if an email is a reply to an existing conversation
   */
  private isEmailReply(email: ParsedMail): boolean {
    const subject = email.subject || '';
    const inReplyTo = email.inReplyTo;
    const references = email.references;
    
    // Check for common reply indicators
    const replyIndicators = ['re:', 'reply:', 'response:', 'answer:'];
    const hasReplyIndicator = replyIndicators.some(indicator => 
      subject.toLowerCase().startsWith(indicator)
    );
    
    // Check for email headers that indicate a reply
    const hasReplyHeaders = !!(inReplyTo || references);
    
    return hasReplyIndicator || hasReplyHeaders;
  }

  /**
   * Check if a lead has replied to emails
   */
  async hasLeadReplied(leadId: string): Promise<boolean> {
    return await emailReplyDetector.hasLeadReplied(leadId);
  }

  async stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.connection) {
      this.connection.end();
      this.connection = null;
      logger.info('Email monitor stopped');
    }
  }
}

export const emailMonitor = new EmailMonitor();