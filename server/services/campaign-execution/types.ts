/**
 * Core types for campaign execution system
 */

export interface CampaignTrigger {
  type: 'email' | 'time' | 'lead_status' | 'manual';
  conditions: {
    emailSubject?: string;
    emailFrom?: string;
    leadStatus?: string;
    timeDelay?: number; // minutes
    campaignId?: string;
  };
}

export interface CampaignExecution {
  id: string;
  campaignId: string;
  leadId: string;
  templateId: string;
  scheduledFor: Date;
  status: 'scheduled' | 'executing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  errorMessage?: string;
}

export interface ExecutionStats {
  total: number;
  scheduled: number;
  executing: number;
  completed: number;
  failed: number;
  executions: CampaignExecution[];
}

export interface LeadAssignmentOptions {
  campaignId: string;
  leadIds: string[];
  templateSequence?: string[];
}

export interface TemplateRenderData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  [key: string]: any;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface RetryConfig {
  maxAttempts: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  retryDelayMs: 300000, // 5 minutes
  backoffMultiplier: 1.5
};

export const DEFAULT_TEMPLATE_SEQUENCE = [
  'welcome_application',
  'followup_24h',
  'followup_3day',
  'followup_7day'
];
