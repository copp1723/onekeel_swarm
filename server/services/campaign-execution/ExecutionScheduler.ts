import { CampaignExecution } from './types';
import { executionStorage } from './ExecutionStorage';
import { logger } from '../../utils/logger';
import { queueManager } from '../../workers/queue-manager';

/**
 * Handles scheduling of campaign executions
 */
export class ExecutionScheduler {
  /**
   * Schedule a single email campaign execution
   */
  async scheduleEmailCampaign(
    campaignId: string,
    leadId: string,
    templateId: string,
    scheduledFor: Date
  ): Promise<string> {
    const executionId = this.generateExecutionId();
    
    const execution: CampaignExecution = {
      id: executionId,
      campaignId,
      leadId,
      templateId,
      scheduledFor,
      status: 'scheduled',
      attempts: 0
    };

    executionStorage.set(executionId, execution);
    
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
   * Schedule campaign execution for a specific lead with template sequence
   */
  async scheduleLeadCampaign(
    leadId: string, 
    campaignId: string, 
    templates: string[]
  ): Promise<string[]> {
    const executionIds: string[] = [];
    let delayMinutes = 0;
    
    for (let i = 0; i < templates.length; i++) {
      const templateId = templates[i];
      const executionId = this.generateExecutionId();
      
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

      executionStorage.set(executionId, execution);
      executionIds.push(executionId);

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

    logger.info('Lead campaign scheduled', { 
      leadId, 
      campaignId, 
      steps: templates.length,
      executionIds 
    });

    return executionIds;
  }

  /**
   * Schedule retry for a failed execution
   */
  scheduleRetry(execution: CampaignExecution, retryDelayMs: number): void {
    execution.status = 'scheduled';
    execution.scheduledFor = new Date(Date.now() + retryDelayMs);
    
    logger.info('Execution retry scheduled', {
      executionId: execution.id,
      attempts: execution.attempts,
      scheduledFor: execution.scheduledFor
    });
  }

  /**
   * Cancel scheduled execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = executionStorage.get(executionId);
    if (execution && execution.status === 'scheduled') {
      executionStorage.delete(executionId);
      logger.info('Execution cancelled', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Cancel multiple executions by criteria
   */
  cancelExecutions(campaignId?: string, leadId?: string): number {
    let cancelledCount = 0;
    const executions = executionStorage.getAll();
    
    for (const execution of executions) {
      if (execution.status === 'scheduled') {
        const shouldCancel = 
          (campaignId && execution.campaignId === campaignId) ||
          (leadId && execution.leadId === leadId);
          
        if (shouldCancel) {
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

  /**
   * Get scheduled executions that are due for processing
   */
  getDueExecutions(maxCount: number = 10): CampaignExecution[] {
    return executionStorage.getDueExecutions(maxCount);
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const executionScheduler = new ExecutionScheduler();
