import { CampaignExecution, ExecutionStats } from './types';
import { executionStorage } from './ExecutionStorage';
import { executionProcessor } from './ExecutionProcessor';
import { executionScheduler } from './ExecutionScheduler';
import { logger } from '../../utils/logger';

/**
 * Monitors and manages campaign execution lifecycle
 */
export class ExecutionMonitor {
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL_MS = 60000; // 1 minute

  /**
   * Start monitoring campaign executions
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Execution monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting execution monitor');

    // Start processing scheduled executions every minute
    this.monitorInterval = setInterval(async () => {
      await this.processScheduledExecutions();
    }, this.MONITOR_INTERVAL_MS);

    // Process any pending executions immediately
    await this.processScheduledExecutions();
  }

  /**
   * Stop monitoring campaign executions
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    logger.info('Stopping execution monitor');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Process scheduled executions that are due
   */
  private async processScheduledExecutions(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const dueExecutions = executionScheduler.getDueExecutions(10); // Process max 10 at a time
      
      if (dueExecutions.length === 0) {
        return;
      }

      logger.info('Processing due executions', { count: dueExecutions.length });

      // Process executions in batch
      await executionProcessor.processBatch(dueExecutions);

    } catch (error) {
      logger.error('Error processing scheduled executions', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(campaignId?: string): ExecutionStats {
    const executions = campaignId 
      ? executionStorage.getByCampaign(campaignId)
      : executionStorage.getAll();

    const stats = {
      total: executions.length,
      scheduled: 0,
      executing: 0,
      completed: 0,
      failed: 0,
      executions
    };

    for (const execution of executions) {
      stats[execution.status]++;
    }

    return stats;
  }

  /**
   * Get execution status by ID
   */
  getExecutionStatus(executionId: string): CampaignExecution | undefined {
    return executionStorage.get(executionId);
  }

  /**
   * Get executions for a specific campaign
   */
  getCampaignExecutions(campaignId: string): CampaignExecution[] {
    return executionStorage.getByCampaign(campaignId);
  }

  /**
   * Get executions for a specific lead
   */
  getLeadExecutions(leadId: string): CampaignExecution[] {
    return executionStorage.getByLead(leadId);
  }

  /**
   * Get health status of the execution system
   */
  getHealthStatus(): {
    isRunning: boolean;
    totalExecutions: number;
    pendingExecutions: number;
    failedExecutions: number;
    lastProcessedAt?: Date;
  } {
    const stats = this.getExecutionStats();
    
    return {
      isRunning: this.isRunning,
      totalExecutions: stats.total,
      pendingExecutions: stats.scheduled,
      failedExecutions: stats.failed,
      lastProcessedAt: new Date() // Could track actual last processed time
    };
  }

  /**
   * Force process a specific execution
   */
  async forceProcessExecution(executionId: string): Promise<boolean> {
    const execution = executionStorage.get(executionId);
    if (!execution) {
      logger.warn('Execution not found for force processing', { executionId });
      return false;
    }

    if (execution.status !== 'scheduled') {
      logger.warn('Execution is not in scheduled status', { 
        executionId, 
        status: execution.status 
      });
      return false;
    }

    try {
      await executionProcessor.processExecution(execution);
      logger.info('Execution force processed', { executionId });
      return true;
    } catch (error) {
      logger.error('Force processing failed', { 
        executionId, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Get monitor status
   */
  isMonitorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get detailed execution report
   */
  getExecutionReport(campaignId?: string): {
    summary: ExecutionStats;
    recentFailures: CampaignExecution[];
    upcomingExecutions: CampaignExecution[];
  } {
    const summary = this.getExecutionStats(campaignId);
    
    const allExecutions = campaignId 
      ? executionStorage.getByCampaign(campaignId)
      : executionStorage.getAll();

    const recentFailures = allExecutions
      .filter(exec => exec.status === 'failed')
      .sort((a, b) => (b.lastAttempt?.getTime() || 0) - (a.lastAttempt?.getTime() || 0))
      .slice(0, 10);

    const upcomingExecutions = allExecutions
      .filter(exec => exec.status === 'scheduled')
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      .slice(0, 10);

    return {
      summary,
      recentFailures,
      upcomingExecutions
    };
  }
}

// Export singleton instance
export const executionMonitor = new ExecutionMonitor();
