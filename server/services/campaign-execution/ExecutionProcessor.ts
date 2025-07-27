import { CampaignExecution } from './types';
import { executionStorage } from './ExecutionStorage';
import { templateRenderingService } from './TemplateRenderingService';
import { retryManager } from './RetryManager';
import { logger } from '../../utils/logger';
import { queueManager } from '../../workers/queue-manager';
import { db } from '../../db/client';
import { communications } from '../../db/schema';

/**
 * Processes individual campaign executions
 */
export class ExecutionProcessor {
  /**
   * Process a single campaign execution
   */
  async processExecution(execution: CampaignExecution): Promise<void> {
    try {
      // Update execution status
      execution.status = 'executing';
      execution.attempts++;
      execution.lastAttempt = new Date();

      logger.info('Processing campaign execution', {
        executionId: execution.id,
        campaignId: execution.campaignId,
        leadId: execution.leadId,
        templateId: execution.templateId,
        attempt: execution.attempts
      });

      // Render template with lead data
      const renderedContent = await templateRenderingService.renderTemplateForLead(
        execution.templateId,
        execution.leadId
      );

      if (!renderedContent) {
        throw new Error(`Failed to render template ${execution.templateId} for lead ${execution.leadId}`);
      }

      // Send email via queue
      await this.sendEmail(execution, renderedContent);

      // Record communication
      await this.recordCommunication(execution, renderedContent);

      // Mark as completed
      execution.status = 'completed';
      
      logger.info('Campaign execution completed successfully', {
        executionId: execution.id,
        leadId: execution.leadId,
        templateId: execution.templateId
      });

    } catch (error) {
      await this.handleExecutionError(execution, error as Error);
    }
  }

  /**
   * Send email via queue system
   */
  private async sendEmail(execution: CampaignExecution, renderedContent: any): Promise<void> {
    // Get lead email from rendered content or fetch from database
    const leadData = await this.getLeadEmail(execution.leadId);
    
    await queueManager.addJob('email', 'email_send', {
      to: leadData.email,
      subject: renderedContent.subject,
      html: renderedContent.html,
      text: renderedContent.text,
      leadId: execution.leadId,
      campaignId: execution.campaignId,
      templateId: execution.templateId
    }, 1);

    logger.debug('Email queued for sending', {
      executionId: execution.id,
      to: leadData.email,
      subject: renderedContent.subject
    });
  }

  /**
   * Record communication in database
   */
  private async recordCommunication(execution: CampaignExecution, renderedContent: any): Promise<void> {
    try {
      await db.insert(communications).values({
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId: execution.leadId,
        channel: 'email',
        direction: 'outbound',
        content: renderedContent.subject,
        status: 'sent',
        metadata: {
          campaignId: execution.campaignId,
          templateId: execution.templateId,
          executionId: execution.id
        }
      });

      logger.debug('Communication recorded', {
        executionId: execution.id,
        leadId: execution.leadId
      });
    } catch (error) {
      logger.error('Failed to record communication', {
        executionId: execution.id,
        error: (error as Error).message
      });
      // Don't fail the execution for communication recording errors
    }
  }

  /**
   * Handle execution errors and retry logic
   */
  private async handleExecutionError(execution: CampaignExecution, error: Error): Promise<void> {
    execution.status = 'failed';
    execution.errorMessage = error.message;
    
    logger.error('Campaign execution failed', {
      executionId: execution.id,
      error: error.message,
      attempts: execution.attempts
    });

    // Attempt retry if possible
    if (retryManager.shouldRetry(execution)) {
      retryManager.scheduleRetry(execution);
    } else {
      logger.warn('Execution failed permanently - max retries exceeded', {
        executionId: execution.id,
        attempts: execution.attempts
      });
    }
  }

  /**
   * Get lead email address
   */
  private async getLeadEmail(leadId: string): Promise<{ email: string }> {
    try {
      const { db } = await import('../../db/client');
      const { leads } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');

      const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      const lead = result[0];

      if (!lead || !lead.email) {
        throw new Error(`Lead ${leadId} not found or has no email`);
      }

      return { email: lead.email };
    } catch (error) {
      logger.error('Failed to get lead email', { leadId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Process multiple executions in batch
   */
  async processBatch(executions: CampaignExecution[]): Promise<void> {
    const promises = executions.map(execution => 
      this.processExecution(execution).catch(error => {
        logger.error('Batch execution failed', {
          executionId: execution.id,
          error: (error as Error).message
        });
      })
    );

    await Promise.allSettled(promises);
    
    logger.info('Batch processing completed', {
      totalExecutions: executions.length
    });
  }
}

// Export singleton instance
export const executionProcessor = new ExecutionProcessor();
