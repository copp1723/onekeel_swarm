import { CampaignExecution } from './types';
import { logger } from '../../utils/logger';

/**
 * Manages in-memory storage of campaign executions
 * In a production system, this could be replaced with Redis or database storage
 */
export class ExecutionStorage {
  private executions: Map<string, CampaignExecution> = new Map();

  /**
   * Store an execution
   */
  set(executionId: string, execution: CampaignExecution): void {
    this.executions.set(executionId, execution);
    logger.debug('Execution stored', { executionId, status: execution.status });
  }

  /**
   * Get an execution by ID
   */
  get(executionId: string): CampaignExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAll(): CampaignExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get executions by campaign ID
   */
  getByCampaign(campaignId: string): CampaignExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.campaignId === campaignId);
  }

  /**
   * Get executions by lead ID
   */
  getByLead(leadId: string): CampaignExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.leadId === leadId);
  }

  /**
   * Get executions by status
   */
  getByStatus(status: CampaignExecution['status']): CampaignExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.status === status);
  }

  /**
   * Get scheduled executions that are due
   */
  getDueExecutions(maxCount: number = 10): CampaignExecution[] {
    const now = new Date();
    return Array.from(this.executions.values())
      .filter(exec => exec.status === 'scheduled' && exec.scheduledFor <= now)
      .slice(0, maxCount);
  }

  /**
   * Update execution status
   */
  updateStatus(executionId: string, status: CampaignExecution['status'], errorMessage?: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = status;
    if (errorMessage) {
      execution.errorMessage = errorMessage;
    }
    
    logger.debug('Execution status updated', { executionId, status, errorMessage });
    return true;
  }

  /**
   * Remove an execution
   */
  delete(executionId: string): boolean {
    const deleted = this.executions.delete(executionId);
    if (deleted) {
      logger.debug('Execution deleted', { executionId });
    }
    return deleted;
  }

  /**
   * Get execution count by status
   */
  getStatusCounts(): Record<CampaignExecution['status'], number> {
    const counts = {
      scheduled: 0,
      executing: 0,
      completed: 0,
      failed: 0
    };

    for (const execution of this.executions.values()) {
      counts[execution.status]++;
    }

    return counts;
  }

  /**
   * Clear all executions (for testing)
   */
  clear(): void {
    this.executions.clear();
    logger.debug('All executions cleared');
  }

  /**
   * Get total execution count
   */
  size(): number {
    return this.executions.size;
  }
}

// Export singleton instance
export const executionStorage = new ExecutionStorage();
