import { logger } from '../utils/logger';
import { db } from '../db';
import { leads, campaigns, communications } from '../db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

export interface EmailBlockRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  conditions: {
    // Recipient-based rules
    blockedDomains?: string[];
    blockedEmails?: string[];
    requiresOptIn?: boolean;
    
    // Content-based rules
    forbiddenWords?: string[];
    maxSubjectLength?: number;
    maxBodyLength?: number;
    requiresApproval?: boolean;
    
    // Volume-based rules
    maxEmailsPerHour?: number;
    maxEmailsPerDay?: number;
    maxEmailsPerRecipient?: number;
    
    // Time-based rules
    allowedHours?: { start: number; end: number }; // 24-hour format
    allowedDays?: number[]; // 0-6, Sunday = 0
    
    // Campaign-based rules
    campaignTypes?: string[];
    requiresCampaignApproval?: boolean;
  };
  actions: {
    block: boolean;
    quarantine: boolean;
    requireApproval: boolean;
    notifyAdmin: boolean;
    logOnly: boolean;
  };
}

export interface EmailValidationResult {
  allowed: boolean;
  blocked: boolean;
  quarantined: boolean;
  requiresApproval: boolean;
  reasons: string[];
  triggeredRules: string[];
  riskScore: number; // 0-100
}

export interface OutboundEmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  campaignId?: string;
  leadId?: string;
  templateId?: string;
  userId?: string;
  metadata?: any;
}

/**
 * Outbound Email Watchdog - Blocks/Controls emails before they're sent
 */
export class OutboundEmailWatchdog {
  private static instance: OutboundEmailWatchdog;
  private blockRules: EmailBlockRule[] = [];
  private quarantineQueue: Map<string, OutboundEmailData> = new Map();
  private approvalQueue: Map<string, OutboundEmailData> = new Map();
  private emailCounts: Map<string, { hourly: number; daily: number; lastReset: Date }> = new Map();

  private constructor() {
    this.loadDefaultRules();
    this.startCleanupTimer();
  }

  static getInstance(): OutboundEmailWatchdog {
    if (!OutboundEmailWatchdog.instance) {
      OutboundEmailWatchdog.instance = new OutboundEmailWatchdog();
    }
    return OutboundEmailWatchdog.instance;
  }

