import React from 'react';
import { Brain, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardContext, Agent } from '../types';

export const AgentStep: React.FC<{ctx: WizardContext; agents: Agent[]}> = ({ ctx, agents }) => {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h4 className="font-medium text-purple-900">Select AI Agent</h4>
        </div>
        <p className="text-sm text-purple-700">
          Choose the AI agent that will manage this campaign.
        </p>
      </div>
      <div className="space-y-3">
        {agents.length > 0 ? agents.map((agent: Agent) => (
          <div
            key={agent.id}
            className={`p-4 border rounded-lg cursor-pointer transition ${
              ctx.data.agentId === agent.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => ctx.setData((prev) => ({ ...prev, agentId: agent.id }))}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{agent.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{agent.role}</p>
              </div>
              {ctx.data.agentId === agent.id && (
                <Check className="h-5 w-5 text-purple-600" />
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No agents available</p>
            <Button variant="link" className="mt-2">Create an Agent</Button>
          </div>
        )}
      </div>
    </div>
  );
};