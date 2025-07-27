import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Wand2 } from 'lucide-react';
import { CampaignEditor } from '@/components/email-agent/CampaignEditor';
import { CampaignWizard } from '@/components/campaign-wizard';

export const CampaignsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    // Load agents
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data.agents || []))
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage your marketing campaigns</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setShowWizard(true)} 
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <Wand2 className="h-4 w-4" />
            <span>Create Campaign</span>
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Classic Editor</span>
          </Button>
        </div>
      </div>

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Campaign Management</span>
            </CardTitle>
            <CardDescription>
              Create and manage email campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Campaigns</h3>
              <p className="text-gray-500 mb-4">
                Create and manage your email marketing campaigns.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 