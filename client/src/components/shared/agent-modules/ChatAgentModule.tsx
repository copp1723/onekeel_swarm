import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedAgentConfig } from '@/types';
import { MessageSquare, Users, Clock, Settings, BarChart3, Zap, Globe } from 'lucide-react';

interface ChatAgentModuleProps {
  agent: UnifiedAgentConfig;
  onUpdate?: () => void;
}

interface ChatSettings {
  responseTimeTarget: number; // seconds
  maxConcurrentChats: number;
  autoGreeting: string;
  handoffTriggers: string[];
  workingHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  escalationRules: {
    enabled: boolean;
    maxResponseTime: number;
    keywords: string[];
  };
}

export function ChatAgentModule({ agent, onUpdate }: ChatAgentModuleProps) {
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    responseTimeTarget: 30,
    maxConcurrentChats: 5,
    autoGreeting: "Hi! I'm here to help. How can I assist you today?",
    handoffTriggers: ['human', 'manager', 'escalate'],
    workingHours: {
      enabled: true,
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    },
    escalationRules: {
      enabled: true,
      maxResponseTime: 120,
      keywords: ['urgent', 'complaint', 'refund']
    }
  });

  const [testMessage, setTestMessage] = useState('');
  const [chatPreview, setChatPreview] = useState(false);

  const handleSettingsUpdate = (updates: Partial<ChatSettings>) => {
    setChatSettings(prev => ({ ...prev, ...updates }));
    onUpdate?.();
  };

  const testChatResponse = async () => {
    if (!testMessage.trim()) return;
    
    try {
      const response = await fetch('/api/chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: testMessage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Agent Response: ${data.response}`);
      }
    } catch (error) {
      console.error('Failed to test chat response:', error);
      alert('Failed to test chat response');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>{agent.name} - Chat Agent</span>
          </h3>
          <p className="text-gray-600">Manage live chat settings and performance</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <span>💬</span>
          <span>Chat Specialist</span>
        </Badge>
      </div>

      {/* Chat-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold">{agent.performance?.conversations || 0}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{agent.performance?.averageResponseTime || 0}s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold">{agent.performance?.satisfactionScore || 0}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Chat Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="responseTarget">Response Time Target (seconds)</Label>
                <Input
                  id="responseTarget"
                  type="number"
                  value={chatSettings.responseTimeTarget}
                  onChange={(e) => handleSettingsUpdate({ responseTimeTarget: parseInt(e.target.value) })}
                  min={1}
                  max={300}
                />
              </div>

              <div>
                <Label htmlFor="maxChats">Max Concurrent Chats</Label>
                <Input
                  id="maxChats"
                  type="number"
                  value={chatSettings.maxConcurrentChats}
                  onChange={(e) => handleSettingsUpdate({ maxConcurrentChats: parseInt(e.target.value) })}
                  min={1}
                  max={20}
                />
              </div>

              <div>
                <Label htmlFor="autoGreeting">Auto Greeting Message</Label>
                <Textarea
                  id="autoGreeting"
                  value={chatSettings.autoGreeting}
                  onChange={(e) => handleSettingsUpdate({ autoGreeting: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Working Hours</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={chatSettings.workingHours.enabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({
                        workingHours: { ...chatSettings.workingHours, enabled: checked }
                      })}
                    />
                    <span className="text-sm">Enable working hours</span>
                  </div>
                  {chatSettings.workingHours.enabled && (
                    <div className="flex space-x-2">
                      <Input
                        type="time"
                        value={chatSettings.workingHours.start}
                        onChange={(e) => handleSettingsUpdate({
                          workingHours: { ...chatSettings.workingHours, start: e.target.value }
                        })}
                      />
                      <span className="self-center">to</span>
                      <Input
                        type="time"
                        value={chatSettings.workingHours.end}
                        onChange={(e) => handleSettingsUpdate({
                          workingHours: { ...chatSettings.workingHours, end: e.target.value }
                        })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Escalation Rules</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={chatSettings.escalationRules.enabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({
                        escalationRules: { ...chatSettings.escalationRules, enabled: checked }
                      })}
                    />
                    <span className="text-sm">Auto-escalate to human</span>
                  </div>
                  {chatSettings.escalationRules.enabled && (
                    <div>
                      <Label htmlFor="escalationTime">Max response time before escalation (seconds)</Label>
                      <Input
                        id="escalationTime"
                        type="number"
                        value={chatSettings.escalationRules.maxResponseTime}
                        onChange={(e) => handleSettingsUpdate({
                          escalationRules: { 
                            ...chatSettings.escalationRules, 
                            maxResponseTime: parseInt(e.target.value) 
                          }
                        })}
                        min={30}
                        max={600}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Test Chat Response</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testMessage">Test Message</Label>
            <Textarea
              id="testMessage"
              placeholder="Enter a test message to see how the agent responds..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={testChatResponse}
              disabled={!testMessage.trim()}
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Response
            </Button>
            <Button 
              variant="outline"
              onClick={() => setChatPreview(!chatPreview)}
            >
              <Globe className="h-4 w-4 mr-2" />
              {chatPreview ? 'Hide' : 'Show'} Chat Widget
            </Button>
          </div>
          
          {chatPreview && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm border max-w-sm">
                <div className="bg-blue-600 text-white p-3 rounded-t-lg">
                  <h4 className="font-medium">Chat with {agent.name}</h4>
                </div>
                <div className="p-3 space-y-2">
                  <div className="bg-gray-100 rounded-lg p-2 text-sm">
                    {chatSettings.autoGreeting}
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Powered by AI • Response time: ~{chatSettings.responseTimeTarget}s
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
