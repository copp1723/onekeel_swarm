import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, Plus, Wand2, CheckCircle, AlertCircle, Loader2, Mail, Calendar, Users, MoreVertical, Copy, Edit, Trash2 } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CampaignEditor } from '@/components/email-agent/CampaignEditor';
import { CampaignWizardWrapper } from '@/components/campaign-wizard';

export const CampaignsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        throw new Error(`Failed to load campaigns: ${response.status}`);
      }
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      // Set some mock campaigns for demonstration
      setCampaigns([
        {
          id: 'demo-1',
          name: 'Auto Loan Outreach',
          type: 'standard',
          status: 'active',
          createdAt: new Date().toISOString(),
          leads: 150,
          conversions: 12
        }
      ]);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const cloneCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/campaigns/${campaignId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `${campaignName} (Copy)` }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to clone campaign');
      }

      const data = await response.json();
      setSuccessMessage('Campaign cloned successfully!');
      
      // Refresh the campaigns list
      await loadCampaigns();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return data.campaign;
    } catch (error) {
      console.error('Error cloning campaign:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while cloning the campaign');
      throw error;
    }
  };

  const saveCampaign = async (campaignData: any) => {
    try {
      setError(null);
      
      // First, create leads from CSV contacts if they exist
      let leadIds: string[] = [];
      if (campaignData.audience.contacts && campaignData.audience.contacts.length > 0) {
        const { contacts, headerMapping } = campaignData.audience;
        
        // Create leads from CSV data
        for (const contact of contacts) {
          try {
            const leadPayload = {
              email: contact[headerMapping.email],
              name: contact[headerMapping.firstName] || 'Unknown',
              phone: contact[headerMapping.phone] || '',
              source: 'csv_import',
              metadata: contact
            };
            
            const leadResponse = await fetch('/api/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(leadPayload)
            });
            
            if (leadResponse.ok) {
              const leadResult = await leadResponse.json();
              if (leadResult.lead && leadResult.lead.id) {
                leadIds.push(leadResult.lead.id);
              }
            }
          } catch (error) {
            console.error('Error creating lead:', error);
          }
        }
      }
      
      // Transform wizard data to match API schema
      const payload = {
        name: campaignData.name,
        description: `${campaignData.goal} - ${campaignData.context}`,
        settings: {
          goals: [campaignData.goal],
          qualificationCriteria: {
            minScore: 60,
            requiredFields: ['email', 'phone'],
            requiredGoals: ['interested']
          },
          handoverCriteria: {
            qualificationScore: campaignData.handoverRules?.qualificationScore || 80,
            conversationLength: campaignData.handoverRules?.conversationLength || 10,
            timeThreshold: campaignData.handoverRules?.timeThreshold || 30,
            keywordTriggers: [
              ...(campaignData.handoverRules?.buyingSignals || []),
              ...(campaignData.handoverRules?.escalationPhrases || [])
            ],
            buyingSignals: campaignData.handoverRules?.buyingSignals || ['interested', 'ready', 'pricing'],
            escalationPhrases: campaignData.handoverRules?.escalationPhrases || ['speak to human', 'agent'],
            goalCompletionRequired: campaignData.handoverRules?.goalCompletionRequired || ['qualified'],
            handoverRecipients: campaignData.handoverRules?.handoverRecipients || []
          },
          channelPreferences: {
            primary: 'email',
            fallback: ['sms']
          },
          touchSequence: campaignData.templates.map((template: any, index: number) => ({
            templateId: `template-${index}`,
            delayDays: index * campaignData.schedule.daysBetweenEmails,
            delayHours: 0
          }))
        },
        selectedLeads: leadIds,
        active: true
      };

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to save campaign: ${response.status}`);
      }

      const result = await response.json();
      
      // Trigger the campaign to start sending emails
      if (result.campaign && result.campaign.id && leadIds.length > 0) {
        const triggerResponse = await fetch('/api/campaigns/execution/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: result.campaign.id,
            leadIds: leadIds,
            templates: campaignData.templates // Pass the generated templates
          })
        });
        
        if (!triggerResponse.ok) {
          console.error('Failed to trigger campaign:', await triggerResponse.text());
          setSuccessMessage(`Campaign "${campaignData.name}" created but not started. Please trigger manually.`);
        } else {
          const triggerResult = await triggerResponse.json();
          setSuccessMessage(`Campaign "${campaignData.name}" created and started! Sending emails to ${triggerResult.data.leadCount} leads.`);
        }
      } else {
        setSuccessMessage(`Campaign "${campaignData.name}" created successfully!`);
      }
      
      setTimeout(() => setSuccessMessage(null), 7000);
      
      // Reload campaigns list
      await loadCampaigns();
      
      return result;
    } catch (error) {
      console.error('Error saving campaign:', error);
      setError(error instanceof Error ? error.message : 'Failed to save campaign');
      throw error;
    }
  };

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

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Campaign Wizard with Error Boundary */}
      <CampaignWizardWrapper
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={async (campaign) => {
          try {
            await saveCampaign(campaign);
            setShowWizard(false);
          } catch (error) {
            // Error is already handled in saveCampaign
          }
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
      ) : campaignsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : campaigns.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {campaign.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={campaign.status === 'active' ? 'default' : 'secondary'}
                        className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {campaign.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => cloneCampaign(campaign.id, campaign.name)}
                            className="cursor-pointer"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Clone Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{campaign.type || 'Email Campaign'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{campaign.leads || 0} leads</span>
                    </div>
                    {campaign.conversions !== undefined && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>{campaign.conversions} conversions</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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