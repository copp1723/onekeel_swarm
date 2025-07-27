import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class QueueManager {
  private jobs: Map<string, QueueJob> = new Map();
  private isProcessing = false;

  async addJob(type: string, data: any, options: {
    priority?: number;
    delay?: number;
    maxAttempts?: number;
  } = {}): Promise<string> {
    const jobId = crypto.randomUUID();
    const job: QueueJob = {
      id: jobId,
      type,
      data,
      priority: options.priority || 1,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(jobId, job);
    logger.info('Job added to queue', { jobId, type });

    if (!this.isProcessing) {
      this.processJobs();
    }

    return jobId;
  }

  async getJob(jobId: string): Promise<QueueJob | undefined> {
    return this.jobs.get(jobId);
  }

  async removeJob(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.attempts === 0).length,
      processing: jobs.filter(j => j.attempts > 0 && j.attempts < j.maxAttempts).length,
      failed: jobs.filter(j => j.attempts >= j.maxAttempts).length
    };
  }

  private async processJobs(): Promise<void> {
    this.isProcessing = true;
    
    while (this.jobs.size > 0) {
      const jobs = Array.from(this.jobs.values())
        .filter(job => job.attempts < job.maxAttempts)
        .sort((a, b) => b.priority - a.priority);

      if (jobs.length === 0) break;

      const job = jobs[0];
      
      try {
        await this.processJob(job);
        this.jobs.delete(job.id);
        logger.info('Job completed', { jobId: job.id, type: job.type });
      } catch (error) {
        job.attempts++;
        job.updatedAt = new Date();
        
        if (job.attempts >= job.maxAttempts) {
          logger.error('Job failed permanently', { 
            jobId: job.id, 
            type: job.type, 
            error: (error as Error).message 
          });
        } else {
          logger.warn('Job failed, will retry', { 
            jobId: job.id, 
            type: job.type, 
            attempt: job.attempts,
            error: (error as Error).message 
          });
        }
      }

      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }

  private async processJob(job: QueueJob): Promise<void> {
    logger.info('Processing job', { jobId: job.id, type: job.type });
    
    // Basic job processing - would be extended based on job type
    switch (job.type) {
      case 'email':
        await this.processEmailJob(job.data);
        break;
      case 'lead':
        await this.processLeadJob(job.data);
        break;
      case 'campaign':
        await this.processCampaignJob(job.data);
        break;
      default:
        logger.warn('Unknown job type', { jobId: job.id, type: job.type });
    }
  }

  private async processEmailJob(data: any): Promise<void> {
    // Email processing logic would go here
    logger.info('Processing email job', { data });
  }

  private async processLeadJob(data: any): Promise<void> {
    // Lead processing logic would go here
    logger.info('Processing lead job', { data });
  }

  private async processCampaignJob(data: any): Promise<void> {
    // Campaign processing logic would go here
    logger.info('Processing campaign job', { data });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager');
    this.isProcessing = false;
  }

  isHealthy(): boolean {
    // Consider the queue healthy if it's not overloaded
    const jobCount = this.jobs.size;
    const maxHealthyJobs = 1000; // Configurable threshold
    return jobCount < maxHealthyJobs;
  }
}

export const queueManager = new QueueManager();