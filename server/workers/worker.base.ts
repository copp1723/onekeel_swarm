/**
 * Base Worker Class
 * Provides common functionality for all worker types
 */

import { Job } from 'bullmq';
import { logger } from '../utils/logger.js';

export interface WorkerJobData {
  type: string;
  id: string;
  data: Record<string, any>;
}

export abstract class BaseWorker<T extends WorkerJobData = WorkerJobData> {
  protected workerName: string;

  constructor(workerName: string) {
    this.workerName = workerName;
  }

  /**
   * Abstract method to be implemented by specific workers
   */
  abstract processJob(job: Job<T>): Promise<any>;

  /**
   * Common job processing wrapper with logging and error handling
   */
  async process(job: Job<T>): Promise<any> {
    const startTime = Date.now();
    
    logger.info(`Processing ${this.workerName} job`, {
      jobId: job.id,
      jobType: job.data.type,
      dataId: job.data.id
    });

    try {
      const result = await this.processJob(job);
      
      const duration = Date.now() - startTime;
      logger.info(`${this.workerName} job completed successfully`, {
        jobId: job.id,
        duration: `${duration}ms`
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${this.workerName} job failed`, {
        jobId: job.id,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Helper method for creating standardized error responses
   */
  protected createErrorResponse(message: string, details?: Record<string, any>) {
    return {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper method for creating standardized success responses
   */
  protected createSuccessResponse(data?: Record<string, any>) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }
}