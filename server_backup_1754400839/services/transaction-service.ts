import { db } from '../db/client';
import { logger } from '../utils/logger';
import { cacheService } from './cache-service';

/**
 * Database transaction management service
 * Provides safe transaction handling with rollback, retry logic, and cache invalidation
 */
export class TransactionService {
  /**
   * Execute a function within a database transaction
   * Automatically handles rollback on errors and cache invalidation
   */
  static async withTransaction<T>(
    operation: (tx: typeof db) => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      cacheInvalidationKeys?: string[];
      isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      cacheInvalidationKeys = [],
      isolationLevel = 'read committed'
    } = options;

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('Starting database transaction', { 
          attempt, 
          maxRetries, 
          isolationLevel 
        });

        const result = await db.transaction(async (tx) => {
          // Set transaction isolation level if specified
          if (isolationLevel !== 'read committed') {
            await tx.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel.toUpperCase()}`);
          }

          return await operation(tx);
        });

        // Invalidate related caches after successful transaction
        if (cacheInvalidationKeys.length > 0) {
          await this.invalidateCaches(cacheInvalidationKeys);
        }

        logger.debug('Database transaction completed successfully', { 
          attempt, 
          cacheInvalidationKeys: cacheInvalidationKeys.length 
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Database transaction failed', {
          attempt,
          maxRetries,
          error: lastError.message,
          willRetry: attempt < maxRetries
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt >= maxRetries) {
          logger.error('Database transaction failed permanently', {
            attempt,
            maxRetries,
            error: lastError.message,
            stack: lastError.stack
          });
          throw lastError;
        }

        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute multiple operations in a single transaction
   */
  static async withBatchTransaction<T>(
    operations: Array<(tx: typeof db) => Promise<T>>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      cacheInvalidationKeys?: string[];
      continueOnError?: boolean;
    } = {}
  ): Promise<Array<T | Error>> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      cacheInvalidationKeys = [],
      continueOnError = false
    } = options;

    return await this.withTransaction(async (tx) => {
      const results: Array<T | Error> = [];

      for (const operation of operations) {
        try {
          const result = await operation(tx);
          results.push(result);
        } catch (error) {
          const err = error as Error;
          logger.error('Batch operation failed', { error: err.message });
          
          if (continueOnError) {
            results.push(err);
          } else {
            throw err;
          }
        }
      }

      return results;
    }, { maxRetries, retryDelay, cacheInvalidationKeys });
  }

  /**
   * Lead processing transaction with proper error handling
   */
  static async processLeadTransaction(
    leadId: string,
    operations: {
      updateLead?: (tx: typeof db) => Promise<any>;
      createConversation?: (tx: typeof db) => Promise<any>;
      createCommunication?: (tx: typeof db) => Promise<any>;
      updateCampaign?: (tx: typeof db) => Promise<any>;
      logDecision?: (tx: typeof db) => Promise<any>;
    }
  ): Promise<{
    lead?: any;
    conversation?: any;
    communication?: any;
    campaign?: any;
    decision?: any;
  }> {
    return await this.withTransaction(async (tx) => {
      const results: any = {};

      // Execute operations in dependency order
      if (operations.updateLead) {
        results.lead = await operations.updateLead(tx);
        logger.debug('Lead updated in transaction', { leadId });
      }

      if (operations.createConversation) {
        results.conversation = await operations.createConversation(tx);
        logger.debug('Conversation created in transaction', { leadId });
      }

      if (operations.createCommunication) {
        results.communication = await operations.createCommunication(tx);
        logger.debug('Communication created in transaction', { leadId });
      }

      if (operations.updateCampaign) {
        results.campaign = await operations.updateCampaign(tx);
        logger.debug('Campaign updated in transaction', { leadId });
      }

      if (operations.logDecision) {
        results.decision = await operations.logDecision(tx);
        logger.debug('Decision logged in transaction', { leadId });
      }

      return results;
    }, {
      cacheInvalidationKeys: [
        `lead:${leadId}`,
        `lead:${leadId}:*`,
        `conversation:*:lead:${leadId}`,
        `communication:*:lead:${leadId}`
      ]
    });
  }

  /**
   * User authentication transaction
   */
  static async userAuthTransaction(
    userId: string,
    operations: {
      updateLastLogin?: (tx: typeof db) => Promise<any>;
      createSession?: (tx: typeof db) => Promise<any>;
      logAudit?: (tx: typeof db) => Promise<any>;
    }
  ): Promise<{
    user?: any;
    session?: any;
    audit?: any;
  }> {
    return await this.withTransaction(async (tx) => {
      const results: any = {};

      if (operations.updateLastLogin) {
        results.user = await operations.updateLastLogin(tx);
      }

      if (operations.createSession) {
        results.session = await operations.createSession(tx);
      }

      if (operations.logAudit) {
        results.audit = await operations.logAudit(tx);
      }

      return results;
    }, {
      cacheInvalidationKeys: [
        `user:${userId}`,
        `session:${userId}:*`
      ]
    });
  }

  /**
   * Campaign enrollment transaction
   */
  static async campaignEnrollmentTransaction(
    leadId: string,
    campaignId: string,
    operations: {
      enrollLead?: (tx: typeof db) => Promise<any>;
      updateLeadStatus?: (tx: typeof db) => Promise<any>;
      logAnalytics?: (tx: typeof db) => Promise<any>;
    }
  ): Promise<{
    enrollment?: any;
    lead?: any;
    analytics?: any;
  }> {
    return await this.withTransaction(async (tx) => {
      const results: any = {};

      if (operations.enrollLead) {
        results.enrollment = await operations.enrollLead(tx);
      }

      if (operations.updateLeadStatus) {
        results.lead = await operations.updateLeadStatus(tx);
      }

      if (operations.logAnalytics) {
        results.analytics = await operations.logAnalytics(tx);
      }

      return results;
    }, {
      cacheInvalidationKeys: [
        `lead:${leadId}`,
        `campaign:${campaignId}`,
        `enrollment:${leadId}:${campaignId}`
      ]
    });
  }

  /**
   * Bulk data operations transaction
   */
  static async bulkOperationTransaction<T>(
    tableName: string,
    operations: Array<(tx: typeof db) => Promise<T>>,
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    // Process operations in batches to avoid transaction timeout
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(operations.length / batchSize);

      logger.debug('Processing bulk operation batch', {
        tableName,
        batchNum,
        totalBatches,
        batchSize: batch.length
      });

      const batchResults = await this.withTransaction(async (tx) => {
        const batchResults: T[] = [];
        for (const operation of batch) {
          const result = await operation(tx);
          batchResults.push(result);
        }
        return batchResults;
      }, {
        maxRetries: 2, // Fewer retries for bulk operations
        cacheInvalidationKeys: [`${tableName}:*`]
      });

      results.push(...batchResults);
    }

    logger.info('Bulk operation completed', {
      tableName,
      totalRecords: results.length,
      batchCount: Math.ceil(operations.length / batchSize)
    });

    return results;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'connection terminated',
      'connection refused',      
      'connection reset',
      'timeout',
      'serialization failure',
      'deadlock detected',
      'could not serialize access',
      'transaction aborted',
      'connection closed'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Delay function for retry backoff
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Invalidate multiple cache keys
   */
  private static async invalidateCaches(keys: string[]): Promise<void> {
    try {
      for (const key of keys) {
        if (key.includes('*')) {
          await cacheService.delPattern(key);
        } else {
          await cacheService.del(key);
        }
      }
      logger.debug('Cache invalidation completed', { keys: keys.length });
    } catch (error) {
      logger.warn('Cache invalidation failed', { 
        error: (error as Error).message,
        keys: keys.length
      });
    }
  }

  /**
   * Get transaction statistics
   */
  static getStats() {
    // This would be enhanced with actual metrics collection
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retryCount: 0,
      averageExecutionTime: 0
    };
  }

  /**
   * Health check for database connections
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await db.execute('SELECT 1 as health_check');
      
      const responseTime = Date.now() - startTime;
      const status = responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy';
      
      return {
        status,
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }
}

// Export singleton methods for direct use
export const withTransaction = TransactionService.withTransaction.bind(TransactionService);
export const withBatchTransaction = TransactionService.withBatchTransaction.bind(TransactionService);
export const processLeadTransaction = TransactionService.processLeadTransaction.bind(TransactionService);
export const userAuthTransaction = TransactionService.userAuthTransaction.bind(TransactionService);
export const campaignEnrollmentTransaction = TransactionService.campaignEnrollmentTransaction.bind(TransactionService);
export const bulkOperationTransaction = TransactionService.bulkOperationTransaction.bind(TransactionService);