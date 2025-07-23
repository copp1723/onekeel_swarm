import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Settings, 
  Send, 
  FileText, 
  Target,
  Brain,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { AgentConfigurator } from './AgentConfigurator';
import { CampaignManager } from './CampaignManager';
import { TemplateEditor } from './TemplateEditor';
import { CampaignAnalytics } from './CampaignAnalytics';

interface Agent {
  id: string;
  name: string;
  role: string;
  endGoal: string;
  instructions: {
    dos: string[];
    donts: string[];
  };
  domainExpertise: string[];
  personality: string;
  tone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  agentId: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  templates: string[];
  schedule: any;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
}

export function EmailAgent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load agents and campaigns
      const [agentsRes, campaignsRes] = await Promise.all([
        fetch('/api/email/agents'),
        fetch('/api/email/campaigns')
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.data || []);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.data || []);
      }
    } catch (error) {
      console.error('Error loading email agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSave = async (agent: Partial<Agent>) => {
    try {
      const url = agent.id 
        ? `/api/email/agents/${agent.id}`
        : '/api/email/agents';
      
      const method = agent.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent)
      });

      if (response.ok) {
        await loadData();
        setShowAgentForm(false);
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Error saving agent:', error);
    }
  };

  const handleAgentDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/email/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email agent system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Agent System</h2>
          <p className="text-gray-600">Configure AI agents for intelligent email campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => {
              setSelectedAgent(null);
              setShowAgentForm(true);
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Agent</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Agents</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.filter(a => a.isActive).length}</div>
                <p className="text-xs text-muted-foreground">
                  {agents.length} total agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {campaigns.length} total campaigns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((acc, c) => acc + c.stats.sent, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round(
                        campaigns.reduce((acc, c) => 
                          acc + (c.stats.opened / c.stats.sent * 100 || 0), 0
                        ) / campaigns.length
                      )
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Across all campaigns</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Latest email campaign activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{campaign.name}</p>
                          <p className="text-xs text-gray-500">
                            {agents.find(a => a.id === campaign.agentId)?.name || 'Unknown Agent'}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No campaigns yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
                <CardDescription>Top performing email agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.filter(a => a.isActive).slice(0, 5).map((agent) => {
                    const agentCampaigns = campaigns.filter(c => c.agentId === agent.id);
                    const totalSent = agentCampaigns.reduce((acc, c) => acc + c.stats.sent, 0);
                    const totalOpened = agentCampaigns.reduce((acc, c) => acc + c.stats.opened, 0);
                    const openRate = totalSent > 0 ? Math.round(totalOpened / totalSent * 100) : 0;

                    return (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-gray-500">{agent.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{openRate}%</p>
                          <p className="text-xs text-gray-500">Open rate</p>
                        </div>
                      </div>
                    );
                  })}
                  {agents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No agents configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          {showAgentForm ? (
            <AgentConfigurator
              agent={selectedAgent}
              onSave={handleAgentSave}
              onCancel={() => {
                setShowAgentForm(false);
                setSelectedAgent(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agents.map((agent) => (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Brain className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <CardDescription>{agent.role}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">End Goal</p>
                        <p className="text-sm text-gray-600">{agent.endGoal}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Domain Expertise</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.domainExpertise.map((expertise, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {expertise}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Personality</p>
                        <p className="text-sm text-gray-600">{typeof agent.personality === 'object' ? (agent.personality as any)?.style : agent.personality || 'Not set'} • {agent.tone} tone</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowAgentForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAgentDelete(agent.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {agents.length === 0 && (
                <Card className="col-span-2">
                  <CardContent className="text-center py-12">
                    <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No agents configured</h3>
                    <p className="text-gray-500 mb-6">Create your first AI email agent to get started.</p>
                    <Button
                      onClick={() => {
                        setSelectedAgent(null);
                        setShowAgentForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Agent
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <CampaignManager agents={agents} campaigns={campaigns} onUpdate={loadData} />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateEditor />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <CampaignAnalytics campaigns={campaigns} agents={agents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}