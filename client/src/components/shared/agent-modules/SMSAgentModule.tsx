import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { UnifiedAgentConfig } from '@/types';
import { Phone, MessageSquare, Clock, Settings, BarChart3, Send } from 'lucide-react';

interface SMSAgentModuleProps {
  agent: UnifiedAgentConfig;
  onUpdate?: () => void;
}

interface SMSSettings {
  maxMessageLength: number;
  sendingHours: {
    start: string;
    end: string;
  };
  rateLimiting: {
    messagesPerHour: number;
    messagesPerDay: number;
  };
  autoRespond: boolean;
  keywordTriggers: string[];
}

export function SMSAgentModule({ agent, onUpdate }: SMSAgentModuleProps) {
  const [smsSettings, setSmsSettings] = useState<SMSSettings>({
    maxMessageLength: 160,
    sendingHours: { start: '09:00', end: '18:00' },
    rateLimiting: { messagesPerHour: 10, messagesPerDay: 50 },
    autoRespond: true,
    keywordTriggers: ['STOP', 'HELP', 'INFO']
  });

  const [testMessage, setTestMessage] = useState('');
  const [testNumber, setTestNumber] = useState('');

  const handleSettingsUpdate = (updates: Partial<SMSSettings>) => {
    setSmsSettings(prev => ({ ...prev, ...updates }));
    onUpdate?.();
  };

  const sendTestMessage = async () => {
    if (!testMessage.trim() || !testNumber.trim()) return;
    
    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: testMessage,
          phoneNumber: testNumber
        })
      });
      
      if (response.ok) {
        alert('Test message sent successfully!');
        setTestMessage('');
        setTestNumber('');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      alert('Failed to send test message');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>{agent.name} - SMS Agent</span>
          </h3>
          <p className="text-gray-600">Manage SMS campaigns and messaging settings</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <span>📱</span>
          <span>SMS Specialist</span>
        </Badge>
      </div>

      {/* SMS-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages Sent</p>
                <p className="text-2xl font-bold">{agent.performance?.conversations || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">
                  {agent.performance?.conversations ? 
                    Math.round(((agent.performance.successfulOutcomes || 0) / agent.performance.conversations) * 100) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
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
      </div>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>SMS Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="maxLength">Max Message Length</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={smsSettings.maxMessageLength}
                  onChange={(e) => handleSettingsUpdate({ maxMessageLength: parseInt(e.target.value) })}
                  min={1}
                  max={1600}
                />
                <p className="text-xs text-gray-500">Characters per message (160 for single SMS)</p>
              </div>

              <div>
                <Label>Sending Hours</Label>
                <div className="flex space-x-2">
                  <Input
                    type="time"
                    value={smsSettings.sendingHours.start}
                    onChange={(e) => handleSettingsUpdate({
                      sendingHours: { ...smsSettings.sendingHours, start: e.target.value }
                    })}
                  />
                  <span className="self-center">to</span>
                  <Input
                    type="time"
                    value={smsSettings.sendingHours.end}
                    onChange={(e) => handleSettingsUpdate({
                      sendingHours: { ...smsSettings.sendingHours, end: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={smsSettings.autoRespond}
                  onCheckedChange={(checked) => handleSettingsUpdate({ autoRespond: checked })}
                />
                <Label>Auto-respond to incoming messages</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="hourlyLimit">Messages per Hour</Label>
                <Input
                  id="hourlyLimit"
                  type="number"
                  value={smsSettings.rateLimiting.messagesPerHour}
                  onChange={(e) => handleSettingsUpdate({
                    rateLimiting: { 
                      ...smsSettings.rateLimiting, 
                      messagesPerHour: parseInt(e.target.value) 
                    }
                  })}
                  min={1}
                  max={100}
                />
              </div>

              <div>
                <Label htmlFor="dailyLimit">Messages per Day</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  value={smsSettings.rateLimiting.messagesPerDay}
                  onChange={(e) => handleSettingsUpdate({
                    rateLimiting: { 
                      ...smsSettings.rateLimiting, 
                      messagesPerDay: parseInt(e.target.value) 
                    }
                  })}
                  min={1}
                  max={1000}
                />
              </div>

              <div>
                <Label>Keyword Triggers</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {smsSettings.keywordTriggers.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Keywords that trigger automatic responses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-4 w-4" />
            <span>Test SMS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testNumber">Test Phone Number</Label>
              <Input
                id="testNumber"
                placeholder="+1234567890"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="testMessage">Test Message</Label>
              <Textarea
                id="testMessage"
                placeholder="Enter test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                maxLength={smsSettings.maxMessageLength}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {testMessage.length}/{smsSettings.maxMessageLength} characters
              </p>
            </div>
          </div>
          <Button 
            onClick={sendTestMessage}
            disabled={!testMessage.trim() || !testNumber.trim()}
            className="w-full md:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Test Message
          </Button>
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
