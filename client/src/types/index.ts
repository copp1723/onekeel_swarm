export type ViewType = 
  | 'dashboard'
  | 'leads'
  | 'conversations'
  | 'branding'
  | 'agents'
  | 'agent-templates'
  | 'campaigns'
  | 'clients'
  | 'templates'
  | 'users'
  | 'feature-flags'
  | 'email-settings'
  | 'intelligence'
  | 'analytics';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  active: boolean;
}

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentType = 'email' | 'sms' | 'chat' | 'overlord';

export interface AgentCapabilities {
  canSendEmails: boolean;
  canSendSMS: boolean;
  canChat: boolean;
  canSchedule: boolean;
  canAnalyze: boolean;
  canPersonalize: boolean;
  canFollowUp: boolean;
  canSegment: boolean;
  canReport: boolean;
  canIntegrate: boolean;
  email?: boolean;
  sms?: boolean;
  chat?: boolean;
}

export interface UnifiedAgentConfig {
  id: string;
  name: string;
  type: AgentType;
  active: boolean;
  isActive?: boolean;
  role?: string;
  endGoal?: string;
  systemPrompt?: string;
  contextNote?: string;
  temperature: number;
  maxTokens: number;
  personality?: string | { tone: string; style: string; traits: string[] };
  tone?: string;
  responseLength?: string;
  domainExpertise?: string[];
  instructions?: string[] | { dos: string[]; donts: string[] };
  apiModel?: string;
  capabilities?: Record<string, boolean> | AgentCapabilities;
  createdAt: string;
  updatedAt: string;
  description?: string;
  avatar?: string;
  expertise?: string[];
  settings?: {
    responseTime?: number;
    maxConversationLength?: number;
    allowedActions?: string[];
  };
  performance?: {
    totalConversations?: number;
    avgResponseTime?: number;
    averageResponseTime?: number;
    satisfactionScore?: number;
    conversionRate?: number;
    conversations?: number;
    successfulOutcomes?: number;
  };
  metadata?: Record<string, any>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  category: string;
  isDefault: boolean;
  systemPrompt: string;
  contextNote?: string;
  temperature: number;
  maxTokens: number;
  configurableParams: string[];
  defaultParams: Record<string, string>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}