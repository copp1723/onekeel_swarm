// Mock Enhanced Email Monitor for Testing
import { logger } from '../utils/logger';

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
  notes?: string;
}

class EnhancedEmailMonitor {
  private running = false;
  private triggers: EmailTrigger[] = [];

  constructor() {
    logger.info('Enhanced Email Monitor initialized (mock mode)');
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info('📧 Enhanced Email Monitor started (mock mode)');

    // Simulate email monitoring in mock mode
    this.simulateEmailProcessing();
  }

  async stop(): Promise<void> {
    this.running = false;
    logger.info('📧 Enhanced Email Monitor stopped');
  }

  addTrigger(trigger: EmailTrigger): void {
    this.triggers.push(trigger);
    logger.info(`📧 Added email trigger: ${trigger.subject}`);
  }

  removeTrigger(subject: string): void {
    this.triggers = this.triggers.filter(t => t.subject !== subject);
    logger.info(`📧 Removed email trigger: ${subject}`);
  }

  private simulateEmailProcessing(): void {
    if (!this.running) return;

    // Simulate periodic email check
    setTimeout(() => {
      if (this.running && Math.random() > 0.8) {
        this.simulateEmailReceived();
      }
      this.simulateEmailProcessing();
    }, 30000); // Check every 30 seconds
  }

  private simulateEmailReceived(): void {
    const mockEmails = [
      {
        subject: 'Car loan inquiry',
        from: 'test@example.com',
        body: 'I need information about car loans'
      },
      {
        subject: 'Re: Your loan application',
        from: 'customer@example.com',
        body: 'Thanks for the information'
      }
    ];

    const email = mockEmails[Math.floor(Math.random() * mockEmails.length)];
    logger.info(`📧 Mock email received: ${email.subject} from ${email.from}`);

    // Process triggers
    this.triggers.forEach(trigger => {
      if (email.subject.toLowerCase().includes(trigger.subject.toLowerCase())) {
        this.processTrigger(trigger, email);
      }
    });
  }

  private async processTrigger(trigger: EmailTrigger, email: any): Promise<void> {
    logger.info(`📧 Processing trigger: ${trigger.action} for ${email.subject}`);

    try {
      switch (trigger.action) {
        case 'create_lead':
          await this.createLeadFromEmail(email);
          break;
        case 'start_campaign':
          logger.info(`📧 Would start campaign: ${trigger.campaignId}`);
          break;
        case 'stop_campaign':
          logger.info(`📧 Would stop campaign: ${trigger.campaignId}`);
          break;
      }
    } catch (error) {
      logger.error(`📧 Error processing trigger: ${error}`);
    }
  }

  private async createLeadFromEmail(email: any): Promise<void> {
    const leadData: LeadData = {
      email: email.from,
      name: 'Mock Lead',
      notes: `Created from email: ${email.subject}`
    };

    logger.info(`📧 Mock lead created: ${leadData.email}`);
  }

  getStatus() {
    return {
      running: this.running,
      triggerCount: this.triggers.length,
      mode: 'mock'
    };
  }
}

// Export singleton instance
export const enhancedEmailMonitor = new EnhancedEmailMonitor();
export default enhancedEmailMonitor;