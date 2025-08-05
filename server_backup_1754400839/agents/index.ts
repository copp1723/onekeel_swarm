export { BaseAgent } from './base-agent';
export { UnifiedCampaignAgent } from './unified-campaign-agent';

import { UnifiedCampaignAgent } from './unified-campaign-agent';

// Singleton instance - one unified agent handles all channels
let unifiedCampaignAgent: UnifiedCampaignAgent;

export function getUnifiedCampaignAgent(): UnifiedCampaignAgent {
  if (!unifiedCampaignAgent) {
    unifiedCampaignAgent = new UnifiedCampaignAgent();
  }
  return unifiedCampaignAgent;
}

// Legacy functions for backward compatibility - all return the unified agent
export function getEmailAgent(): UnifiedCampaignAgent {
  return getUnifiedCampaignAgent();
}

export function getSMSAgent(): UnifiedCampaignAgent {
  return getUnifiedCampaignAgent();
}

export function getChatAgent(): UnifiedCampaignAgent {
  return getUnifiedCampaignAgent();
}

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