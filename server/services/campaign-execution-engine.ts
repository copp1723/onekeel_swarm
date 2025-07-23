import { logger } from '../utils/logger';
import { db } from '../db/client';
import { campaigns, leads, communications, emailTemplates } from '../db/schema';
import { eq, and, isNull, lt, gte } from 'drizzle-orm';
import { queueManager } from '../workers/queue-manager';
import { emailTemplateManager } from '../../email-system/services/email-campaign-templates';
import { emailMonitor } from './email-monitor-mock';

interface CampaignTrigger {
  type: 'email' | 'time' | 'lead_status' | 'manual';
  conditions: {
    emailSubject?: string;
    emailFrom?: string;
    leadStatus?: string;
    timeDelay?: number; // minutes
    campaignId?: string;
  };
}

interface CampaignExecution {
  id: string;
  campaignId: string;
  leadId: string;
  templateId: string;
  scheduledFor: Date;
  status: 'scheduled' | 'executing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  errorMessage?: string;
}

class CampaignExecutionEngine {
  private executions: Map<string, CampaignExecution> = new Map();
  private triggers: CampaignTrigger[] = [];
  private isRunning = false;
  private executionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default campaign triggers
   */
  private initializeDefaultTriggers() {
    this.triggers = [
      {
        type: 'email',
        conditions: {
          emailSubject: 'START CAMPAIGN',
          emailFrom: process.env.CAMPAIGN_TRIGGER_EMAIL || 'campaigns@completecarloans.com'
        }
      },
      {
        type: 'lead_status',
        conditions: {
          leadStatus: 'new'
        }
      },
      {
        type: 'time',
        conditions: {
          timeDelay: 60 // Check every hour
        }
      }
    ];
  }

  /**
   * Start the campaign execution engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Campaign execution engine is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Campaign Execution Engine');

    // Start monitoring for email replies (optional - gracefully handle failures)
    try {
      await emailMonitor.start();
      logger.info('✅ Email monitoring started for campaign execution');
    } catch (error) {
      logger.warn('Email monitoring not available for campaign execution - continuing without email monitoring', {
        error: (error as Error).message
      });
    }

    // Start processing scheduled executions every minute
    this.executionInterval = setInterval(async () => {
      await this.processScheduledExecutions();
    }, 60000); // Check every minute

    // Process any pending executions immediately
    await this.processScheduledExecutions();
  }

  /**
   * Stop the campaign execution engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    logger.info('Stopping Campaign Execution Engine');

    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }

    await emailMonitor.stop();
  }

  /**
   * Schedule email campaign execution
   */
  async scheduleEmailCampaign(
    campaignId: string,
    leadId: string,
    templateId: string,
    scheduledFor: Date
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: CampaignExecution = {
      id: executionId,
      campaignId,
      leadId,
      templateId,
      scheduledFor,
      status: 'scheduled',
      attempts: 0
    };

    this.executions.set(executionId, execution);
    
    logger.info('Email campaign scheduled', {
      executionId,
      campaignId,
      leadId,
      templateId,
      scheduledFor
    });

    return executionId;
  }

  /**
   * Process scheduled campaign executions
   */
  private async processScheduledExecutions(): Promise<void> {
    if (!this.isRunning) return;

    const now = new Date();
    const dueExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'scheduled' && exec.scheduledFor <= now)
      .slice(0, 10); // Process max 10 at a time

