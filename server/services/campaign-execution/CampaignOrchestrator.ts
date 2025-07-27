import { CampaignTrigger, CampaignExecution, ExecutionStats } from './types';
import { executionMonitor } from './ExecutionMonitor';
import { executionScheduler } from './ExecutionScheduler';
import { leadAssignmentService } from './LeadAssignmentService';
import { executionStorage } from './ExecutionStorage';
import { logger } from '../../utils/logger';
import { emailMonitor } from '../email-monitor-mock';

/**
 * Main orchestrator for campaign execution system
 * Provides the same interface as the original CampaignExecutionEngine
 */
export class CampaignOrchestrator {
  private triggers: CampaignTrigger[] = [];

  constructor() {
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default campaign triggers
   */
  private initializeDefaultTriggers(): void {
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
    logger.info('Starting Campaign Execution Engine');

    // Start email monitoring (optional - gracefully handle failures)
    try {
      await emailMonitor.start();
      logger.info('✅ Email monitoring started for campaign execution');
    } catch (error) {
      logger.warn('Email monitoring not available for campaign execution - continuing without email monitoring', {
        error: (error as Error).message
      });
    }

    // Start execution monitor
    await executionMonitor.start();
    logger.info('✅ Campaign execution monitor started');
  }

  /**
   * Stop the campaign execution engine
   */
  async stop(): Promise<void> {
    logger.info('Stopping Campaign Execution Engine');

    // Stop execution monitor
    await executionMonitor.stop();

    // Stop email monitor
    try {
      await emailMonitor.stop();
    } catch (error) {
      logger.warn('Error stopping email monitor', { error: (error as Error).message });
    }

    logger.info('✅ Campaign execution engine stopped');
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
    return await executionScheduler.scheduleEmailCampaign(
      campaignId,
      leadId,
      templateId,
      scheduledFor
    );
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): CampaignExecution | undefined {
    return executionMonitor.getExecutionStatus(executionId);
  }

  /**
   * Get all executions for a campaign
   */
  getCampaignExecutions(campaignId: string): CampaignExecution[] {
    return executionMonitor.getCampaignExecutions(campaignId);
  }

  /**
   * Cancel scheduled execution
   */
  cancelExecution(executionId: string): boolean {
    return executionScheduler.cancelExecution(executionId);
  }

  /**
   * Manually trigger a campaign for specific leads
   */
  async triggerCampaign(
    campaignId: string, 
    leadIds: string[], 
    templateSequence?: string[]
  ): Promise<void> {
    return await leadAssignmentService.triggerCampaign(campaignId, leadIds, templateSequence);
  }

  /**
   * Auto-assign new leads to active campaigns
   */
  async autoAssignLeads(): Promise<void> {
    return await leadAssignmentService.autoAssignLeads();
  }

  /**
   * Get campaign execution statistics
   */
  async getExecutionStats(campaignId?: string): Promise<ExecutionStats> {
    return executionMonitor.getExecutionStats(campaignId);
  }

  /**
   * Cancel scheduled executions for a campaign or lead
   */
  async cancelExecutions(campaignId?: string, leadId?: string): Promise<number> {
    return executionScheduler.cancelExecutions(campaignId, leadId);
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    totalExecutions: number;
    pendingExecutions: number;
    failedExecutions: number;
    lastProcessedAt?: Date;
  } {
    return executionMonitor.getHealthStatus();
  }

  /**
   * Get detailed execution report
   */
  getExecutionReport(campaignId?: string): {
    summary: ExecutionStats;
    recentFailures: CampaignExecution[];
    upcomingExecutions: CampaignExecution[];
  } {
    return executionMonitor.getExecutionReport(campaignId);
  }

  /**
   * Force process a specific execution
   */
  async forceProcessExecution(executionId: string): Promise<boolean> {
    return await executionMonitor.forceProcessExecution(executionId);
  }

  /**
   * Remove lead from campaign
   */
  async removeLeadFromCampaign(leadId: string): Promise<void> {
    return await leadAssignmentService.removeLeadFromCampaign(leadId);
  }

  /**
   * Get monitor running status
   */
  isRunning(): boolean {
    return executionMonitor.isMonitorRunning();
  }

  /**
   * Clear all executions (for testing)
   */
  clearAllExecutions(): void {
    executionStorage.clear();
    logger.info('All executions cleared');
  }
}

// Export singleton instance for backward compatibility
export const campaignOrchestrator = new CampaignOrchestrator();

// Default export for backward compatibility
export default campaignOrchestrator;
