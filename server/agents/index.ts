export { BaseAgent } from './base-agent';
export { UnifiedCampaignAgent } from './unified-campaign-agent';
export { EmailAgent } from './email-agent';
export { SMSAgent } from './sms-agent';
export { ChatAgent } from './chat-agent';

import { UnifiedCampaignAgent } from './unified-campaign-agent';
import { EmailAgent } from './email-agent';
import { SMSAgent } from './sms-agent';
import { ChatAgent } from './chat-agent';

// Singleton instances
let unifiedCampaignAgent: UnifiedCampaignAgent;
let emailAgent: EmailAgent;
let smsAgent: SMSAgent;
let chatAgent: ChatAgent;

export function getUnifiedCampaignAgent(): UnifiedCampaignAgent {
  if (!unifiedCampaignAgent) {
    unifiedCampaignAgent = new UnifiedCampaignAgent();
  }
  return unifiedCampaignAgent;
}

export function getEmailAgent(): EmailAgent {
  if (!emailAgent) {
    emailAgent = new EmailAgent();
  }
  return emailAgent;
}

export function getSMSAgent(): SMSAgent {
  if (!smsAgent) {
    smsAgent = new SMSAgent();
  }
  return smsAgent;
}

export function getChatAgent(): ChatAgent {
  if (!chatAgent) {
    chatAgent = new ChatAgent();
  }
  return chatAgent;
}

// Legacy function for backward compatibility
export function getOverlordAgent(): UnifiedCampaignAgent {
  return getUnifiedCampaignAgent();
}

export function getAgentByType(type: string) {
  switch (type) {
    case 'unified':
    case 'campaign':
    case 'email':
    case 'sms':
    case 'chat':
      return getUnifiedCampaignAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}