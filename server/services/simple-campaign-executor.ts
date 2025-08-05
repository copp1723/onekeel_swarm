import { UnifiedCampaignAgent, CampaignConfig, CampaignStep } from '../agents/unified-campaign-agent';
import { Lead, Campaign, NewCampaign, Template } from '../db/schema';
import { db } from '../db/client';
import { leads, campaigns, campaignSteps, templates } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface CampaignExecutionRecord {
  id: string;
  campaignId: string;
  leadId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'stopped';
  currentStep: number;
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  nextExecutionAt?: Date;
  lastError?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

/**
 * Simplified Campaign Executor
 * Replaces the complex campaign execution system with a simple, direct approach
 */
export class SimpleCampaignExecutor {
  private unifiedAgent: UnifiedCampaignAgent;
  private executions: Map<string, CampaignExecutionRecord> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.unifiedAgent = new UnifiedCampaignAgent();
  }

  /**
   * Start a campaign for specific leads
   */
  async startCampaign(campaignId: string, leadIds: string[]): Promise<string[]> {
    logger.info('Starting simple campaign execution', { campaignId, leadCount: leadIds.length });

    try {
      // Get campaign data from database
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      // Get campaign steps with their templates
      const steps = await db
        .select({
          id: campaignSteps.id,
          campaignId: campaignSteps.campaignId,
          templateId: campaignSteps.templateId,
          stepOrder: campaignSteps.stepOrder,
          delayMinutes: campaignSteps.delayMinutes,
          template: {
            id: templates.id,
            name: templates.name,
            channel: templates.channel,
            subject: templates.subject,
            content: templates.content
          }
        })
        .from(campaignSteps)
        .innerJoin(templates, eq(campaignSteps.templateId, templates.id))
        .where(eq(campaignSteps.campaignId, campaignId))
        .orderBy(campaignSteps.stepOrder);

      if (steps.length === 0) {
        throw new Error(`No steps found for campaign: ${campaignId}`);
      }

      // Convert to UnifiedCampaignAgent format
      const campaignConfig: CampaignConfig = {
        name: campaign.name,
        steps: steps.map(step => ({
          id: step.id,
          channel: step.template.channel as 'email' | 'sms' | 'chat',
          content: step.template.content,
          subject: step.template.subject || undefined,
          delayDays: Math.ceil((step.delayMinutes || 0) / (24 * 60)), // Convert minutes to days
          order: step.stepOrder
        }))
      };

      const executionIds: string[] = [];

      // Start execution for each lead
      for (const leadId of leadIds) {
        const executionId = await this.startLeadCampaign(leadId, campaign, campaignConfig);
        executionIds.push(executionId);
      }

      logger.info('Campaign started for all leads', { 
        campaignId, 
        executionCount: executionIds.length 
      });

      return executionIds;

    } catch (error) {
      logger.error('Failed to start campaign', { 
        campaignId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Start campaign execution for a single lead
   */
  private async startLeadCampaign(
    leadId: string, 
    campaign: Campaign, 
    campaignConfig: CampaignConfig
  ): Promise<string> {
    const executionId = `exec_${campaign.id}_${leadId}_${Date.now()}`;

    // Get lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Create execution record
    const execution: CampaignExecutionRecord = {
      id: executionId,
      campaignId: campaign.id,
      leadId: leadId,
      status: 'scheduled',
      currentStep: 0,
      totalSteps: campaignConfig.steps.length,
      startedAt: new Date(),
      retryCount: 0,
      metadata: {
        campaignName: campaign.name,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
      }
    };

    this.executions.set(executionId, execution);

    // Start processing immediately (no delay for first step)
    this.scheduleStepExecution(executionId, lead, campaignConfig, 0);

    logger.info('Lead campaign execution started', { 
      executionId, 
      leadId, 
      campaignId: campaign.id 
    });

    return executionId;
  }

  /**
   * Schedule execution of a specific campaign step
   */
  private scheduleStepExecution(
    executionId: string,
    lead: Lead,
    campaignConfig: CampaignConfig,
    stepIndex: number
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'stopped') {
      return;
    }

    const step = campaignConfig.steps[stepIndex];
    if (!step) {
      // Campaign completed
      this.completeCampaign(executionId);
      return;
    }

    const delay = stepIndex === 0 ? 0 : (step.delayDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds

    const timer = setTimeout(async () => {
      await this.executeStep(executionId, lead, campaignConfig, stepIndex);
    }, delay);

    this.timers.set(`${executionId}_${stepIndex}`, timer);

    // Update execution record
    execution.currentStep = stepIndex;
    execution.status = stepIndex === 0 ? 'running' : 'scheduled';
    if (delay > 0) {
      execution.nextExecutionAt = new Date(Date.now() + delay);
    }

    logger.info('Campaign step scheduled', {
      executionId,
      stepIndex,
      delayDays: step.delayDays,
      scheduledFor: execution.nextExecutionAt
    });
  }

  /**
   * Execute a single campaign step
   */
  private async executeStep(
    executionId: string,
    lead: Lead,
    campaignConfig: CampaignConfig,
    stepIndex: number
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'stopped') {
      return;
    }

    const step = campaignConfig.steps[stepIndex];
    execution.status = 'running';
    execution.currentStep = stepIndex;

    try {
      logger.info('Executing campaign step', {
        executionId,
        stepIndex,
        channel: step.channel
      });

      // Use UnifiedCampaignAgent to send the message
      const result = await this.unifiedAgent.sendMessage(lead, step, step.channel);

      logger.info('Campaign step executed successfully', {
        executionId,
        stepIndex,
        messageId: result?.id || result?.sid || 'unknown'
      });

      // Schedule next step
      this.scheduleStepExecution(executionId, lead, campaignConfig, stepIndex + 1);

    } catch (error) {
      logger.error('Campaign step execution failed', {
        executionId,
        stepIndex,
        error: (error as Error).message
      });

      // Simple retry logic
      if (execution.retryCount < 2) { // Max 2 retries
        execution.retryCount++;
        execution.lastError = (error as Error).message;
        
        logger.info('Retrying campaign step', {
          executionId,
          stepIndex,
          retryCount: execution.retryCount
        });

        // Retry after 5 minutes
        const retryTimer = setTimeout(async () => {
          await this.executeStep(executionId, lead, campaignConfig, stepIndex);
        }, 5 * 60 * 1000);

        this.timers.set(`${executionId}_${stepIndex}_retry_${execution.retryCount}`, retryTimer);
      } else {
        // Max retries reached, mark as failed
        execution.status = 'failed';
        execution.lastError = (error as Error).message;
        
        logger.error('Campaign execution failed after retries', {
          executionId,
          stepIndex,
          retryCount: execution.retryCount
        });
      }
    }
  }

  /**
   * Complete a campaign execution
   */
  private completeCampaign(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.currentStep = execution.totalSteps;

    logger.info('Campaign execution completed', {
      executionId,
      campaignId: execution.campaignId,
      leadId: execution.leadId,
      totalSteps: execution.totalSteps
    });
  }

  /**
   * Stop a campaign execution
   */
  async stopCampaign(campaignId: string): Promise<boolean> {
    logger.info('Stopping campaign', { campaignId });

    let stoppedCount = 0;

    // Find all executions for this campaign
    for (const [executionId, execution] of Array.from(this.executions)) {
      if (execution.campaignId === campaignId && 
          ['scheduled', 'running'].includes(execution.status)) {
        
        execution.status = 'stopped';
        stoppedCount++;

        // Clear any pending timers
        for (const [timerKey, timer] of Array.from(this.timers)) {
          if (timerKey.startsWith(executionId)) {
            clearTimeout(timer);
            this.timers.delete(timerKey);
          }
        }

        logger.info('Campaign execution stopped', { executionId });
      }
    }

    logger.info('Campaign stopped', { campaignId, stoppedCount });
    return stoppedCount > 0;
  }

  /**
   * Get campaign status and execution details
   */
  getCampaignStatus(campaignId: string): {
    campaignId: string;
    executions: CampaignExecutionRecord[];
    summary: {
      total: number;
      scheduled: number;
      running: number;
      completed: number;
      failed: number;
      stopped: number;
    };
  } {
    const executions = Array.from(this.executions.values())
      .filter(exec => exec.campaignId === campaignId);

    const summary = {
      total: executions.length,
      scheduled: executions.filter(e => e.status === 'scheduled').length,
      running: executions.filter(e => e.status === 'running').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      stopped: executions.filter(e => e.status === 'stopped').length
    };

    return {
      campaignId,
      executions,
      summary
    };
  }

  /**
   * Process a single campaign step manually (for testing/debugging)
   */
  async processCampaignStep(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      logger.error('Execution not found', { executionId });
      return false;
    }

    try {
      // Get lead and campaign data
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, execution.leadId))
        .limit(1);

      if (!lead) {
        throw new Error(`Lead not found: ${execution.leadId}`);
      }

      const steps = await db
        .select({
          id: campaignSteps.id,
          campaignId: campaignSteps.campaignId,
          templateId: campaignSteps.templateId,
          stepOrder: campaignSteps.stepOrder,
          delayMinutes: campaignSteps.delayMinutes,
          template: {
            id: templates.id,
            name: templates.name,
            channel: templates.channel,
            subject: templates.subject,
            content: templates.content
          }
        })
        .from(campaignSteps)
        .innerJoin(templates, eq(campaignSteps.templateId, templates.id))
        .where(eq(campaignSteps.campaignId, execution.campaignId))
        .orderBy(campaignSteps.stepOrder);

      const campaignConfig: CampaignConfig = {
        name: execution.metadata?.campaignName || 'Unknown',
        steps: steps.map(step => ({
          id: step.id,
          channel: step.template.channel as 'email' | 'sms' | 'chat',
          content: step.template.content,
          subject: step.template.subject || undefined,
          delayDays: Math.ceil((step.delayMinutes || 0) / (24 * 60)), // Convert minutes to days
          order: step.stepOrder
        }))
      };

      // Execute current step
      await this.executeStep(executionId, lead, campaignConfig, execution.currentStep);
      return true;

    } catch (error) {
      logger.error('Failed to process campaign step', {
        executionId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): CampaignExecutionRecord[] {
    return Array.from(this.executions.values())
      .filter(exec => ['scheduled', 'running'].includes(exec.status));
  }

  /**
   * Clean up completed/failed executions older than specified days
   */
  cleanupOldExecutions(olderThanDays: number = 7): number {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [executionId, execution] of Array.from(this.executions)) {
      if (['completed', 'failed'].includes(execution.status) && 
          execution.startedAt < cutoffDate) {
        
        this.executions.delete(executionId);
        cleanedCount++;
      }
    }

    logger.info('Cleaned up old executions', { cleanedCount, olderThanDays });
    return cleanedCount;
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    totalExecutions: number;
    activeExecutions: number;
    pendingTimers: number;
  } {
    const activeExecutions = this.getActiveExecutions();
    
    return {
      isRunning: this.isRunning,
      totalExecutions: this.executions.size,
      activeExecutions: activeExecutions.length,
      pendingTimers: this.timers.size
    };
  }

  /**
   * Start the executor service
   */
  start(): void {
    this.isRunning = true;
    logger.info('SimpleCampaignExecutor started');
  }

  /**
   * Stop the executor service
   */
  stop(): void {
    this.isRunning = false;
    
    // Clear all timers
    for (const timer of Array.from(this.timers.values())) {
      clearTimeout(timer);
    }
    this.timers.clear();

    logger.info('SimpleCampaignExecutor stopped');
  }
}

// Export singleton instance
export const simpleCampaignExecutor = new SimpleCampaignExecutor();