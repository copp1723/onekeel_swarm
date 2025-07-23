import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Plus } from 'lucide-react';
import { AgentConfigurator } from '@/components/email-agent/AgentConfigurator';

export const AgentsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Configure and manage your AI agents</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Agent</span>
        </Button>
      </div>

      {showCreateForm ? (
        <AgentConfigurator 
          onSave={() => {
            setShowCreateForm(false);
            // Optionally refresh the list
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Agent Management</span>
            </CardTitle>
            <CardDescription>
              Configure AI agents for different tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">AI Agents</h3>
              <p className="text-gray-500 mb-4">
                Configure and manage your AI agents for lead engagement.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 