import React from 'react';
import { AgentManagementDashboard } from './AgentManagementDashboard';
import { UnifiedAgentConfig } from '@/types';

/**
 * Demo component to test the unified agent management system
 * This can be used to verify all components work together properly
 */
export function AgentManagementDemo() {
  const handleAgentSelect = (agent: UnifiedAgentConfig) => {
    console.log('Selected agent for analytics:', agent);
    // This would typically navigate to an analytics view
    // or open a modal with agent performance data
  };

  return (
    <div className="container mx-auto p-6">
      <AgentManagementDashboard
        onAgentSelect={handleAgentSelect}
        showCreateButton={true}
        allowEdit={true}
        allowDelete={true}
        compact={false}
      />
    </div>
  );
}

// Export for easy testing
export default AgentManagementDemo;
