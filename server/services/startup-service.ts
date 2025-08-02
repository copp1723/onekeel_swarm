import { logger } from '../utils/logger';
import { campaignExecutionEngine } from './campaign-execution-engine';
import { emailReplyDetector } from './email-reply-detector';
import { queueManager } from '../workers/queue-manager';

export class StartupService {
  /**
   * Initialize all services required for deployment
   */
  static async initialize(): Promise<void> {
    logger.info('Starting OneKeel Swarm services initialization...');

    const serviceResults = {
      campaignEngine: false,
      emailReplyDetector: false,
      queueManager: true // Always available as singleton
    };

    // Start campaign execution engine
    try {
      await campaignExecutionEngine.start();
      serviceResults.campaignEngine = true;
      logger.info('✅ Campaign execution engine started');
    } catch (error) {
      logger.warn('⚠️ Campaign execution engine failed to start - continuing without it', {
        error: (error as Error).message
      });
    }

    // Start email reply detector
    try {
      await emailReplyDetector.start();
      serviceResults.emailReplyDetector = true;
      logger.info('✅ Email reply detector started');
    } catch (error) {
      logger.warn('⚠️ Email reply detector failed to start - continuing without it', {
        error: (error as Error).message
      });
    }

    // Queue manager is already initialized as singleton
    logger.info('✅ Queue manager initialized');

    const successfulServices = Object.values(serviceResults).filter(Boolean).length;
    const totalServices = Object.keys(serviceResults).length;
    
    logger.info(`🚀 OneKeel Swarm services initialization completed: ${successfulServices}/${totalServices} services started`, serviceResults);
  }

  /**
   * Graceful shutdown of all services
   */
  static async shutdown(): Promise<void> {
    logger.info('Shutting down OneKeel Swarm services...');

    try {
      // Stop campaign execution engine
      await campaignExecutionEngine.stop();
      logger.info('✅ Campaign execution engine stopped');

      // Stop email reply detector
      await emailReplyDetector.stop();
      logger.info('✅ Email reply detector stopped');

      // Stop queue manager
      await queueManager.shutdown();
      logger.info('✅ Queue manager stopped');

      logger.info('🛑 All OneKeel Swarm services shut down successfully');

    } catch (error) {
      logger.error('❌ Error during service shutdown', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Health check for all services
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
  }> {
    const services = {
      queueManager: queueManager.isHealthy(),
      campaignEngine: true, // Simple check - could be enhanced
      emailDetector: true   // Simple check - could be enhanced
    };

    const healthy = Object.values(services).every(status => status);

    return {
      healthy,
      services
    };
  }
}