  /**
   * Main validation method - call this before sending any email
   */
  async validateOutboundEmail(emailData: OutboundEmailData): Promise<EmailValidationResult> {
    const result: EmailValidationResult = {
      allowed: true,
      blocked: false,
      quarantined: false,
      requiresApproval: false,
      reasons: [],
      triggeredRules: [],
      riskScore: 0,
    };

    try {
      // Sort rules by priority (highest first)
      const sortedRules = this.blockRules
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const ruleResult = await this.evaluateRule(rule, emailData);
        
        if (ruleResult.triggered) {
          result.triggeredRules.push(rule.name);
          result.reasons.push(...ruleResult.reasons);
          result.riskScore += ruleResult.riskScore;

          // Apply rule actions
          if (rule.actions.block) {
            result.blocked = true;
            result.allowed = false;
            logger.warn('Email blocked by rule', {
              rule: rule.name,
              to: emailData.to,
              subject: emailData.subject,
            });
          }

          if (rule.actions.quarantine) {
            result.quarantined = true;
            result.allowed = false;
            await this.quarantineEmail(emailData, rule.name);
          }

          if (rule.actions.requireApproval) {
            result.requiresApproval = true;
            result.allowed = false;
            await this.queueForApproval(emailData, rule.name);
          }

          if (rule.actions.notifyAdmin) {
            await this.notifyAdmin(emailData, rule.name, ruleResult.reasons);
          }

          // If blocked or quarantined, stop processing further rules
          if (result.blocked || result.quarantined) {
            break;
          }
        }
      }

      // Cap risk score at 100
      result.riskScore = Math.min(result.riskScore, 100);

      // Log the validation result
      logger.info('Email validation completed', {
        to: emailData.to,
        allowed: result.allowed,
        riskScore: result.riskScore,
        triggeredRules: result.triggeredRules.length,
      });

      return result;

    } catch (error) {
      logger.error('Error validating outbound email', { error, to: emailData.to });
      
      // Fail safe - block email if validation fails
      return {
        allowed: false,
        blocked: true,
        quarantined: false,
        requiresApproval: false,
        reasons: ['Validation system error'],
        triggeredRules: [],
        riskScore: 100,
      };
    }
  }

  /**
   * Add or update a block rule
   */
  addBlockRule(rule: EmailBlockRule): void {
    const existingIndex = this.blockRules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.blockRules[existingIndex] = rule;
    } else {
      this.blockRules.push(rule);
    }

    logger.info('Email block rule added/updated', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove a block rule
   */
  removeBlockRule(ruleId: string): void {
    this.blockRules = this.blockRules.filter(r => r.id !== ruleId);
    logger.info('Email block rule removed', { ruleId });
  }

  /**
   * Get all block rules
   */
  getBlockRules(): EmailBlockRule[] {
    return [...this.blockRules];
  }

  /**
   * Get quarantined emails
   */
  getQuarantinedEmails(): OutboundEmailData[] {
    return Array.from(this.quarantineQueue.values());
  }

  /**
   * Get emails pending approval
   */
  getPendingApprovalEmails(): OutboundEmailData[] {
    return Array.from(this.approvalQueue.values());
  }

  /**
   * Approve a quarantined or pending email
   */
  async approveEmail(emailId: string): Promise<boolean> {
    const email = this.approvalQueue.get(emailId) || this.quarantineQueue.get(emailId);
    
    if (!email) {
      return false;
    }

    // Remove from queues
    this.approvalQueue.delete(emailId);
    this.quarantineQueue.delete(emailId);

    logger.info('Email approved for sending', { emailId, to: email.to });
    return true;
  }

  /**
   * Permanently block an email
   */
  async blockEmail(emailId: string): Promise<boolean> {
    const email = this.approvalQueue.get(emailId) || this.quarantineQueue.get(emailId);
    
    if (!email) {
      return false;
    }

    // Remove from queues
    this.approvalQueue.delete(emailId);
    this.quarantineQueue.delete(emailId);

    logger.info('Email permanently blocked', { emailId, to: email.to });
    return true;
  }

  private async evaluateRule(rule: EmailBlockRule, emailData: OutboundEmailData): Promise<{
    triggered: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;
    let triggered = false;

    const { conditions } = rule;

    // Check blocked domains
    if (conditions.blockedDomains?.length) {
      const domain = emailData.to.split('@')[1]?.toLowerCase();
      if (domain && conditions.blockedDomains.includes(domain)) {
        triggered = true;
        reasons.push(`Blocked domain: ${domain}`);
        riskScore += 50;
      }
    }

    // Check blocked emails
    if (conditions.blockedEmails?.length) {
      if (conditions.blockedEmails.includes(emailData.to.toLowerCase())) {
        triggered = true;
        reasons.push(`Blocked email address: ${emailData.to}`);
        riskScore += 75;
      }
    }

    // Check forbidden words
    if (conditions.forbiddenWords?.length) {
      const content = (emailData.subject + ' ' + emailData.text).toLowerCase();
      const foundWords = conditions.forbiddenWords.filter(word => 
        content.includes(word.toLowerCase())
      );
      if (foundWords.length > 0) {
        triggered = true;
        reasons.push(`Forbidden words found: ${foundWords.join(', ')}`);
        riskScore += foundWords.length * 10;
      }
    }

    // Check volume limits
    if (conditions.maxEmailsPerHour || conditions.maxEmailsPerDay) {
      const counts = await this.getEmailCounts(emailData.to);
      
      if (conditions.maxEmailsPerHour && counts.hourly >= conditions.maxEmailsPerHour) {
        triggered = true;
        reasons.push(`Hourly limit exceeded: ${counts.hourly}/${conditions.maxEmailsPerHour}`);
        riskScore += 30;
      }
      
      if (conditions.maxEmailsPerDay && counts.daily >= conditions.maxEmailsPerDay) {
        triggered = true;
        reasons.push(`Daily limit exceeded: ${counts.daily}/${conditions.maxEmailsPerDay}`);
        riskScore += 40;
      }
    }

    // Check time restrictions
    if (conditions.allowedHours) {
      const now = new Date();
      const hour = now.getHours();
      const { start, end } = conditions.allowedHours;
      
      if (hour < start || hour > end) {
        triggered = true;
        reasons.push(`Outside allowed hours: ${start}-${end}, current: ${hour}`);
        riskScore += 20;
      }
    }

    return { triggered, reasons, riskScore };
  }

  private async getEmailCounts(recipient: string): Promise<{ hourly: number; daily: number }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Get hourly count
      const [hourlyResult] = await db
        .select({ count: count() })
        .from(communications)
        .where(
          and(
            eq(communications.channel, 'email'),
            eq(communications.direction, 'outbound'),
            gte(communications.createdAt, oneHourAgo)
          )
        );

      // Get daily count
      const [dailyResult] = await db
        .select({ count: count() })
        .from(communications)
        .where(
          and(
            eq(communications.channel, 'email'),
            eq(communications.direction, 'outbound'),
            gte(communications.createdAt, oneDayAgo)
          )
        );

      return {
        hourly: hourlyResult?.count || 0,
        daily: dailyResult?.count || 0,
      };
    } catch (error) {
      logger.error('Error getting email counts', { error, recipient });
      return { hourly: 0, daily: 0 };
    }
  }

  private async quarantineEmail(emailData: OutboundEmailData, ruleName: string): Promise<void> {
    const emailId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.quarantineQueue.set(emailId, emailData);

    logger.warn('Email quarantined', {
      emailId,
      to: emailData.to,
      subject: emailData.subject,
      rule: ruleName,
    });
  }

  private async queueForApproval(emailData: OutboundEmailData, ruleName: string): Promise<void> {
    const emailId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.approvalQueue.set(emailId, emailData);

    logger.info('Email queued for approval', {
      emailId,
      to: emailData.to,
      subject: emailData.subject,
      rule: ruleName,
    });
  }

  private async notifyAdmin(emailData: OutboundEmailData, ruleName: string, reasons: string[]): Promise<void> {
    // In a real implementation, this would send a notification to admins
    logger.warn('Admin notification: Email rule triggered', {
      to: emailData.to,
      subject: emailData.subject,
      rule: ruleName,
      reasons,
    });
  }

  private loadDefaultRules(): void {
    const defaultRules: EmailBlockRule[] = [
      {
        id: 'blocked-domains',
        name: 'Blocked Domains',
        enabled: true,
        priority: 100,
        conditions: {
          blockedDomains: ['spam.com', 'tempmail.org', 'guerrillamail.com'],
        },
        actions: {
          block: true,
          quarantine: false,
          requireApproval: false,
          notifyAdmin: true,
          logOnly: false,
        },
      },
      {
        id: 'volume-limits',
        name: 'Volume Limits',
        enabled: true,
        priority: 80,
        conditions: {
          maxEmailsPerHour: 100,
          maxEmailsPerDay: 500,
        },
        actions: {
          block: false,
          quarantine: true,
          requireApproval: true,
          notifyAdmin: true,
          logOnly: false,
        },
      },
      {
        id: 'business-hours',
        name: 'Business Hours Only',
        enabled: true,
        priority: 60,
        conditions: {
          allowedHours: { start: 8, end: 18 }, // 8 AM to 6 PM
          allowedDays: [1, 2, 3, 4, 5], // Monday to Friday
        },
        actions: {
          block: false,
          quarantine: true,
          requireApproval: false,
          notifyAdmin: false,
          logOnly: false,
        },
      },
      {
        id: 'forbidden-content',
        name: 'Forbidden Content',
        enabled: true,
        priority: 90,
        conditions: {
          forbiddenWords: ['spam', 'scam', 'urgent', 'act now', 'limited time'],
        },
        actions: {
          block: false,
          quarantine: false,
          requireApproval: true,
          notifyAdmin: true,
          logOnly: false,
        },
      },
    ];

    defaultRules.forEach(rule => this.addBlockRule(rule));
    logger.info('Default email block rules loaded', { count: defaultRules.length });
  }

  private startCleanupTimer(): void {
    // Clean up old quarantined/approval emails every hour
    setInterval(() => {
      this.cleanupOldEmails();
    }, 60 * 60 * 1000); // 1 hour
  }

  private cleanupOldEmails(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean quarantine queue
    for (const [id, email] of this.quarantineQueue.entries()) {
      const emailTime = parseInt(id.split('_')[1]);
      if (now - emailTime > maxAge) {
        this.quarantineQueue.delete(id);
        logger.info('Cleaned up old quarantined email', { id, to: email.to });
      }
    }

    // Clean approval queue
    for (const [id, email] of this.approvalQueue.entries()) {
      const emailTime = parseInt(id.split('_')[1]);
      if (now - emailTime > maxAge) {
        this.approvalQueue.delete(id);
        logger.info('Cleaned up old approval email', { id, to: email.to });
      }
    }
  }
}

// Export singleton instance
export const outboundEmailWatchdog = OutboundEmailWatchdog.getInstance();
