import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Settings, BarChart3, Zap, Users, Target, Bot, Cog, FileText, Mail } from 'lucide-react';
import { AgentManagementDashboard } from '@/components/shared';
import { MultiAgentCampaignEditor } from '@/components/email-agent/MultiAgentCampaignEditor';
import { TemplateEditor } from '@/components/email-agent/TemplateEditor';
import { CampaignAnalytics } from '@/components/email-agent/CampaignAnalytics';
import { useAgents } from '@/hooks/useAgents';

interface CampaignIntelligenceHubProps {
  campaigns: any[];
  onUpdate: () => void;
}

export function CampaignIntelligenceHub({ campaigns, onUpdate }: CampaignIntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { agents } = useAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Agent Management Hub
          </h2>
          <p className="text-gray-600">AI-powered agent management and campaign orchestration</p>
        </div>
        <Button onClick={() => window.location.href = '/campaigns/new'}>
          <Zap className="h-4 w-4 mr-2" />
          Create Smart Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Total Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.length}</div>
                <p className="text-xs text-gray-500">AI agents configured</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Active Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</div>
                <p className="text-xs text-gray-500">Running intelligently</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Multi-Agent Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.filter(c => c.assignedAgents?.length > 1).length}</div>
                <p className="text-xs text-gray-500">Cross-channel coordination</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Active Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.filter(a => a.active).length}</div>
                <p className="text-xs text-gray-500">Currently running</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab - Individual Agent Management */}
        <TabsContent value="agents">
          <AgentManagementDashboard
            showCreateButton={true}
            allowEdit={true}
            allowDelete={true}
            compact={false}
            showAgentDetails={true}
          />
        </TabsContent>



        {/* Analytics Tab - Campaign Performance */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Campaign Analytics</h3>
                <p className="text-gray-600">Monitor performance across all campaigns and agents</p>
              </div>
            </div>
            <CampaignAnalytics campaigns={campaigns} agents={agents} />
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
}