    for (const execution of dueExecutions) {
      await this.executeEmailCampaign(execution);
    }
  }

  /**
   * Execute individual email campaign
   */
  private async executeEmailCampaign(execution: CampaignExecution): Promise<void> {
    try {
      execution.status = 'executing';
      execution.attempts++;
      execution.lastAttempt = new Date();

      // Get lead data
      const lead = await db.select().from(leads).where(eq(leads.id, execution.leadId)).limit(1);
      if (!lead[0]) {
        throw new Error(`Lead ${execution.leadId} not found`);
      }

      // Get email template
      const template = await db.select().from(emailTemplates)
        .where(eq(emailTemplates.id, execution.templateId)).limit(1);
      
      if (!template[0]) {
        throw new Error(`Template ${execution.templateId} not found`);
      }

      // Render template with lead data
      const leadMetadata = lead[0].metadata as Record<string, any> || {};
      const renderedContent = await emailTemplateManager.renderTemplate(
        template[0].id,
        {
          firstName: lead[0].name?.split(' ')[0] || 'there',
          lastName: lead[0].name?.split(' ').slice(1).join(' ') || '',
          email: lead[0].email || '',
          phone: lead[0].phone || '',
          ...leadMetadata
        }
      );

      if (!renderedContent) {
        throw new Error(`Failed to render template ${execution.templateId}`);
      }

      // Send email via queue
      await queueManager.addJob('email', 'email_send', {
        to: lead[0].email,
        subject: renderedContent.subject,
        html: renderedContent.html,
        text: renderedContent.text,
        leadId: execution.leadId,
        campaignId: execution.campaignId,
        templateId: execution.templateId
      }, 1);

      // Record communication
      await db.insert(communications).values({
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId: execution.leadId,
        channel: 'email',
        direction: 'outbound',
        content: renderedContent.subject,
        status: 'sent',
        metadata: {
          campaignId: execution.campaignId,
          templateId: execution.templateId,
          executionId: execution.id
        }
      });

      execution.status = 'completed';
      logger.info('Email campaign executed successfully', {
        executionId: execution.id,
        leadId: execution.leadId,
        templateId: execution.templateId
      });

    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = (error as Error).message;
      
      logger.error('Email campaign execution failed', {
        executionId: execution.id,
        error: (error as Error).message,
        attempts: execution.attempts
      });

      // Retry if under max attempts
      if (execution.attempts < 3) {
        execution.status = 'scheduled';
        execution.scheduledFor = new Date(Date.now() + 300000); // Retry in 5 minutes
      }
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): CampaignExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions for a campaign
   */
  getCampaignExecutions(campaignId: string): CampaignExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.campaignId === campaignId);
  }

  /**
   * Cancel scheduled execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'scheduled') {
      this.executions.delete(executionId);
      logger.info('Execution cancelled', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Manually trigger a campaign for specific leads
   */
  async triggerCampaign(campaignId: string, leadIds: string[], templateSequence?: string[]): Promise<void> {
    try {
      logger.info('Manually triggering campaign', { campaignId, leadCount: leadIds.length });

      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (!campaign.active) {
        throw new Error(`Campaign ${campaignId} is not active`);
      }

      // Get default template sequence if not provided
      const templates = templateSequence || await this.getDefaultTemplateSequence(campaign);

      // Schedule executions for each lead
      for (const leadId of leadIds) {
        await this.scheduleLeadCampaign(leadId, campaignId, templates);
      }

      logger.info('Campaign triggered successfully', { 
        campaignId, 
        leadCount: leadIds.length,
        templateCount: templates.length 
      });

    } catch (error) {
      logger.error('Failed to trigger campaign:', error as Error);
      throw error;
    }
  }

  /**
   * Schedule campaign execution for a specific lead
   */
  private async scheduleLeadCampaign(leadId: string, campaignId: string, templates: string[]): Promise<void> {
    try {
      // Assign lead to campaign
      await db
        .update(leads)
        .set({ 
          campaignId,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      // Schedule template executions with delays
      let delayMinutes = 0;
      
      for (let i = 0; i < templates.length; i++) {
        const templateId = templates[i];
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const scheduledFor = new Date();
        scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

        const execution: CampaignExecution = {
          id: executionId,
          campaignId,
          leadId,
          templateId,
          scheduledFor,
          status: 'scheduled',
          attempts: 0
        };

        this.executions.set(executionId, execution);

        // Add to queue for processing
        await queueManager.addJob(
          'campaign-execution',
          'execute_campaign_step',
          { executionId },
          1 // Normal priority
        );

        // Increment delay for next template (24 hours default)
        delayMinutes += 24 * 60;
      }

      logger.info('Lead campaign scheduled', { leadId, campaignId, steps: templates.length });

    } catch (error) {
      logger.error('Failed to schedule lead campaign:', error as Error);
      throw error;
    }
  }

  /**
   * Get default template sequence for a campaign
   */
  private async getDefaultTemplateSequence(campaign: any): Promise<string[]> {
    // Check if campaign has touchSequence in settings
    if (campaign.settings?.touchSequence) {
      return campaign.settings.touchSequence.map((touch: any) => touch.templateId);
    }

    // Fallback to default sequence based on campaign goals
    const defaultSequence = [
      'welcome_application',
      'followup_24h',
      'followup_3day',
      'followup_7day'
    ];

    return defaultSequence;
  }

  /**
   * Auto-assign new leads to active campaigns
   */
  async autoAssignLeads(): Promise<void> {
    try {
      // Get unassigned leads
      const unassignedLeads = await db
        .select()
        .from(leads)
        .where(and(
          isNull(leads.campaignId),
          eq(leads.status, 'new')
        ));

      if (unassignedLeads.length === 0) {
        return;
      }

      // Get active campaigns
      const activeCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.active, true));

      if (activeCampaigns.length === 0) {
        logger.warn('No active campaigns found for lead assignment');
        return;
      }

      // Simple assignment logic - assign to first active campaign
      // In a real implementation, this would use more sophisticated matching
      const defaultCampaign = activeCampaigns[0];

      for (const lead of unassignedLeads) {
        await this.triggerCampaign(defaultCampaign.id, [lead.id]);
      }

      logger.info('Auto-assigned leads to campaigns', { 
        leadCount: unassignedLeads.length,
        campaignId: defaultCampaign.id 
      });

    } catch (error) {
      logger.error('Failed to auto-assign leads:', error as Error);
    }
  }

  /**
   * Get campaign execution statistics
   */
  async getExecutionStats(campaignId?: string): Promise<any> {
    const executions = Array.from(this.executions.values());
    const filtered = campaignId 
      ? executions.filter(e => e.campaignId === campaignId)
      : executions;

    return {
      total: filtered.length,
      scheduled: filtered.filter(e => e.status === 'scheduled').length,
      executing: filtered.filter(e => e.status === 'executing').length,
      completed: filtered.filter(e => e.status === 'completed').length,
      failed: filtered.filter(e => e.status === 'failed').length,
      executions: filtered
    };
  }

  /**
   * Cancel scheduled executions for a campaign or lead
   */
  async cancelExecutions(campaignId?: string, leadId?: string): Promise<number> {
    let cancelledCount = 0;
    
    for (const [id, execution] of this.executions.entries()) {
      if (execution.status === 'scheduled') {
        if ((campaignId && execution.campaignId === campaignId) ||
            (leadId && execution.leadId === leadId)) {
          execution.status = 'failed';
          execution.errorMessage = 'Cancelled by user';
          cancelledCount++;
        }
      }
    }

    logger.info('Cancelled campaign executions', { 
      count: cancelledCount,
      campaignId,
      leadId 
    });

    return cancelledCount;
  }
}

// Export singleton instance
export const campaignExecutionEngine = new CampaignExecutionEngine();
export default campaignExecutionEngine;