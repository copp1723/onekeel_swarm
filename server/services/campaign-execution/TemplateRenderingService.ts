import { db } from '../../db/client';
import { leads, emailTemplates } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { emailTemplateManager } from '../../../email-system/services/email-campaign-templates';
import { TemplateRenderData, RenderedTemplate } from './types';
import { logger } from '../../utils/logger';

/**
 * Handles template rendering for campaign executions
 */
export class TemplateRenderingService {
  /**
   * Render template with lead data
   */
  async renderTemplateForLead(
    templateId: string,
    leadId: string
  ): Promise<RenderedTemplate | null> {
    try {
      // Get lead data
      const lead = await this.getLeadData(leadId);
      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      // Get email template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Prepare render data
      const renderData = this.prepareRenderData(lead);

      // Render template
      const rawRenderedContent = await emailTemplateManager.renderTemplate(
        template.id,
        renderData
      );

      if (!rawRenderedContent) {
        throw new Error(`Failed to render template ${templateId}`);
      }

      // Transform to expected format
      const renderedContent = {
        subject: rawRenderedContent.subject || '',
        html: rawRenderedContent.bodyHtml || rawRenderedContent.html || '',
        text: rawRenderedContent.bodyText || rawRenderedContent.text || '',
      };

      return renderedContent;

    } catch (error) {
      logger.error('Template rendering failed', {
        templateId,
        leadId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Get lead data from database
   */
  private async getLeadData(leadId: string): Promise<any | null> {
    try {
      const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get lead data', { leadId, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get template data from database
   */
  private async getTemplate(templateId: string): Promise<any | null> {
    try {
      const result = await db.select().from(emailTemplates)
        .where(eq(emailTemplates.id, templateId)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get template', { templateId, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Prepare render data from lead information
   */
  private prepareRenderData(lead: any): TemplateRenderData {
    const leadMetadata = lead.metadata as Record<string, any> || {};
    
    return {
      firstName: lead.name?.split(' ')[0] || 'there',
      lastName: lead.name?.split(' ').slice(1).join(' ') || '',
      email: lead.email || '',
      phone: lead.phone || '',
      ...leadMetadata
    };
  }

  /**
   * Validate template exists
   */
  async validateTemplate(templateId: string): Promise<boolean> {
    const template = await this.getTemplate(templateId);
    return template !== null;
  }

  /**
   * Validate lead exists
   */
  async validateLead(leadId: string): Promise<boolean> {
    const lead = await this.getLeadData(leadId);
    return lead !== null;
  }

  /**
   * Get template metadata
   */
  async getTemplateMetadata(templateId: string): Promise<{ name?: string; subject?: string } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    return {
      name: template.name,
      subject: template.subject
    };
  }
}

// Export singleton instance
export const templateRenderingService = new TemplateRenderingService();
