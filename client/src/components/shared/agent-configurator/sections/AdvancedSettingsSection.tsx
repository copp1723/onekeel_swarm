import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Info } from 'lucide-react';
import { SectionProps } from '../types';
import { AGENT_TYPES } from '@/utils/agentUtils';

/**
 * Simplified Advanced Settings Section Component
 * Uses OpenRouter auto-select model with minimal user configuration
 */
export function AdvancedSettingsSection({ formData, setFormData, errors }: SectionProps) {
  
  const selectedAgentType = AGENT_TYPES.find(type => type.value === formData.type);

  // Set default values for simplified configuration
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      temperature: 70, // Default temperature
      maxTokens: 500,  // Default max tokens
      apiModel: 'openrouter-auto' // Use OpenRouter auto-select
    }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <span className="font-normal text-gray-800">Agent Capabilities</span>
        </CardTitle>
        <CardDescription>
          Communication channels this agent can use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Capabilities */}
        {selectedAgentType && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedAgentType.capabilities.email && (
                <Badge variant="outline" className="flex items-center space-x-1 py-1.5">
                  <span>📧</span>
                  <span>Email</span>
                </Badge>
              )}
              {selectedAgentType.capabilities.sms && (
                <Badge variant="outline" className="flex items-center space-x-1 py-1.5">
                  <span>📱</span>
                  <span>SMS</span>
                </Badge>
              )}
              {selectedAgentType.capabilities.chat && (
                <Badge variant="outline" className="flex items-center space-x-1 py-1.5">
                  <span>💬</span>
                  <span>Chat</span>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* AI Info - Simple explanation */}
        <div className="bg-gray-50 p-3 rounded-lg flex items-start space-x-2">
          <Info className="h-4 w-4 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700">
              This agent uses smart AI technology that automatically selects the best model for each task.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              We've configured optimal settings so you don't have to worry about the technical details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
