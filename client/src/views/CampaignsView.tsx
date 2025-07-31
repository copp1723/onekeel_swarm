import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Wand2 } from 'lucide-react';
import { CampaignEditor } from '@/components/email-agent/CampaignEditor';
import { CampaignWizard } from '@/components/campaign-wizard';
import { CampaignManagement } from '@/components/campaigns/CampaignManagement';

export const CampaignsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState([]);
  const [campaigns, setCampaigns] = useState([
    {
      id: '1',
      name: 'Auto Loan Outreach',
      description: 'No description',
      status: 'active' as const,
      type: 'standard' as const,
      leadCount: 150,
      conversions: 12,
      createdAt: '2025-07-26T00:00:00.000Z'
    }
  ]);

  useEffect(() => {
    // Load agents
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data.agents || []))
      .catch(console.error);
  }, []);

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

  return (
    <div className="p-6 space-y-6">
      {/* Campaign Wizard Sidebar */}
      <CampaignWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={(campaign) => {
          console.log('Campaign created:', campaign);
          setShowWizard(false);
          // TODO: Save campaign and refresh list
        }}
        agents={agents}
      />

      {showCreateForm ? (
        <CampaignEditor
          agents={agents}
          onSave={() => {
            setShowCreateForm(false);
            // Optionally refresh the list
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