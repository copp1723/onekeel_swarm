import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Wand2 } from 'lucide-react';
import { CampaignEditor } from '@/components/email-agent/CampaignEditor';
import { CampaignWizardWrapper } from '@/components/campaign-wizard';

export const CampaignsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  useEffect(() => {
    // Load agents with proper error handling
    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        setAgentsError(null);
        
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error(`Failed to load agents: ${response.status}`);
        }
        
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error('Error loading agents:', error);
        setAgentsError(error instanceof Error ? error.message : 'Unknown error');
        
        // Set fallback agents if API fails
        setAgents([
          { id: 'fallback-1', name: 'Email Agent', type: 'email' },
          { id: 'fallback-2', name: 'Sales Agent', type: 'email' }
        ]);
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
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
            disabled={agentsLoading}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" />
            <span>{agentsLoading ? 'Loading...' : 'Create Campaign'}</span>
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)} 
            disabled={agentsLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Classic Editor</span>
          </Button>
        </div>
      </div>

      {/* Campaign Wizard with Error Boundary */}
      <CampaignWizardWrapper
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