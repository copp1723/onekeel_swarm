import { logger } from '../utils/logger';

export interface HandoverRecipient {
  name: string;
  email: string;
  role?: string;
  priority?: string;
}

export class HandoverEmailService {
  /**
   * Send handover notification email to recipients
   */
  static async sendHandoverNotification(
    leadName: string,
    dossier: any,
    recipients: HandoverRecipient[],
    conversationId?: string
  ): Promise<boolean> {
    try {
      logger.info('Sending handover notification emails', {
        leadName,
        recipientCount: recipients.length,
        conversationId,
        urgency: dossier.handoverTrigger?.urgency
      });

      // In a real implementation, this would use the actual email service
      // For now, we'll simulate the email sending
      
      const emailContent = this.generateHandoverEmailContent(leadName, dossier, conversationId);
      
      let successCount = 0;
      
      for (const recipient of recipients) {
        try {
          // Simulate email sending
          const sent = await this.sendEmailToRecipient(recipient, emailContent, dossier);
          if (sent) {
            successCount++;
            logger.info('Handover email sent successfully', {
              recipient: recipient.email,
              leadName,
              conversationId
            });
          }
        } catch (recipientError) {
          logger.error('Failed to send handover email to recipient', {
            recipient: recipient.email,
            error: (recipientError as Error).message
          });
        }
      }
      
      const allSent = successCount === recipients.length;
      
      logger.info('Handover email batch completed', {
        leadName,
        totalRecipients: recipients.length,
        successCount,
        allSent,
        conversationId
      });
      
      return allSent;
      
    } catch (error) {
      logger.error('Error sending handover notification emails', {
        leadName,
        recipientCount: recipients.length,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Send Slack notification for urgent handovers
   */
  static async sendSlackNotification(
    leadName: string,
    dossier: any,
    conversationId?: string
  ): Promise<boolean> {
    try {
      logger.info('Sending Slack notification for urgent handover', {
        leadName,
        conversationId,
        urgency: dossier.handoverTrigger?.urgency
      });

      // In a real implementation, this would use the Slack API
      // For now, we'll simulate the notification
      
      const slackMessage = this.generateSlackMessage(leadName, dossier, conversationId);
      
      // Simulate Slack webhook call
      const sent = await this.sendSlackMessage(slackMessage);
      
      if (sent) {
        logger.info('Slack notification sent successfully', {
          leadName,
          conversationId
        });
      } else {
        logger.warn('Failed to send Slack notification', {
          leadName,
          conversationId
        });
      }
      
      return sent;
      
    } catch (error) {
      logger.error('Error sending Slack notification', {
        leadName,
        conversationId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Generate email content for handover notification
   */
  private static generateHandoverEmailContent(
    leadName: string,
    dossier: any,
    conversationId?: string
  ): string {
    const urgencyEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };

    const urgency = dossier.handoverTrigger?.urgency || 'medium';
    const emoji = urgencyEmoji[urgency as keyof typeof urgencyEmoji] || '🟡';

    return `
Subject: ${emoji} Lead Handover Required: ${leadName}

Dear Team,

A lead has been handed over to human agents and requires immediate attention.

LEAD DETAILS:
- Name: ${leadName}
- Email: ${dossier.leadSnapshot?.email || 'Not provided'}
- Phone: ${dossier.leadSnapshot?.phone || 'Not provided'}
- Source: ${dossier.leadSnapshot?.source || 'Unknown'}
- Qualification Score: ${dossier.leadSnapshot?.qualificationScore || 0}/10

HANDOVER INFORMATION:
- Reason: ${dossier.handoverTrigger?.reason || 'Manual handover'}
- Urgency: ${urgency.toUpperCase()}
- Triggered Criteria: ${dossier.handoverTrigger?.triggeredCriteria?.join(', ') || 'None specified'}
- Timestamp: ${dossier.handoverTrigger?.timestamp || new Date().toISOString()}

CONVERSATION SUMMARY:
- Messages: ${dossier.conversationSummary?.messageCount || 0}
- Last Activity: ${dossier.conversationSummary?.lastActivity || 'Not available'}
- Key Topics: ${dossier.conversationSummary?.keyTopics?.join(', ') || 'None identified'}
- Sentiment: ${dossier.conversationSummary?.sentiment || 'Neutral'}

RECOMMENDATIONS:
- Priority: ${dossier.recommendations?.priority?.toUpperCase() || 'MEDIUM'}
- Approach Strategy: ${dossier.recommendations?.approachStrategy || 'Standard follow-up'}
- Next Steps:
${dossier.recommendations?.nextSteps?.map((step: string) => `  • ${step}`).join('\n') || '  • Contact lead'}

${conversationId ? `Conversation ID: ${conversationId}` : ''}

Please follow up with this lead according to the urgency level and recommendations provided.

Best regards,
OneKeel AI Agent System
    `.trim();
  }

  /**
   * Generate Slack message for urgent handover
   */
  private static generateSlackMessage(
    leadName: string,
    dossier: any,
    conversationId?: string
  ): string {
    const urgency = dossier.handoverTrigger?.urgency || 'medium';
    const urgencyEmoji = urgency === 'high' ? '🚨' : '⚠️';

    return `
${urgencyEmoji} *URGENT LEAD HANDOVER*

*Lead:* ${leadName}
*Score:* ${dossier.leadSnapshot?.qualificationScore || 0}/10
*Reason:* ${dossier.handoverTrigger?.reason || 'Manual handover'}
*Priority:* ${dossier.recommendations?.priority?.toUpperCase() || 'MEDIUM'}

*Next Steps:* ${dossier.recommendations?.nextSteps?.[0] || 'Contact lead'}

${conversationId ? `Conversation: ${conversationId}` : ''}
    `.trim();
  }

  /**
   * Send email to individual recipient (simulated)
   */
  private static async sendEmailToRecipient(
    recipient: HandoverRecipient,
    content: string,
    dossier: any
  ): Promise<boolean> {
    try {
      // In a real implementation, this would use MailgunService or another email provider
      // For now, we'll simulate the email sending with a delay
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      // Simulate occasional failures (10% failure rate)
      const shouldFail = Math.random() < 0.1;
      if (shouldFail) {
        throw new Error('Simulated email delivery failure');
      }
      
      logger.debug('Email sent successfully (simulated)', {
        recipient: recipient.email,
        name: recipient.name,
        role: recipient.role,
        priority: recipient.priority
      });
      
      return true;
      
    } catch (error) {
      logger.error('Failed to send email to recipient', {
        recipient: recipient.email,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Send Slack message (simulated)
   */
  private static async sendSlackMessage(message: string): Promise<boolean> {
    try {
      // In a real implementation, this would use Slack webhook or API
      // For now, we'll simulate the Slack sending
      
      await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
      
      // Simulate occasional failures (5% failure rate)
      const shouldFail = Math.random() < 0.05;
      if (shouldFail) {
        throw new Error('Simulated Slack webhook failure');
      }
      
      logger.debug('Slack message sent successfully (simulated)', {
        messageLength: message.length
      });
      
      return true;
      
    } catch (error) {
      logger.error('Failed to send Slack message', {
        error: (error as Error).message
      });
      return false;
    }
  }
}