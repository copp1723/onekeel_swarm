// Mock Email Monitor for Testing
import { logger } from '../utils/logger';

interface EmailTriggerRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    from?: string[];
    subject?: string[];
    body?: string[];
  };
  actions: {
    createLead?: boolean;
    assignToAgent?: string;
    startCampaign?: string;
    setSource?: string;
  };
}

class EmailMonitor {
  private running = false;
  private rules: EmailTriggerRule[] = [];

  constructor() {
    logger.info('Email Monitor initialized (mock mode)');
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info('📧 Email Monitor started (mock mode)');

    // Add some default rules
    this.addDefaultRules();

    // Simulate email monitoring
    this.simulateEmailCheck();
  }

  async stop(): Promise<void> {
    this.running = false;
    logger.info('📧 Email Monitor stopped');
  }

  addRule(rule: EmailTriggerRule): void {
    this.rules.push(rule);
    logger.info(`📧 Added email rule: ${rule.name}`);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    logger.info(`📧 Removed email rule: ${ruleId}`);
  }

  getRules(): EmailTriggerRule[] {
    return this.rules;
  }

  private addDefaultRules(): void {
    const defaultRules: EmailTriggerRule[] = [
      {
        id: 'car-loan-inquiry',
        name: 'Car Loan Inquiry',
        enabled: true,
        conditions: {
          subject: ['car loan', 'auto loan', 'vehicle financing']
        },
        actions: {
          createLead: true,
          assignToAgent: 'email',
          setSource: 'email-inquiry'
        }
      },
      {
        id: 'general-inquiry',
        name: 'General Inquiry',
        enabled: true,
        conditions: {
          subject: ['inquiry', 'information', 'quote']
        },
        actions: {
          createLead: true,
          assignToAgent: 'chat',
          setSource: 'email-monitor'
        }
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  private simulateEmailCheck(): void {
    if (!this.running) return;

    // Simulate checking emails every 60 seconds
    setTimeout(() => {
      if (this.running && Math.random() > 0.7) {
        this.simulateEmailReceived();
      }
      this.simulateEmailCheck();
    }, 60000);
  }

  private simulateEmailReceived(): void {
    const mockEmails = [
      {
        from: 'customer1@example.com',
        subject: 'Car loan inquiry',
        body: 'I am interested in getting a car loan. Can you help?',
        date: new Date()
      },
      {
        from: 'customer2@example.com',
        subject: 'Auto financing information',
        body: 'Looking for information about auto financing options.',
        date: new Date()
      },
      {
        from: 'prospect@example.com',
        subject: 'General inquiry about services',
        body: 'Can you provide more information about your services?',
        date: new Date()
      }
    ];

    const email = mockEmails[Math.floor(Math.random() * mockEmails.length)];
    logger.info(`📧 Mock email received: "${email.subject}" from ${email.from}`);

    // Process against rules
    this.processEmail(email);
  }

  private async processEmail(email: any): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      let matches = false;

      // Check subject conditions
      if (rule.conditions.subject) {
        matches = rule.conditions.subject.some(keyword => 
          email.subject.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      // Check from conditions
      if (rule.conditions.from && !matches) {
        matches = rule.conditions.from.some(pattern => 
          email.from.toLowerCase().includes(pattern.toLowerCase())
        );
      }

      // Check body conditions
      if (rule.conditions.body && !matches) {
        matches = rule.conditions.body.some(keyword => 
          email.body.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      if (matches) {
        await this.executeRuleActions(email, rule);
      }
    }
  }

  private async executeRuleActions(email: any, rule: EmailTriggerRule): Promise<void> {
    logger.info(`📧 Executing rule "${rule.name}" for email from ${email.from}`);

    try {
      if (rule.actions.createLead) {
        await this.createLeadFromEmail(email, rule);
      }

      if (rule.actions.startCampaign) {
        logger.info(`📧 Would start campaign: ${rule.actions.startCampaign}`);
      }

      if (rule.actions.assignToAgent) {
        logger.info(`📧 Would assign to agent: ${rule.actions.assignToAgent}`);
      }
    } catch (error) {
      logger.error(`📧 Error executing rule actions: ${error}`);
    }
  }

  private async createLeadFromEmail(email: any, rule: EmailTriggerRule): Promise<void> {
    const leadData = {
      email: email.from,
      source: rule.actions.setSource || 'email-monitor',
      notes: `Created from email: ${email.subject}`,
      assignedChannel: rule.actions.assignToAgent || 'email'
    };

    logger.info(`📧 Mock lead created: ${leadData.email} (source: ${leadData.source})`);
  }

  getStatus() {
    return {
      running: this.running,
      ruleCount: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      mode: 'mock'
    };
  }
}

// Export singleton instance
export const emailMonitor = new EmailMonitor();
export default emailMonitor;