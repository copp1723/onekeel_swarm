import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UnifiedAgentConfig } from '@/types';
import { getAgentTypeInfo, getAgentStatusBadge } from '@/utils/agentUtils';
import { 
  Settings, 
  Power, 
  PowerOff, 
  BarChart3, 
  Edit,
  Trash2,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';

interface AgentCardProps {
  agent: UnifiedAgentConfig;
  onEdit?: (agent: UnifiedAgentConfig) => void;
  onDelete?: (agentId: string) => void;
  onToggle?: (agentId: string) => void;
  onViewAnalytics?: (agent: UnifiedAgentConfig) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onToggle, 
  onViewAnalytics,
  showActions = true,
  compact = false 
}: AgentCardProps) {
  const typeInfo = getAgentTypeInfo(agent.type);
  const statusBadge = getAgentStatusBadge(agent.active ?? false);

  const getCapabilityIcons = () => {
    const icons = [];
    if (agent.capabilities?.email) icons.push(<Mail key="email" className="h-3 w-3" />);
    if (agent.capabilities?.sms) icons.push(<Phone key="sms" className="h-3 w-3" />);
    if (agent.capabilities?.chat) icons.push(<MessageSquare key="chat" className="h-3 w-3" />);
    return icons;
  };

  const formatLastActive = () => {
    if (!agent.updatedAt) return 'Never';
    const date = new Date(agent.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600">
                <AvatarFallback className="bg-transparent text-white text-xs">
                  {typeInfo?.icon || '🤖'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium text-sm">{agent.name}</h4>
                <p className="text-xs text-gray-500">{agent.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {getCapabilityIcons()}
              </div>
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.text}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
              <AvatarFallback className="bg-transparent text-white">
                {typeInfo?.icon || '🤖'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-gray-600">{agent.role}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {typeInfo?.label || agent.type}
                </Badge>
                <div className="flex space-x-1">
                  {getCapabilityIcons()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${agent.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            <Badge variant={statusBadge.variant} className="font-medium">
              {statusBadge.text}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Agent Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Personality:</span>
            <span className="font-medium capitalize">{agent.personality?.style || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tone:</span>
            <span className="font-medium capitalize">{agent.tone}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Response Length:</span>
            <span className="font-medium capitalize">{agent.responseLength}</span>
          </div>
        </div>

        {/* Performance Metrics */}
        {agent.performance && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {agent.performance.conversations || 0}
              </div>
              <div className="text-xs text-gray-600">Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {agent.performance.successfulOutcomes || 0}
              </div>
              <div className="text-xs text-gray-600">Successful</div>
            </div>
          </div>
        )}

        {/* Last Active */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Last Active:</span>
            <span className="text-gray-700 font-medium">{formatLastActive()}</span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(agent)}
                  className="flex items-center space-x-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
              )}
              {onViewAnalytics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewAnalytics(agent)}
                  className="flex items-center space-x-1"
                >
                  <BarChart3 className="h-3 w-3" />
                  <span>Analytics</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              {onToggle && (
                <Button
                  variant={agent.active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => onToggle(agent.id!)}
                  title={agent.active ? "Deactivate" : "Activate"}
                >
                  {agent.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(agent.id!)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                  title="Delete Agent"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
