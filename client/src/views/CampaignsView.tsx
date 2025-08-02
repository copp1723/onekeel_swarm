import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Target, Plus, Wand2 } from 'lucide-react';
import { CampaignEditor } from '@/components/email-agent/CampaignEditor';
import { CampaignWizard } from '@/components/campaign-wizard';
import { CampaignManagement } from '@/components/campaigns/CampaignManagement';
import { CampaignData } from '@/components/campaign-wizard/types';

export const CampaignsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, campaignsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/campaigns'),
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      } else {
        console.error('Failed to fetch campaigns');
        setError('Failed to load campaigns');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (campaignId: string) => {
    console.log('Edit campaign:', campaignId);
    // TODO: Implement edit functionality
  };

  const handleCloneCampaign = (campaignId: string) => {
    console.log('Clone campaign:', campaignId);
    // TODO: Implement clone functionality
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(campaigns.filter(c => c.id !== campaignId));
  };

  const transformCampaignData = (wizardData: CampaignData) => {
    return {
      name: wizardData.name,
      description: wizardData.description,
      type: 'drip' as const,
      settings: {
        goal: wizardData.goal,
        context: wizardData.context,
        agentId: wizardData.agentId,
        offer: wizardData.offer,
        templates: wizardData.templates,
        schedule: wizardData.schedule,
        handoverRules: wizardData.handoverRules,
      },
      audience: wizardData.audience,
      startDate: wizardData.schedule.startDate || new Date().toISOString(),
      targetCriteria: {
        filters: wizardData.audience.filters,
      },
    };
  };

  const handleCampaignComplete = async (campaignData: CampaignData) => {
    try {
      setLoading(true);
      const transformedData = transformCampaignData(campaignData);

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Campaign created successfully:', result);

        // Close wizard and refresh campaigns list
        setShowWizard(false);
        await loadData();

        // Optionally launch the campaign immediately
        if (result.campaign?.id) {
          await launchCampaign(result.campaign.id);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to create campaign:', errorData);
        setError(
          `Failed to create campaign: ${errorData.error?.message || 'Unknown error'}`
        );
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const launchCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Campaign launched successfully');
      } else {
        console.error('Failed to launch campaign');
      }
    } catch (err) {
      console.error('Error launching campaign:', err);
    }
  };

  if (loading) {
    return (
      <div className='p-6 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6'>
      {error && (
        <div className='bg-red-50 border border-red-200 rounded-md p-4'>
          <div className='flex'>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800'>Error</h3>
              <div className='mt-2 text-sm text-red-700'>
                <p>{error}</p>
              </div>
              <div className='mt-4'>
                <button
                  type='button'
                  className='bg-red-100 px-2 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200'
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Wizard Sidebar */}
      <CampaignWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleCampaignComplete}
        agents={agents}
      />

      {showCreateForm ? (
        <CampaignEditor
          agents={agents}
          onSave={() => {
            setShowCreateForm(false);
            loadData(); // Refresh the list
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <CampaignManagement
          campaigns={campaigns}
          onCreateCampaign={() => setShowWizard(true)}
          onEditCampaign={handleEditCampaign}
          onCloneCampaign={handleCloneCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onOpenClassicEditor={() => setShowCreateForm(true)}
        />
      )}
    </div>
  );
};
