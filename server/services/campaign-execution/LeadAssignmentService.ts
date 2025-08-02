import { db } from '../../db/client';
import { campaigns, leads } from '../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { executionScheduler } from './ExecutionScheduler';
import { DEFAULT_TEMPLATE_SEQUENCE } from './types';
import { logger } from '../../utils/logger';

/**
 * Handles lead assignment to campaigns and triggering campaign sequences
 */
export class LeadAssignmentService {
  /**
   * Manually trigger a campaign for specific leads
   */
  async triggerCampaign(
    campaignId: string,
    leadIds: string[],
    templateSequence?: string[]
  ): Promise<void> {
    try {
      logger.info('Manually triggering campaign', {
        campaignId,
        leadCount: leadIds.length,
      });

      // Get campaign details
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (!campaign.active) {
        throw new Error(`Campaign ${campaignId} is not active`);
      }

      // Get template sequence
      const templates =
        templateSequence || (await this.getTemplateSequence(campaign));

      // Schedule executions for each lead
      for (const leadId of leadIds) {
        await this.assignLeadToCampaign(leadId, campaignId, templates);
      }

      logger.info('Campaign triggered successfully', {
        campaignId,
        leadCount: leadIds.length,
        templateCount: templates.length,
      });
    } catch (error) {
      logger.error('Failed to trigger campaign:', error as Error);
      throw error;
    }
  }

  /**
   * Auto-assign new leads to active campaigns
   */
  async autoAssignLeads(): Promise<void> {
    try {
      // Get unassigned leads
      const unassignedLeads = await this.getUnassignedLeads();
      if (unassignedLeads.length === 0) {
        logger.debug('No unassigned leads found');
        return;
      }

      // Get active campaigns
      const activeCampaigns = await this.getActiveCampaigns();
      if (activeCampaigns.length === 0) {
        logger.warn('No active campaigns found for lead assignment');
        return;
      }

      // Simple assignment logic - assign to first active campaign
      // In a real implementation, this would use more sophisticated matching
      const defaultCampaign = activeCampaigns[0];

      const leadIds = unassignedLeads.map(lead => lead.id);
      await this.triggerCampaign(defaultCampaign.id, leadIds);

      logger.info('Auto-assigned leads to campaigns', {
        leadCount: unassignedLeads.length,
        campaignId: defaultCampaign.id,
      });
    } catch (error) {
      logger.error('Failed to auto-assign leads:', error as Error);
    }
  }

  /**
   * Assign a single lead to a campaign with template sequence
   */
  private async assignLeadToCampaign(
    leadId: string,
    campaignId: string,
    templates: string[]
  ): Promise<void> {
    try {
      // Update lead's campaign assignment
      await db
        .update(leads)
        .set({
          campaignId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      // Schedule template executions
      await executionScheduler.scheduleLeadCampaign(
        leadId,
        campaignId,
        templates
      );

      logger.debug('Lead assigned to campaign', {
        leadId,
        campaignId,
        templateCount: templates.length,
      });
    } catch (error) {
      logger.error('Failed to assign lead to campaign:', error as Error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  private async getCampaign(campaignId: string): Promise<any | null> {
    try {
      const result = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get campaign', {
        campaignId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Get unassigned leads
   */
  private async getUnassignedLeads(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(leads)
        .where(and(isNull(leads.campaignId), eq(leads.status, 'new')));
    } catch (error) {
      logger.error('Failed to get unassigned leads', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Get active campaigns
   */
  private async getActiveCampaigns(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.active, true));
    } catch (error) {
      logger.error('Failed to get active campaigns', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Get template sequence for a campaign
   */
  private async getTemplateSequence(campaign: any): Promise<string[]> {
    // Check if campaign has touchSequence in settings
    if (campaign.settings?.touchSequence) {
      return campaign.settings.touchSequence.map(
        (touch: any) => touch.templateId
      );
    }

    // Fallback to default sequence
    return DEFAULT_TEMPLATE_SEQUENCE;
  }

  /**
   * Remove lead from campaign
   */
  async removeLeadFromCampaign(leadId: string): Promise<void> {
    try {
      await db
        .update(leads)
        .set({
          campaignId: null,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      // Cancel any scheduled executions for this lead
      executionScheduler.cancelExecutions(undefined, leadId);

      logger.info('Lead removed from campaign', { leadId });
    } catch (error) {
      logger.error('Failed to remove lead from campaign', {
        leadId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const leadAssignmentService = new LeadAssignmentService();
