import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Plus, Loader2, AlertCircle } from 'lucide-react';
import { AgentConfigurator } from '@/components/email-agent/AgentConfigurator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AgentsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`Failed to load agents: ${response.status}`);
      }
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgent = async (agentData: any) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save agent: ${response.status}`);
      }

      const result = await response.json();
      console.log('Agent saved:', result);
      
      setShowCreateForm(false);
      await loadAgents(); // Reload the list
    } catch (error) {
      console.error('Error saving agent:', error);
      setError(error instanceof Error ? error.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showCreateForm ? (
        <AgentConfigurator 
          onSave={handleSaveAgent}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ) : agents.length > 0 ? (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <Badge variant={agent.active ? "default" : "secondary"}>
                      {agent.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription>{agent.role || agent.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">{agent.systemPrompt?.substring(0, 150)}...</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Type: {agent.type}</span>
                      <span>Created: {new Date(agent.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Agents Yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first AI agent to start automating conversations.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}; 