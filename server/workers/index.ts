/**
 * Worker Process Entry Point
 * Handles background jobs and async processing
 */

import { Worker } from 'bullmq';
// Config import needs to be updated based on OneKeel's config structure
// import { config } from '../config/index.js';
import { createLogger } from '../utils/enhanced-logger.js';
import { createErrorFromUnknown } from '../utils/errors.js';
import { Redis } from 'ioredis';

const logger = createLogger('worker');

// Import job processors
import { processEmailJob } from './email.worker.js';
import { processLeadJob } from './lead.worker.js';

// Job type definitions
export enum JobType {
  SEND_EMAIL = 'send_email',
  PROCESS_LEAD = 'process_lead',
  SYNC_CUSTOMER = 'sync_customer'
}

// Main worker setup
async function startWorkers() {
  logger.info('Starting worker processes...');

  // Create Redis connection for workers
  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Email worker
  const emailWorker = new Worker(
    'email',
    async (job) => {
      logger.info(`Processing email job ${job.id}`, { 
        jobType: job.name,
        customerId: job.data.customerId 
      });
      
      try {
        const result = await processEmailJob(job);
        logger.info(`Email job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        const appError = createErrorFromUnknown(error);
        logger.error(`Email job ${job.id} failed`, { 
          error: appError,
          jobData: job.data 
        });
        throw appError;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000
      }
    }
  );

  // Lead processing worker
  const leadWorker = new Worker(
    'leads',
    async (job) => {
      logger.info(`Processing lead job ${job.id}`, { 
        jobType: job.name,
        leadId: job.data.leadId 
      });
      
      try {
        const result = await processLeadJob(job);
        logger.info(`Lead job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        const appError = createErrorFromUnknown(error);
        logger.error(`Lead job ${job.id} failed`, { 
          error: appError,
          jobData: job.data 
        });
        throw appError;
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 60000 // 50 per minute
      }
    }
  );

  // Error handlers
  emailWorker.on('failed', (job, err) => {
    logger.error('Email job failed', {
      jobId: job?.id,
      error: err,
      failedReason: job?.failedReason
    });
  });

  leadWorker.on('failed', (job, err) => {
    logger.error('Lead job failed', {
      jobId: job?.id,
      error: err,
      failedReason: job?.failedReason
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    
    await Promise.all([
      emailWorker.close(),
      leadWorker.close()
    ]);
    
    logger.info('Workers shut down successfully');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Health check endpoint (optional)
  if (process.env.WORKER_HEALTH_PORT) {
    const { createServer } = await import('http');
    
    const healthServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          workers: {
            email: emailWorker.isRunning(),
            lead: leadWorker.isRunning()
          },
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    healthServer.listen(process.env.WORKER_HEALTH_PORT, () => {
      logger.info(`Worker health check available at http://localhost:${process.env.WORKER_HEALTH_PORT}/health`);
    });
  }

  logger.info('Workers started successfully');
}

// Start workers
startWorkers().catch((error) => {
  logger.error('Failed to start workers', { error });
  process.exit(1);
});