import { useState, useEffect, useCallback } from 'react';
import type { UnifiedAgentConfig, AgentType } from '@/types';

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
      
      // Get token for authorization
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use proper base URL for production
      const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '';
      const apiPath = baseURL ? `${baseURL}/api` : '/api';
      const url = `${apiPath}/agents?${params}`;
      
      console.log('[useAgents] Loading agents from:', url);
      const response = await fetch(url, {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useAgents] Failed to load agents:', response.status, errorText);
        throw new Error(`Failed to load agents: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[useAgents] Loaded agents:', data);
      setAgents(data.agents || data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
      setError(errorMessage);
      console.error('[useAgents] Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  }, [type, active]);

  const createAgent = useCallback(async (agentData: Partial<UnifiedAgentConfig>): Promise<UnifiedAgentConfig> => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '';
      const apiPath = baseURL ? `${baseURL}/api` : '/api';
      const url = `${apiPath}/agents`;
      
      console.log('[useAgents] Creating agent at:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[useAgents] Failed to create agent:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create agent');
      }

      const data = await response.json();
      const newAgent = data.agent || data;
      console.log('[useAgents] Created agent:', newAgent);
      
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      console.error('[useAgents] Error creating agent:', err);
      throw err;
    }
  }, []);

  const updateAgent = useCallback(async (id: string, updates: Partial<UnifiedAgentConfig>): Promise<UnifiedAgentConfig> => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '';
      const apiPath = baseURL ? `${baseURL}/api` : '/api';
      const url = `${apiPath}/agents/${id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update agent');
      }

      const data = await response.json();
      const updatedAgent = data.agent || data;
      
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
      const response = await fetch(`/api/agents/${id}`, {
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
      const response = await fetch(`/api/agents/${id}/toggle`, {
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
      const response = await fetch(`/api/agents/active/${agentType}`);
      
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
      const response = await fetch(`/api/agents/${agentId}`);
      
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