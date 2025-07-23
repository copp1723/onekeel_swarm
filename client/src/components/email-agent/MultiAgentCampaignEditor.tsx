import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MessageSquare, Phone, Users, Settings, Shuffle, Target, Trash2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'chat' | 'overlord';
  capabilities: {
    email: boolean;
    sms: boolean;
    chat: boolean;
  };
}

interface AssignedAgent {
  agentId: string;
  channels: ('email' | 'sms' | 'chat')[];
  role: 'primary' | 'secondary' | 'fallback';
  capabilities: {
    email: boolean;
    sms: boolean;
    chat: boolean;
  };
}

interface MultiAgentCampaignEditorProps {
  campaign?: any;
  agents: Agent[];
  onSave: (campaign: any) => void;
  onCancel: () => void;
}

// Move defaultAgents and availableAgents outside component
const defaultAgents: Agent[] = [
  {
    id: 'email-agent-1',
    name: 'Email Agent',
    type: 'email',
    capabilities: { email: true, sms: false, chat: false }
  },
  {
    id: 'sms-agent-1',
    name: 'SMS Agent',
    type: 'sms',
    capabilities: { email: false, sms: true, chat: false }
  },
  {
    id: 'chat-agent-1',
    name: 'Chat Agent',
    type: 'chat',
    capabilities: { email: false, sms: false, chat: true }
  },
  {
    id: 'overlord-agent-1',
    name: 'Overlord Agent',
    type: 'overlord',
    capabilities: { email: true, sms: true, chat: true }
  }
];

function getChannelIcon(channel: string) {
  if (channel === 'email') return <Mail className="h-4 w-4" />;
  if (channel === 'sms') return <Phone className="h-4 w-4" />;
  if (channel === 'chat') return <MessageSquare className="h-4 w-4" />;
  return null;
}
function getRoleColor(role: string) {
  if (role === 'primary') return 'bg-blue-100 text-blue-800';
  if (role === 'secondary') return 'bg-green-100 text-green-800';
  if (role === 'fallback') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
}

