export type ViewType = 'dashboard' | 'leads' | 'campaigns' | 'agents' | 'analytics' | 'intelligence' | 'conversations' | 'templates' | 'clients' | 'branding';

export type AgentType = 'email' | 'sms' | 'chat' | 'overlord';

export interface UnifiedAgentConfig {
  id: string;
  name: string;
  type: AgentType;
  isActive: boolean;
  active?: boolean; // alias for isActive
  createdAt: string;
  updatedAt: string;
  description?: string;
  avatar?: string;
  role?: string;
  personality?: {
    tone: string;
    style: string;
    traits: string[];
  };
  capabilities?: AgentCapabilities;
  instructions?: string[] | {
    dos?: string[];
    donts?: string[];
  };
  expertise?: string[];
  domainExpertise?: string[];
  settings?: {
    responseTime?: number;
    maxConversationLength?: number;
    allowedActions?: string[];
  };
  performance?: {
    totalConversations?: number;
    avgResponseTime?: number;
    averageResponseTime?: number; // alias
    satisfactionScore?: number;
    conversionRate?: number;
    conversations?: number; // alias for totalConversations
    successfulOutcomes?: number;
  };
  tone?: string;
  responseLength?: string;
  temperature?: number;
  endGoal?: string;
  maxTokens?: number;
  apiModel?: string;
}

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
  email?: boolean; // alias for canSendEmails
  sms?: boolean; // alias for canSendSMS
  chat?: boolean; // alias for canChat
}