export type ViewType = 
  | 'dashboard'
  | 'leads'
  | 'conversations'
  | 'branding'
  | 'agents'
  | 'campaigns'
  | 'clients'
  | 'templates'
  | 'users'
  | 'feature-flags';

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
  capabilities?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
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