export function MultiAgentCampaignEditor({ campaign, agents = [], onSave, onCancel }: MultiAgentCampaignEditorProps) {
  const availableAgents = agents.length > 0 ? agents : defaultAgents;
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    assignedAgents: campaign?.assignedAgents || [] as AssignedAgent[],
    coordinationStrategy: campaign?.coordinationStrategy || 'channel_specific',
    goals: campaign?.goals || [] as string[]
  });

  // Collapse state for goals input (no add button, just array field)
  // TODO: Add advanced coordination toggles/settings in future

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Add agent to assignedAgents
  const addAgent = (agentId: string) => {
    const agent = availableAgents.find(a => a.id === agentId);
    if (!agent) return;
    setFormData(prev => ({
      ...prev,
      assignedAgents: [
        ...prev.assignedAgents,
        {
          agentId,
          channels: agent.capabilities.email ? ['email'] :
            agent.capabilities.sms ? ['sms'] :
            agent.capabilities.chat ? ['chat'] : [],
          role: prev.assignedAgents.length === 0 ? 'primary' : 'secondary',
          capabilities: agent.capabilities
        }
      ]
    }));
  };

  // Remove agent by index
  const removeAgent = (index: number) => setFormData(prev => ({
    ...prev,
    assignedAgents: prev.assignedAgents.filter((_: any, i: number) => i !== index)
  }));

  // Update agent assignment
  const updateAgent = (index: number, updates: Partial<AssignedAgent>) =>
    setFormData(prev => ({
      ...prev,
      assignedAgents: prev.assignedAgents.map((agent: any, i: number) =>
        i === index ? { ...agent, ...updates } : agent
      )
    }));

  // Remove goal by index
  const removeGoal = (index: number) => setFormData(prev => ({
    ...prev,
    goals: prev.goals.filter((_: any, i: number) => i !== index)
  }));

  // Update goal text in array
  const updateGoal = (idx: number, value: string) =>
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.map((g: any, i: number) => i === idx ? value : g)
    }));

  // Add blank goal field
  const addGoalField = () => setFormData(prev => ({
    ...prev,
    goals: [...prev.goals, '']
  }));

  const filteredAgents = availableAgents.filter(agent =>
    !formData.assignedAgents.some((assigned: AssignedAgent) => assigned.agentId === agent.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Multi-Agent Campaign Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Multi-Channel Lead Engagement"
                required
              />
            </div>
            <div>
              <Label htmlFor="coordination">Coordination Strategy</Label>
              <Select
                value={formData.coordinationStrategy}
                onValueChange={value => setFormData(f => ({ ...f, coordinationStrategy: value }))}
              >
                <SelectTrigger id="coordination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">
                    <div className="flex items-center space-x-2">
                      <Shuffle className="h-4 w-4" />
                      <span>Round Robin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="priority_based">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Priority Based</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="channel_specific">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Channel Specific</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the campaign strategy and target audience..."
              rows={3}
            />
          </div>
          {/* Agent Assignment */}
          <div>
            <div className="flex items-center mb-2">
              <Users className="h-4 w-4 mr-2" />
              <span className="font-medium">Agents</span>
              <Badge variant="secondary" className="ml-2">{formData.assignedAgents.length}</Badge>
            </div>
            {filteredAgents.length > 0 && (
              <Select value="" onValueChange={addAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Add agent..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center space-x-2">
                        <span>{agent.name}</span>
                        <div className="flex space-x-1">
                          {agent.capabilities.email && <Mail className="h-3 w-3" />}
                          {agent.capabilities.sms && <Phone className="h-3 w-3" />}
                          {agent.capabilities.chat && <MessageSquare className="h-3 w-3" />}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="space-y-3 mt-4">
              {formData.assignedAgents.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                  <p>No agents assigned yet.</p>
                </div>
              )}
              {formData.assignedAgents.map((assignedAgent: AssignedAgent, index: number) => {
                const agent = availableAgents.find(a => a.id === assignedAgent.agentId);
                if (!agent) return null;
                return (
                  <div key={assignedAgent.agentId} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{agent.name}</span>
                      <Badge className={getRoleColor(assignedAgent.role)}>
                        {assignedAgent.role}
                      </Badge>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2 md:mt-0">
                      <Select
                        value={assignedAgent.role}
                        onValueChange={(value: string) => updateAgent(index, { role: value as "primary" | "secondary" | "fallback" })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="fallback">Fallback</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center space-x-2">
                        {(['email', 'sms', 'chat'] as const).map(channel => (
                          <div key={channel} className="flex items-center space-x-1">
                            <Checkbox
                              checked={assignedAgent.channels.includes(channel)}
                              disabled={!assignedAgent.capabilities[channel]}
                              onCheckedChange={checked => {
                                const newChannels = checked
                                  ? [...assignedAgent.channels, channel]
                                  : assignedAgent.channels.filter(c => c !== channel);
                                updateAgent(index, { channels: newChannels });
                              }}
                            />
                            {getChannelIcon(channel)}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAgent(index)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove agent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Campaign Goals */}
          <div>
            <div className="flex items-center mb-2">
              <Target className="h-4 w-4 mr-2" />
              <span className="font-medium">Campaign Goals</span>
              <Badge variant="secondary" className="ml-2">{formData.goals.length}</Badge>
            </div>
            <div className="space-y-2">
              {formData.goals.map((goal: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Input
                    value={goal}
                    onChange={e => updateGoal(idx, e.target.value)}
                    placeholder="Describe a campaign goal..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoal(idx)}
                    className="text-red-600 hover:text-red-700"
                    title="Remove goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGoalField}>
                + Add Goal
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="flex items-center justify-end gap-4 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {campaign ? 'Update' : 'Create'} Campaign
          </Button>
        </div>
      </Card>
    </form>
  );
}1