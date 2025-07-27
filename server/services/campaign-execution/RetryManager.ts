import { CampaignExecution, RetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { executionScheduler } from './ExecutionScheduler';
import { logger } from '../../utils/logger';

/**
 * Manages retry logic for failed campaign executions
 */
export class RetryManager {
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Determine if execution should be retried
   */
  shouldRetry(execution: CampaignExecution): boolean {
    return execution.attempts < this.retryConfig.maxAttempts;
  }

  /**
   * Schedule retry for failed execution
   */
  scheduleRetry(execution: CampaignExecution): void {
    if (!this.shouldRetry(execution)) {
      logger.warn('Execution exceeded max retry attempts', {
        executionId: execution.id,
        attempts: execution.attempts,
        maxAttempts: this.retryConfig.maxAttempts
      });
      return;
    }

    const retryDelay = this.calculateRetryDelay(execution.attempts);
    executionScheduler.scheduleRetry(execution, retryDelay);

    logger.info('Execution retry scheduled', {
      executionId: execution.id,
      attempt: execution.attempts + 1,
      maxAttempts: this.retryConfig.maxAttempts,
      retryDelayMs: retryDelay
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempts: number): number {
    const baseDelay = this.retryConfig.retryDelayMs;
    const backoffMultiplier = this.retryConfig.backoffMultiplier;
    
    // Exponential backoff: delay * (multiplier ^ attempts)
    return Math.floor(baseDelay * Math.pow(backoffMultiplier, attempts));
  }

  /**
   * Get retry statistics for an execution
   */
  getRetryStats(execution: CampaignExecution): {
    attempts: number;
    maxAttempts: number;
    canRetry: boolean;
    nextRetryDelay?: number;
  } {
    const canRetry = this.shouldRetry(execution);
    const nextRetryDelay = canRetry ? this.calculateRetryDelay(execution.attempts) : undefined;

    return {
      attempts: execution.attempts,
      maxAttempts: this.retryConfig.maxAttempts,
      canRetry,
      nextRetryDelay
    };
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info('Retry configuration updated', this.retryConfig);
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Reset execution attempts (for manual retry)
   */
  resetAttempts(execution: CampaignExecution): void {
    execution.attempts = 0;
    execution.errorMessage = undefined;
    execution.lastAttempt = undefined;
    
    logger.info('Execution attempts reset', {
      executionId: execution.id
    });
  }
}

// Export singleton instance
export const retryManager = new RetryManager();
