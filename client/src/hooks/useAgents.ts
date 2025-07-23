import { useState, useEffect, useCallback } from 'react';
import { UnifiedAgentConfig, AgentType } from '@/types';

interface UseAgentsOptions {
  type?: AgentType;
  active?: boolean;
  autoLoad?: boolean;
}

interface UseAgentsReturn {
  agents: UnifiedAgentConfig[];
  loading: boolean;
  error: string | null;
  loadAgents: () => Promise<void>;
  createAgent: (agent: Partial<UnifiedAgentConfig>) => Promise<UnifiedAgentConfig>;
  updateAgent: (id: string, updates: Partial<UnifiedAgentConfig>) => Promise<UnifiedAgentConfig>;
  deleteAgent: (id: string) => Promise<void>;
  toggleAgent: (id: string) => Promise<void>;
  getActiveAgent: (type: AgentType) => Promise<UnifiedAgentConfig | null>;
}

export function useAgents(options: UseAgentsOptions = {}): UseAgentsReturn {
  const { type, active, autoLoad = true } = options;
  const [agents, setAgents] = useState<UnifiedAgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (active !== undefined) params.append('active', active.toString());
      
      const response = await fetch(`/api/agent-configurations?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load agents: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
      setError(errorMessage);
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  }, [type, active]);

  const createAgent = useCallback(async (agentData: Partial<UnifiedAgentConfig>): Promise<UnifiedAgentConfig> => {
    try {
      const response = await fetch('/api/agent-configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to create agent');
      }

      const data = await response.json();
      const newAgent = data.agent;
      
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateAgent = useCallback(async (id: string, updates: Partial<UnifiedAgentConfig>): Promise<UnifiedAgentConfig> => {
    try {
      const response = await fetch(`/api/agent-configurations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update agent');
      }

      const data = await response.json();
      const updatedAgent = data.agent;
      
      setAgents(prev => prev.map(agent => agent.id === id ? updatedAgent : agent));
      return updatedAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteAgent = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agent-configurations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agent');
      }

      setAgents(prev => prev.filter(agent => agent.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const toggleAgent = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/agent-configurations/${id}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle agent');
      }

      const data = await response.json();
      const updatedAgent = data.agent;
      
      setAgents(prev => prev.map(agent => agent.id === id ? updatedAgent : agent));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getActiveAgent = useCallback(async (agentType: AgentType): Promise<UnifiedAgentConfig | null> => {
    try {
      const response = await fetch(`/api/agent-configurations/active/${agentType}`);
      
      if (response.status === 404) {
        return null; // No active agent of this type
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get active ${agentType} agent`);
      }
      
      const data = await response.json();
      return data.agent;
    } catch (err) {
      console.error(`Error getting active ${agentType} agent:`, err);
      return null;
    }
  }, []);

  // Auto-load agents on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadAgents();
    }
  }, [autoLoad, loadAgents]);

  return {
    agents,
    loading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgent,
    getActiveAgent,
  };
}

// Specialized hook for getting agents by type
export function useAgentsByType(type: AgentType) {
  return useAgents({ type, autoLoad: true });
}

// Specialized hook for getting active agents only
export function useActiveAgents() {
  return useAgents({ active: true, autoLoad: true });
}

// Hook for managing a single agent configuration
export function useAgentConfiguration(agentId?: string) {
  const [agent, setAgent] = useState<UnifiedAgentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = useCallback(async () => {
    if (!agentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent-configurations/${agentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAgent(data.agent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agent';
      setError(errorMessage);
      console.error('Error loading agent:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) {
      loadAgent();
    } else {
      setAgent(null);
    }
  }, [agentId, loadAgent]);

  return {
    agent,
    loading,
    error,
    loadAgent,
  };
}
