import { logger } from '../../server/utils/logger';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  category: 'campaign' | 'transactional' | 'follow-up';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignTemplate extends EmailTemplate {
  category: 'campaign';
  sequenceOrder?: number;
  triggerConditions?: Record<string, any>;
}

export class EmailCampaignTemplateManager {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{companyName}}!',
        bodyHtml: '<h1>Welcome {{leadName}}!</h1><p>Thank you for your interest in our services.</p>',
        bodyText: 'Welcome {{leadName}}! Thank you for your interest in our services.',
        variables: ['leadName', 'companyName'],
        category: 'campaign',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'follow-up',
        name: 'Follow-up Email',
        subject: 'Following up on your inquiry',
        bodyHtml: '<p>Hi {{leadName}},</p><p>I wanted to follow up on your recent inquiry.</p>',
        bodyText: 'Hi {{leadName}}, I wanted to follow up on your recent inquiry.',
        variables: ['leadName'],
        category: 'follow-up',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info('Email campaign templates initialized', { 
      count: defaultTemplates.length 
    });
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getActiveTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.isActive);
  }

  async getTemplatesByCategory(category: EmailTemplate['category']): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const newTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(id, newTemplate);
    
    logger.info('Email template created', { 
      id, 
      name: template.name,
      category: template.category 
    });

    return id;
  }

  async updateTemplate(
    templateId: string, 
    updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) return false;

    const updatedTemplate: EmailTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updatedTemplate);
    
    logger.info('Email template updated', { 
      id: templateId,
      updates: Object.keys(updates) 
    });

    return true;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const deleted = this.templates.delete(templateId);
    
    if (deleted) {
      logger.info('Email template deleted', { id: templateId });
    }

    return deleted;
  }

  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<{
    subject: string;
    bodyHtml: string;
    bodyText: string;
  } | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Simple variable replacement
    const renderText = (text: string) => {
      let rendered = text;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value));
      });
      return rendered;
    };

    return {
      subject: renderText(template.subject),
      bodyHtml: renderText(template.bodyHtml),
      bodyText: renderText(template.bodyText)
    };
  }

  async validateTemplate(template: Partial<EmailTemplate>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.subject?.trim()) {
      errors.push('Template subject is required');
    }

    if (!template.bodyHtml?.trim() && !template.bodyText?.trim()) {
      errors.push('Template must have either HTML or text body');
    }

    if (!template.category) {
      errors.push('Template category is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async duplicateTemplate(templateId: string, newName?: string): Promise<string | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const duplicate = {
      ...template,
      name: newName || `${template.name} (Copy)`,
      isActive: false // Start as inactive
    };

    delete (duplicate as any).id;
    delete (duplicate as any).createdAt;
    delete (duplicate as any).updatedAt;

    return await this.createTemplate(duplicate);
  }

  getStats(): {
    total: number;
    active: number;
    byCategory: Record<string, number>;
  } {
    const templates = Array.from(this.templates.values());
    const byCategory: Record<string, number> = {};

    templates.forEach(template => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    });

    return {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      byCategory
    };
  }
}

export const emailCampaignTemplateManager = new EmailCampaignTemplateManager();
export const emailTemplateManager = emailCampaignTemplateManager; // Alias for compatibility