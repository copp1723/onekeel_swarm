import { apiClient } from './api-client';
import type { CampaignData } from '../components/campaign-wizard/types';

/**
 * Transform Campaign Wizard data to backend API format
 */
function transformCampaignData(wizardData: CampaignData) {
  return {
    name: wizardData.name,
    type: 'drip', // Default type for wizard campaigns
    goal: wizardData.goal,
    targetAudience: {
      filters: wizardData.audience.filters,
      targetCount: wizardData.audience.targetCount,
      datasetId: wizardData.audience.datasetId,
      contacts: wizardData.audience.contacts,
      headerMapping: wizardData.audience.headerMapping,
    },
    agentId: wizardData.agentId,
    offerDetails: {
      product: wizardData.offer.product,
      keyBenefits: wizardData.offer.keyBenefits,
      pricing: wizardData.offer.pricing,
      urgency: wizardData.offer.urgency,
      disclaimer: wizardData.offer.disclaimer,
      cta: wizardData.offer.cta,
    },
    emailSequence: wizardData.templates,
    schedule: {
      totalMessages: wizardData.schedule.totalMessages,
      daysBetweenMessages: wizardData.schedule.daysBetweenMessages,
    },
    settings: {
      handoverRules: wizardData.handoverRules,
      context: wizardData.context,
    },
  };
}

/**
 * Create a new campaign from Campaign Wizard data
 */
export async function createCampaign(wizardData: CampaignData) {
  const campaignData = transformCampaignData(wizardData);
  
  console.log('Creating campaign with data:', campaignData);
  
  const response = await apiClient.post('/campaigns', campaignData);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create campaign');
  }
  
  return response.data;
}

/**
 * Get all campaigns
 */
export async function getCampaigns() {
  const response = await apiClient.get('/campaigns');
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch campaigns');
  }
  
  return response.data;
}

/**
 * Get a specific campaign by ID
 */
export async function getCampaign(id: string) {
  const response = await apiClient.get(`/campaigns/${id}`);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch campaign');
  }
  
  return response.data;
}

/**
 * Update a campaign
 */
export async function updateCampaign(id: string, data: Partial<CampaignData>) {
  const campaignData = transformCampaignData(data as CampaignData);
  
  const response = await apiClient.put(`/campaigns/${id}`, campaignData);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update campaign');
  }
  
  return response.data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string) {
  const response = await apiClient.delete(`/campaigns/${id}`);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete campaign');
  }
  
  return response.data;
}
