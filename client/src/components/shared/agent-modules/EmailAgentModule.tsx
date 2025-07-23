import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedAgentConfig } from '@/types';
import { CampaignManager } from '@/components/email-agent/CampaignManager';
import { TemplateEditor } from '@/components/email-agent/TemplateEditor';
import { CampaignAnalytics } from '@/components/email-agent/CampaignAnalytics';
import { Mail, FileText, BarChart3, Target, Settings } from 'lucide-react';

interface EmailAgentModuleProps {
  agent: UnifiedAgentConfig;
  onUpdate?: () => void;
}

export function EmailAgentModule({ agent, onUpdate }: EmailAgentModuleProps) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns?agentId=${agent.id}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (agent.id) {
      loadCampaigns();
    }
  }, [agent.id]);

  const handleUpdate = () => {
    loadCampaigns();
    onUpdate?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>{agent.name} - Email Agent</span>
          </h3>
          <p className="text-gray-600">Manage email campaigns, templates, and performance</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <span>📧</span>
          <span>Email Specialist</span>
        </Badge>
      </div>

      {/* Agent-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <Mail className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance</p>
                <p className="text-2xl font-bold">{agent.performance?.successfulOutcomes || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email-specific functionality */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Email Campaigns</h4>
            <Button size="sm">
              <Target className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          ) : (
            <CampaignManager 
              agents={[agent]} 
              campaigns={campaigns} 
              onUpdate={handleUpdate} 
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Email Templates</h4>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          <TemplateEditor />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Campaign Analytics</h4>
            <Button size="sm" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
          <CampaignAnalytics campaigns={campaigns} agents={[agent]} />
        </TabsContent>
      </Tabs>

      {/* Agent Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Agent Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Personality</p>
              <p className="font-medium capitalize">{agent.personality?.style || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-600">Tone</p>
              <p className="font-medium capitalize">{agent.tone}</p>
            </div>
            <div>
              <p className="text-gray-600">Response Length</p>
              <p className="font-medium capitalize">{agent.responseLength}</p>
            </div>
            <div>
              <p className="text-gray-600">Temperature</p>
              <p className="font-medium">{agent.temperature}%</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-600 text-sm">End Goal</p>
            <p className="text-sm">{agent.endGoal}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
