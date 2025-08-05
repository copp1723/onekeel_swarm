import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UnifiedAgentConfig } from '@/types';
import { getAgentStatusBadge } from '@/utils/agentUtils';

interface AgentStatusBadgeProps {
  agent: UnifiedAgentConfig;
  showDot?: boolean;
  className?: string;
}

export function AgentStatusBadge({ agent, showDot = false, className = '' }: AgentStatusBadgeProps) {
  const statusBadge = getAgentStatusBadge(agent.active ?? false);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showDot && (
        <div className={`w-2 h-2 rounded-full ${agent.active ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
      <Badge variant={statusBadge.variant} className="font-medium">
        {statusBadge.text}
      </Badge>
    </div>
  );
}
