import React from 'react';
import { UnifiedAgentConfig, AgentType } from '@/types';
import { EmailAgentModule } from './EmailAgentModule';
import { SMSAgentModule } from './SMSAgentModule';
import { ChatAgentModule } from './ChatAgentModule';
import { OverlordAgentModule } from './OverlordAgentModule';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface AgentModuleLoaderProps {
  agent: UnifiedAgentConfig;
  onUpdate?: () => void;
}

/**
 * Dynamic loader for agent type-specific modules
 * Renders the appropriate module based on the agent's type
 */
export function AgentModuleLoader({ agent, onUpdate }: AgentModuleLoaderProps) {
  const renderAgentModule = () => {
    switch (agent.type) {
      case 'email':
        return <EmailAgentModule agent={agent} onUpdate={onUpdate} />;
      
      case 'sms':
        return <SMSAgentModule agent={agent} onUpdate={onUpdate} />;
      
      case 'chat':
        return <ChatAgentModule agent={agent} onUpdate={onUpdate} />;
      
      case 'overlord':
        return <OverlordAgentModule agent={agent} onUpdate={onUpdate} />;
      
      default:
        return (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                Unknown Agent Type
              </h3>
              <p className="text-orange-700">
                No module available for agent type: <code className="bg-orange-100 px-2 py-1 rounded">{agent.type}</code>
              </p>
              <p className="text-sm text-orange-600 mt-2">
                Please check the agent configuration or contact support.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="agent-module-container">
      {renderAgentModule()}
    </div>
  );
}

// Helper function to check if an agent type has a module
export function hasAgentModule(type: AgentType): boolean {
  return ['email', 'sms', 'chat', 'overlord'].includes(type);
}

// Helper function to get module info
export function getAgentModuleInfo(type: AgentType) {
  const moduleInfo = {
    email: {
      name: 'Email Agent Module',
      description: 'Manage email campaigns, templates, and analytics',
      features: ['Campaign Management', 'Template Editor', 'Performance Analytics']
    },
    sms: {
      name: 'SMS Agent Module', 
      description: 'Configure SMS settings and test messaging',
      features: ['SMS Configuration', 'Rate Limiting', 'Test Messaging']
    },
    chat: {
      name: 'Chat Agent Module',
      description: 'Live chat settings and response testing',
      features: ['Chat Configuration', 'Working Hours', 'Response Testing']
    },
    overlord: {
      name: 'Overlord Agent Module',
      description: 'Master coordination and agent fleet management',
      features: ['Agent Fleet Status', 'Coordination Rules', 'Decision History']
    }
  };

  return moduleInfo[type] || null;
}
