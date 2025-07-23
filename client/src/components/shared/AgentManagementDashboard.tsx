import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedAgentConfig, AgentType } from '@/types';
import { useAgents } from '@/hooks/useAgents';
import { AgentCard } from './AgentCard';
import { UnifiedAgentConfigurator } from './UnifiedAgentConfigurator';
import { AgentModuleLoader } from './agent-modules/AgentModuleLoader';
import { AGENT_TYPES, PERSONALITY_OPTIONS } from '@/utils/agentUtils';
import { 
  Plus, 
  Search, 
  Filter, 
  Brain, 
  Users, 
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AgentManagementDashboardProps {
  onAgentSelect?: (agent: UnifiedAgentConfig) => void;
  showCreateButton?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  compact?: boolean;
  showAgentDetails?: boolean;
}

export function AgentManagementDashboard({
  onAgentSelect,
  showCreateButton = true,
  allowEdit = true,
  allowDelete = true,
  compact = false,
  showAgentDetails = false
}: AgentManagementDashboardProps) {
  const { agents, loading, error, loadAgents, createAgent, updateAgent, deleteAgent, toggleAgent } = useAgents();
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [editingAgent, setEditingAgent] = useState<UnifiedAgentConfig | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<UnifiedAgentConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AgentType | 'all'>('all');
  const [filterPersonality, setFilterPersonality] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter agents based on search and filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (agent.role?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || agent.type === filterType;
    const matchesPersonality = filterPersonality === 'all' || agent.personality?.style === filterPersonality;
    const matchesActive = filterActive === 'all' || 
                         (filterActive === 'active' && agent.active) ||
                         (filterActive === 'inactive' && !agent.active);
    
    return matchesSearch && matchesType && matchesPersonality && matchesActive;
  });

  // Calculate stats
  const stats = {
    total: agents.length,
    active: agents.filter(a => a.active).length,
    byType: AGENT_TYPES.reduce((acc, type) => {
      acc[type.value] = agents.filter(a => a.type === type.value).length;
      return acc;
    }, {} as Record<AgentType, number>)
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowConfigurator(true);
  };

  const handleEditAgent = (agent: UnifiedAgentConfig) => {
    if (!allowEdit) return;
    setEditingAgent(agent);
    setShowConfigurator(true);
  };

  const handleViewAgentDetails = (agent: UnifiedAgentConfig) => {
    setSelectedAgent(agent);
    onAgentSelect?.(agent);
  };

  const handleSaveAgent = async (agentData: UnifiedAgentConfig) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id!, agentData);
      } else {
        await createAgent(agentData);
      }
      setShowConfigurator(false);
      setEditingAgent(null);
    } catch (error) {
      console.error('Failed to save agent:', error);
      // Error handling is done in the hook
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!allowDelete) return;
    if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      try {
        await deleteAgent(agentId);
      } catch (error) {
        console.error('Failed to delete agent:', error);
      }
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    try {
      await toggleAgent(agentId);
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterPersonality('all');
    setFilterActive('all');
  };

  // Show agent details view
  if (selectedAgent && showAgentDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Agent Details</h3>
            <p className="text-gray-600">Detailed view and configuration for {selectedAgent.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedAgent(null)}
          >
            Back to Dashboard
          </Button>
        </div>
        <AgentModuleLoader
          agent={selectedAgent}
          onUpdate={() => {
            loadAgents();
          }}
        />
      </div>
    );
  }

  if (showConfigurator) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </h3>
            <p className="text-gray-600">
              {editingAgent ? 'Update agent configuration' : 'Configure a new AI agent'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowConfigurator(false);
              setEditingAgent(null);
            }}
          >
            Back to Dashboard
          </Button>
        </div>
        <UnifiedAgentConfigurator
          agent={editingAgent}
          onSave={handleSaveAgent}
          onCancel={() => {
            setShowConfigurator(false);
            setEditingAgent(null);
          }}
          allowTypeChange={!editingAgent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span>Agent Management</span>
          </h2>
          <p className="text-gray-600">Configure and manage your AI agents</p>
        </div>
        {showCreateButton && (
          <Button onClick={handleCreateAgent} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Agents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.total - stats.active}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Types</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.byType).filter(type => stats.byType[type as AgentType] > 0).length}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search agents by name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as AgentType | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {AGENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPersonality} onValueChange={setFilterPersonality}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Personality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personalities</SelectItem>
                  {Object.entries(PERSONALITY_OPTIONS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={(value) => setFilterActive(value as any)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters} size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadAgents}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading agents...</p>
        </div>
      )}

      {/* Agents Grid */}
      {!loading && (
        <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredAgents.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No agents found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' || filterPersonality !== 'all' || filterActive !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first AI agent to get started'
                }
              </p>
              {showCreateButton && (
                <Button onClick={handleCreateAgent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Agent
                </Button>
              )}
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={allowEdit ? handleEditAgent : undefined}
                onDelete={allowDelete ? handleDeleteAgent : undefined}
                onToggle={handleToggleAgent}
                onViewAnalytics={showAgentDetails ? handleViewAgentDetails : onAgentSelect}
                compact={compact}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
