import { AgentType, UnifiedAgentConfig } from '@/types';

export const AGENT_TYPES: { 
  value: AgentType; 
  label: string; 
  icon: string; 
  description: string;
  capabilities: {
    email: boolean;
    sms: boolean;
    chat: boolean;
  }
}[] = [
  { 
    value: 'email', 
    label: 'Email', 
    icon: '✉️', 
    description: 'Specialized in email communication and marketing',
    capabilities: { email: true, sms: false, chat: false }
  },
  { 
    value: 'sms', 
    label: 'SMS', 
    icon: '💬', 
    description: 'Handles SMS messaging and text campaigns',
    capabilities: { email: false, sms: true, chat: false }
  },
  { 
    value: 'chat', 
    label: 'Chat', 
    icon: '🗨️', 
    description: 'Manages live chat interactions',
    capabilities: { email: false, sms: false, chat: true }
  },
  { 
    value: 'overlord', 
    label: 'Overlord', 
    icon: '👑', 
    description: 'Master agent that coordinates other agents',
    capabilities: { email: true, sms: true, chat: true }
  }
];

export const PERSONALITY_OPTIONS = {
  professional: 'Professional',
  friendly: 'Friendly',
  casual: 'Casual',
  formal: 'Formal',
  empathetic: 'Empathetic',
  humorous: 'Humorous'
};

export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' }
];

export const RESPONSE_LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'detailed', label: 'Detailed' }
];

export const getAgentTypeColor = (type: AgentType): string => {
  const colors = {
    email: 'bg-blue-100 text-blue-800',
    sms: 'bg-green-100 text-green-800',
    chat: 'bg-purple-100 text-purple-800',
    overlord: 'bg-red-100 text-red-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const getAgentTypeIcon = (type: AgentType): string => {
  const icons = {
    email: '✉️',
    sms: '💬',
    chat: '🗨️',
    overlord: '👑'
  };
  return icons[type] || '🤖';
};

export const formatAgentType = (type: AgentType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const getAgentTypeInfo = (type: AgentType) => {
  return {
    color: getAgentTypeColor(type),
    icon: getAgentTypeIcon(type),
    label: formatAgentType(type)
  };
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const getAgentStatusBadge = (isActive: boolean | undefined): {
  color: string;
  label: string;
  variant: BadgeVariant;
  text: string;
} => {
  const active = isActive ?? false;
  return {
    color: active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
    label: active ? 'Active' : 'Inactive',
    variant: active ? 'default' : 'secondary',
    text: active ? 'Active' : 'Inactive'
  };
};

export const cleanAgentConfig = (config: Partial<UnifiedAgentConfig>): UnifiedAgentConfig => {
  return {
    id: config.id || '',
    name: config.name || '',
    type: config.type || 'email',
    isActive: config.isActive || false,
    active: config.isActive || false,
    createdAt: config.createdAt || new Date().toISOString(),
    updatedAt: config.updatedAt || new Date().toISOString(),
    ...config
  } as UnifiedAgentConfig;
};

export const getDefaultConfigForType = (type: AgentType): Partial<UnifiedAgentConfig> => {
  const baseConfig: Partial<UnifiedAgentConfig> = {
    type,
    isActive: true,
    personality: {
      tone: 'professional',
      style: 'balanced',
      traits: []
    },
    capabilities: {
      canSendEmails: type === 'email',
      canSendSMS: type === 'sms',
      canChat: type === 'chat',
      canSchedule: true,
      canAnalyze: true,
      canPersonalize: true,
      canFollowUp: true,
      canSegment: true,
      canReport: true,
      canIntegrate: true
    },
    temperature: 0.7,
    responseLength: 'moderate'
  };

  switch (type) {
    case 'email':
      return {
        ...baseConfig,
        name: 'Email Agent',
        description: 'AI agent specialized in email communication'
      };
    case 'sms':
      return {
        ...baseConfig,
        name: 'SMS Agent',
        description: 'AI agent specialized in SMS messaging'
      };
    case 'chat':
      return {
        ...baseConfig,
        name: 'Chat Agent',
        description: 'AI agent specialized in live chat'
      };
    case 'overlord':
      return {
        ...baseConfig,
        name: 'Overlord Agent',
        description: 'Master AI agent that coordinates other agents'
      };
    default:
      return baseConfig;
  }
};

export const validateAgentConfig = (config: Partial<UnifiedAgentConfig>): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!config.name || config.name.trim().length === 0) {
    errors.name = 'Agent name is required';
  }
  
  if (!config.type) {
    errors.type = 'Agent type is required';
  }
  
  if (!config.role || config.role.trim().length === 0) {
    errors.role = 'Agent role is required';
  }
  
  if (!config.endGoal || config.endGoal.trim().length === 0) {
    errors.endGoal = 'End goal is required';
  }
  
  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 100)) {
    errors.temperature = 'Temperature must be between 0 and 100';
  }
  
  if (config.maxTokens !== undefined && (config.maxTokens < 50 || config.maxTokens > 4000)) {
    errors.maxTokens = 'Max tokens must be between 50 and 4000';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};