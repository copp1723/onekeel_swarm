import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Plus } from 'lucide-react';
import { UnifiedAgentConfigurator } from './UnifiedAgentConfigurator';

interface AgentManagementDashboardProps {
  showCreateButton?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  compact?: boolean;
  showAgentDetails?: boolean;
}

export const AgentManagementDashboard: React.FC<AgentManagementDashboardProps> = ({
  showCreateButton = true,
  allowEdit = true,
  allowDelete = true,
  compact = false,
  showAgentDetails = true,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {showCreateButton && !showCreateForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </Button>
        </div>
      )}

      {showCreateForm ? (
        <UnifiedAgentConfigurator
          onSave={async (agent) => {
            console.log('Agent saved:', agent);
            setShowCreateForm(false);
            // Optionally refresh the list
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <Card>
          <CardHeader className={compact ? "pb-3" : undefined}>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Agent Management</span>
            </CardTitle>
            {!compact && (
              <CardDescription>
                Configure AI agents for different tasks
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">AI Agents</h3>
              <p className="text-gray-500 mb-4">
                Configure and manage your AI agents for lead engagement.
              </p>
              {showCreateButton && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Agent
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
