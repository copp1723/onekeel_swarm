/**
 * Email Job Processor
 * Handles email sending jobs
 */

import { Job } from 'bullmq';
import { createLogger } from '../utils/enhanced-logger.js';
import { ExternalServiceError } from '../utils/errors.js';

const logger = createLogger('email-processor');
// Import the email service
import { EmailService } from '../services/email.js';

// Create email service instance for compatibility
const emailService = {
  async sendHandoffEmail(email: string, name: string, dossier: any) {
    const result = await EmailService.sendEmail(
      email,
      'Lead Handoff - Ready for Human Engagement',
      `Hello ${name}, your inquiry has been processed. Dossier: ${JSON.stringify(dossier)}`
    );
    return result.success;
  }
};

export interface EmailJobData {
  type: 'handoff' | 'notification' | 'welcome';
  customerId: string;
  to: string;
  subject?: string;
  data: Record<string, any>;
}

export async function processEmailJob(job: Job<EmailJobData>) {
  const { type, customerId, to, data } = job.data;
  
  logger.info(`Processing ${type} email`, {
    jobId: job.id,
    customerId,
    to
  });

  try {
    switch (type) {
      case 'handoff':
        const success = await emailService.sendHandoffEmail(
          data.customerEmail || to,
          data.customerName || 'Customer',
          data.dossier || data
        );
        
        if (!success) {
          throw new ExternalServiceError('Mailgun', 'Failed to send handoff email');
        }
        
        return { success: true, emailType: type };
      
      case 'notification':
      case 'welcome':
        // Implement other email types as needed
        logger.warn(`Email type ${type} not yet implemented`);
        return { success: false, reason: 'Not implemented' };
      
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  } catch (error) {
    logger.error(`Failed to process ${type} email`, {
      jobId: job.id,
      customerId,
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
  }
}