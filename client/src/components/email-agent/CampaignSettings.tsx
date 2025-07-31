// All advanced campaign settings are managed under the unified 'settings' object per CampaignSettings schema.
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare, Target, X } from 'lucide-react';

interface CampaignSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export function CampaignSettings({ settings, onChange }: CampaignSettingsProps) {
  // Helper to update settings by merging changes
  const updateSettings = (changes: any) => {
    onChange({ ...settings, ...changes });
  };

  // Helper to update nested handoverFollowUp settings
  const updateHandoverFollowUp = (changes: any) => {
    onChange({
      ...settings,
      handoverFollowUp: {
        ...settings.handoverFollowUp,
        ...changes,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Campaign Settings</span>
        </CardTitle>
        <CardDescription>
          Configure campaign behavior and AI settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          {/* Enable AI Conversations toggle shown only if conversationMode is not 'template' */}
          {'conversationMode' in settings && settings.conversationMode !== 'template' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable AI Conversations</Label>
                <p className="text-sm text-gray-500">
                  Allow AI to take over when conditions are met
                </p>
              </div>
              <Switch
                checked={settings.enableAIMode}
                onCheckedChange={(checked) =>
                  updateSettings({ enableAIMode: checked })
                }
              />
            </div>
          )}
        </div>

        {/* AI Mode Configuration */}
        {'conversationMode' in settings && settings.conversationMode !== 'template' && settings.enableAIMode && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>AI Conversation Settings</span>
            </h4>

            <div className="space-y-2">
              <Label>Switch to AI Mode When</Label>
              <Select
                value={settings.aiModeThreshold}
                onValueChange={(value: any) =>
                  updateSettings({ aiModeThreshold: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_reply">Lead replies to any email</SelectItem>
                  <SelectItem value="buying_signals">Buying signals detected</SelectItem>
                  <SelectItem value="manual">Manual trigger only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Handover Configuration */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-medium flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Handover Configuration</span>
          </h4>
          
          <div className="space-y-2">
            <Label htmlFor="handoverGoal">Handover Goal</Label>
            <Textarea
              id="handoverGoal"
              value={settings.handoverGoal}
              onChange={(e) =>
                updateSettings({ handoverGoal: e.target.value })
              }
              placeholder="e.g., Qualify they are ready to buy, Schedule a demo, Express strong interest"
              rows={2}
            />
            <p className="text-sm text-gray-500">
              Describe when the AI should hand over to a human agent
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}