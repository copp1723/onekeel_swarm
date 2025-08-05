export { BaseAgent } from './base-agent';
export { UnifiedCampaignAgent } from './unified-campaign-agent';

import { UnifiedCampaignAgent } from './unified-campaign-agent';

// Singleton instance
let unifiedCampaignAgent: UnifiedCampaignAgent;

export function getUnifiedCampaignAgent(): UnifiedCampaignAgent {
  if (!unifiedCampaignAgent) {
    unifiedCampaignAgent = new UnifiedCampaignAgent();
  }
  return unifiedCampaignAgent;
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