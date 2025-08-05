/**
 * Campaign Execution Engine - Simplified Implementation
 *
 * This file provides a simplified campaign execution system that replaces the complex
 * modular structure with a single, straightforward service that uses the UnifiedCampaignAgent.
 * 
 * Simplified Features:
 * - Day-based delays (no complex hourly scheduling)
 * - Basic retry mechanism (no exponential backoff)
 * - Direct database updates (no complex state management)
 * - Uses UnifiedCampaignAgent for actual message sending
 */

import { SimpleCampaignExecutor, simpleCampaignExecutor, CampaignExecutionRecord } from './simple-campaign-executor';
import { logger } from '../utils/logger';

// Backward compatibility interface
export interface CampaignTrigger {
  type: 'email' | 'time' | 'lead_status' | 'manual';
  conditions: {
    emailSubject?: string;
    emailFrom?: string;
    leadStatus?: string;
    timeDelay?: number;
    campaignId?: string;
  };
}

export interface CampaignExecution {
  id: string;
  campaignId: string;
  leadId: string;
  templateId?: string;
  scheduledFor?: Date;
  status: 'scheduled' | 'executing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  errorMessage?: string;
}

export interface ExecutionStats {
  total: number;
  scheduled: number;
  executing: number;
  completed: number;
  failed: number;
  executions: CampaignExecution[];
}

/**
 * Backward compatibility wrapper for SimpleCampaignExecutor
 */
class CampaignExecutionEngine {
  private executor: SimpleCampaignExecutor;

  constructor() {
    this.executor = simpleCampaignExecutor;
  }

  async start(): Promise<void> {
    logger.info('Starting simplified campaign execution engine');
    this.executor.start();
  }

  async stop(): Promise<void> {
    logger.info('Stopping simplified campaign execution engine');
    this.executor.stop();
  }

  async scheduleEmailCampaign(
    campaignId: string,
    leadId: string,
    templateId: string,
    scheduledFor: Date
  ): Promise<string> {
    logger.info('Scheduling email campaign (simplified)', { campaignId, leadId });
    // Start campaign for single lead
    const executionIds = await this.executor.startCampaign(campaignId, [leadId]);
    return executionIds[0] || `exec_${campaignId}_${leadId}_${Date.now()}`;
  }

  getExecutionStatus(executionId: string): CampaignExecution | undefined {
    const execution = this.executor.getActiveExecutions()
      .find(e => e.id === executionId);
    
    if (!execution) return undefined;

    return this.convertToLegacyFormat(execution);
  }

  getCampaignExecutions(campaignId: string): CampaignExecution[] {
    const status = this.executor.getCampaignStatus(campaignId);
    return status.executions.map(e => this.convertToLegacyFormat(e));
  }

  cancelExecution(executionId: string): boolean {
    // Find campaign ID for this execution
    const execution = this.executor.getActiveExecutions()
      .find(e => e.id === executionId);
    
    if (!execution) return false;

    // Stop the entire campaign (simplified approach)
    this.executor.stopCampaign(execution.campaignId);
    return true;
  }

  async triggerCampaign(
    campaignId: string, 
    leadIds: string[], 
    templateSequence?: string[]
  ): Promise<void> {
    logger.info('Triggering campaign (simplified)', { campaignId, leadCount: leadIds.length });
    await this.executor.startCampaign(campaignId, leadIds);
  }

  async autoAssignLeads(): Promise<void> {
    logger.info('Auto-assign leads not implemented in simplified version');
    // Simplified version doesn't support auto-assignment
  }

  async getExecutionStats(campaignId?: string): Promise<ExecutionStats> {
    if (campaignId) {
      const status = this.executor.getCampaignStatus(campaignId);
      return {
        total: status.summary.total,
        scheduled: status.summary.scheduled,
        executing: status.summary.running,
        completed: status.summary.completed,
        failed: status.summary.failed,
        executions: status.executions.map(e => this.convertToLegacyFormat(e))
      };
    } else {
      // Get stats for all campaigns
      const health = this.executor.getHealthStatus();
      return {
        total: health.totalExecutions,
        scheduled: 0, // Not tracked globally in simplified version
        executing: health.activeExecutions,
        completed: 0, // Not tracked globally in simplified version
        failed: 0, // Not tracked globally in simplified version
        executions: []
      };
    }
  }

  async cancelExecutions(campaignId?: string, leadId?: string): Promise<number> {
    if (campaignId) {
      const stopped = await this.executor.stopCampaign(campaignId);
      return stopped ? 1 : 0;
    }
    return 0;
  }

  getHealthStatus(): {
    isRunning: boolean;
    totalExecutions: number;
    pendingExecutions: number;
    failedExecutions: number;
    lastProcessedAt?: Date;
  } {
    const health = this.executor.getHealthStatus();
    return {
      isRunning: health.isRunning,
      totalExecutions: health.totalExecutions,
      pendingExecutions: health.activeExecutions,
      failedExecutions: 0, // Not tracked in simplified version
      lastProcessedAt: new Date() // Current time as fallback
    };
  }

  getExecutionReport(campaignId?: string): {
    summary: ExecutionStats;
    recentFailures: CampaignExecution[];
    upcomingExecutions: CampaignExecution[];
  } {
    const stats = campaignId ? 
      this.executor.getCampaignStatus(campaignId) :
      { summary: { total: 0, scheduled: 0, running: 0, completed: 0, failed: 0, stopped: 0 }, executions: [] };

    return {
      summary: {
        total: stats.summary.total,
        scheduled: stats.summary.scheduled,
        executing: stats.summary.running,
        completed: stats.summary.completed,
        failed: stats.summary.failed,
        executions: stats.executions.map(e => this.convertToLegacyFormat(e))
      },
      recentFailures: stats.executions
        .filter(e => e.status === 'failed')
        .map(e => this.convertToLegacyFormat(e)),
      upcomingExecutions: stats.executions
        .filter(e => e.status === 'scheduled')
        .map(e => this.convertToLegacyFormat(e))
    };
  }

  async forceProcessExecution(executionId: string): Promise<boolean> {
    return await this.executor.processCampaignStep(executionId);
  }

  async removeLeadFromCampaign(leadId: string): Promise<void> {
    logger.info('Remove lead from campaign not implemented in simplified version', { leadId });
    // Simplified version doesn't support individual lead removal
  }

  isRunning(): boolean {
    return this.executor.getHealthStatus().isRunning;
  }

  clearAllExecutions(): void {
    logger.info('Clearing all executions (simplified)');
    this.executor.stop();
    this.executor.start();
  }

  /**
   * Convert SimpleCampaignExecutor format to legacy format
   */
  private convertToLegacyFormat(execution: CampaignExecutionRecord): CampaignExecution {
    return {
      id: execution.id,
      campaignId: execution.campaignId,
      leadId: execution.leadId,
      templateId: `step_${execution.currentStep}`,
      scheduledFor: execution.nextExecutionAt,
      status: execution.status === 'running' ? 'executing' : 
               execution.status === 'scheduled' ? 'scheduled' :
               execution.status === 'completed' ? 'completed' : 'failed',
      attempts: execution.retryCount + 1,
      lastAttempt: execution.startedAt,
      errorMessage: execution.lastError
    };
  }
}

// Export instances for backward compatibility
export const campaignExecutionEngine = new CampaignExecutionEngine();
export { CampaignExecutionEngine };

// Default export
export default campaignExecutionEngine;

