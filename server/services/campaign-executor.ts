import { db } from '../db/index';
import { campaigns, leadCampaignEnrollments, leads } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { mailgunService } from './email/mailgun';
import { emailTemplateManager } from './email/templates';

export interface CampaignLead {
  id: string;
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  customData?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'completed';
  sentAt?: Date;
  lastEmailSent?: Date;
  emailsSent: number;
}

export interface CampaignExecution {
  campaignId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  startedAt: Date;
  completedAt?: Date;
  currentStep: number;
  errorMessage?: string;
}

class CampaignExecutor {
  private runningCampaigns = new Map<string, CampaignExecution>();
  private isProcessing = false;

  /**
   * Launch a campaign - start sending emails to all leads
   */
  async launchCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get campaign details
      const campaign = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
      if (!campaign.length) {
        return { success: false, message: 'Campaign not found' };
      }

      const campaignData = campaign[0];
      if (!campaignData.active) {
        return { success: false, message: 'Campaign is not active' };
      }

      // Check if already running
      if (this.runningCampaigns.has(campaignId)) {
        return { success: false, message: 'Campaign is already running' };
      }

      // Get campaign leads with enrollment data
      const enrollments = await db
        .select({
          enrollmentId: leadCampaignEnrollments.id,
          leadId: leadCampaignEnrollments.leadId,
          status: leadCampaignEnrollments.status,
          currentStep: leadCampaignEnrollments.currentStep,
          email: leads.email,
          firstName: leads.firstName,
          lastName: leads.lastName,
          customData: leads.customData
        })
        .from(leadCampaignEnrollments)
        .innerJoin(leads, eq(leadCampaignEnrollments.leadId, leads.id))
        .where(eq(leadCampaignEnrollments.campaignId, campaignId));

      if (!enrollments.length) {
        return { success: false, message: 'No leads found for campaign' };
      }

      // Create execution record
      const execution: CampaignExecution = {
        campaignId,
        status: 'running',
        totalLeads: enrollments.length,
        sentCount: 0,
        failedCount: 0,
        startedAt: new Date(),
        currentStep: 1
      };

      this.runningCampaigns.set(campaignId, execution);

      // Start processing in background
      this.processCampaign(campaignId, campaignData, enrollments).catch(error => {
        console.error(`Campaign ${campaignId} failed:`, error);
        execution.status = 'failed';
        execution.errorMessage = error.message;
        execution.completedAt = new Date();
      });

      return { success: true, message: 'Campaign launched successfully' };
    } catch (error) {
      console.error('Error launching campaign:', error);
      return { success: false, message: 'Failed to launch campaign' };
    }
  }

  /**
   * Process campaign - send emails to all leads
   */
  private async processCampaign(campaignId: string, campaignData: any, enrollments: any[]): Promise<void> {
    const execution = this.runningCampaigns.get(campaignId)!;
    
    try {
      const settings = campaignData.settings || {};
      const templates = settings.templates || [];

      if (!templates.length) {
        throw new Error('No email templates found in campaign');
      }

      // Use first template for now (simple implementation)
      const template = templates[0];

      if (!template) {
        throw new Error('Template is empty or invalid');
      }
      
      // Process enrollments in batches to avoid overwhelming the email service
      const batchSize = 10;
      for (let i = 0; i < enrollments.length; i += batchSize) {
        const batch = enrollments.slice(i, i + batchSize);

        // Process batch
        const results = await Promise.allSettled(
          batch.map(enrollment => this.sendEmailToLead(campaignId, enrollment, template))
        );

        // Update counters
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            execution.sentCount++;
          } else {
            execution.failedCount++;
          }
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Mark as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      
      console.log(`Campaign ${campaignId} completed: ${execution.sentCount} sent, ${execution.failedCount} failed`);
      
    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Send email to individual lead
   */
  private async sendEmailToLead(campaignId: string, enrollment: any, template: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Prepare template variables
      const variables = {
        firstName: enrollment.firstName || 'there',
        lastName: enrollment.lastName || '',
        email: enrollment.email,
        ...enrollment.customData
      };

      // Render template if it's a template ID, otherwise use content directly
      let subject = template.subject || 'Message from our team';
      let html = template.content || template.html || '<p>Hello!</p>';
      let text = template.text || 'Hello!';

      // Simple variable replacement
      subject = this.replaceVariables(subject, variables);
      html = this.replaceVariables(html, variables);
      text = this.replaceVariables(text, variables);

      // Send email
      const result = await mailgunService.sendEmail({
        to: enrollment.email,
        subject,
        html,
        text
      });

      if (result.success) {
        // Update enrollment status in database
        await db.update(leadCampaignEnrollments)
          .set({
            status: 'active',
            lastProcessedAt: new Date(),
            currentStep: (enrollment.currentStep || 0) + 1
          })
          .where(eq(leadCampaignEnrollments.id, enrollment.enrollmentId));
      }

      return { success: result.success, error: result.error };
    } catch (error) {
      console.error(`Failed to send email to ${enrollment.email}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Simple variable replacement
   */
  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
    return result;
  }

  /**
   * Get campaign execution status
   */
  getCampaignStatus(campaignId: string): CampaignExecution | null {
    return this.runningCampaigns.get(campaignId) || null;
  }

  /**
   * Stop a running campaign
   */
  async stopCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const execution = this.runningCampaigns.get(campaignId);
    if (!execution) {
      return { success: false, message: 'Campaign is not running' };
    }

    execution.status = 'paused';
    execution.completedAt = new Date();
    
    return { success: true, message: 'Campaign stopped' };
  }

  /**
   * Get all running campaigns
   */
  getRunningCampaigns(): CampaignExecution[] {
    return Array.from(this.runningCampaigns.values());
  }

  /**
   * Clean up completed campaigns from memory
   */
  cleanup(): void {
    const completed = Array.from(this.runningCampaigns.entries())
      .filter(([_, execution]) => execution.status === 'completed' || execution.status === 'failed')
      .filter(([_, execution]) => {
        const hoursSinceCompletion = execution.completedAt 
          ? (Date.now() - execution.completedAt.getTime()) / (1000 * 60 * 60)
          : 0;
        return hoursSinceCompletion > 1; // Keep for 1 hour after completion
      });

    completed.forEach(([campaignId]) => {
      this.runningCampaigns.delete(campaignId);
    });
  }
}

export const campaignExecutor = new CampaignExecutor();

// Cleanup completed campaigns every hour
setInterval(() => {
  campaignExecutor.cleanup();
}, 60 * 60 * 1000);
