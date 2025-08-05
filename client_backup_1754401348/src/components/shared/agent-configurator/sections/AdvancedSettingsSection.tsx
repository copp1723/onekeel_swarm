import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { SectionProps } from '../types';
import { AGENT_TYPES } from '@/utils/agentUtils';

/**
 * Advanced Settings Section Component
 * Handles AI model parameters and advanced configuration
 */
export function AdvancedSettingsSection({ formData, setFormData, errors }: SectionProps) {
  
  const selectedAgentType = AGENT_TYPES.find(type => type.value === formData.type);

  const handleTemperatureChange = ([value]: number[]) => {
    setFormData(prev => ({ ...prev, temperature: value }));
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 500;
    setFormData(prev => ({ ...prev, maxTokens: value }));
  };

  const handleApiModelChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      apiModel: value === 'default' ? undefined : value 
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Advanced Settings</span>
        </CardTitle>
        <CardDescription>
          Fine-tune AI model parameters and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Model Parameters */}
          <div className="space-y-4">
            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {formData.temperature || 70}%
              </Label>
              <Slider
                id="temperature"
                min={0}
                max={100}
                step={5}
                value={[formData.temperature || 70]}
                onValueChange={handleTemperatureChange}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Lower = more focused, Higher = more creative
              </p>
              {errors.temperature && (
                <p className="text-sm text-red-600">{errors.temperature}</p>
              )}
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={50}
                max={4000}
                value={formData.maxTokens || 500}
                onChange={handleMaxTokensChange}
                className={errors.maxTokens ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                Maximum response length (50-4000 tokens)
              </p>
              {errors.maxTokens && (
                <p className="text-sm text-red-600">{errors.maxTokens}</p>
              )}
            </div>
          </div>

          {/* Right Column - Model Selection & Capabilities */}
          <div className="space-y-4">
            {/* API Model */}
            <div className="space-y-2">
              <Label htmlFor="apiModel">API Model (Optional)</Label>
              <Select
                value={formData.apiModel || 'default'}
                onValueChange={handleApiModelChange}
              >
                <SelectTrigger id="apiModel">
                  <SelectValue placeholder="Use default model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use default model</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Override the default AI model for this agent
              </p>
            </div>

            {/* Agent Capabilities */}
            {selectedAgentType && (
              <div className="space-y-2">
                <Label>Capabilities</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedAgentType.capabilities.email && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>📧</span>
                      <span>Email</span>
                    </Badge>
                  )}
                  {selectedAgentType.capabilities.sms && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>📱</span>
                      <span>SMS</span>
                    </Badge>
                  )}
                  {selectedAgentType.capabilities.chat && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>💬</span>
                      <span>Chat</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Communication channels this agent can use
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Summary */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Configuration:</strong> Temperature {formData.temperature || 70}% • 
            Max {formData.maxTokens || 500} tokens • 
            Model: {formData.apiModel || 'Default'}
          </p>
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>💡 Tips:</strong>
          </p>
          <ul className="text-xs text-blue-600 mt-1 space-y-1">
            <li>• Lower temperature (30-50%) for consistent, factual responses</li>
            <li>• Higher temperature (70-90%) for creative, varied responses</li>
            <li>• Increase max tokens for longer, detailed responses</li>
            <li>• Use GPT-4 for complex reasoning, GPT-3.5 for speed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
