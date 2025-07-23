import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UnifiedAgentConfig } from '@/types';
import { useAgents } from '@/hooks/useAgents';
import { 
  Brain, 
  Users, 
  Target, 
  Settings, 
  BarChart3, 
  Zap, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface OverlordAgentModuleProps {
  agent: UnifiedAgentConfig;
  onUpdate?: () => void;
}

interface CoordinationMetrics {
  totalAgentsManaged: number;
  activeCampaigns: number;
  coordinationEfficiency: number;
  decisionsMade: number;
  optimizationsApplied: number;
}

export function OverlordAgentModule({ agent, onUpdate }: OverlordAgentModuleProps) {
  const { agents } = useAgents();
  const [metrics] = useState<CoordinationMetrics>({
    totalAgentsManaged: agents.filter(a => a.type !== 'overlord').length,
    activeCampaigns: 12,
    coordinationEfficiency: 87,
    decisionsMade: 156,
    optimizationsApplied: 23
  });

  const managedAgents = agents.filter(a => a.type !== 'overlord');
  const activeAgents = managedAgents.filter(a => a.active);

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'chat': return '💬';
      default: return '🤖';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>{agent.name} - Overlord Agent</span>
          </h3>
          <p className="text-gray-600">Master coordinator managing all AI agents and campaigns</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <span>🧠</span>
          <span>Master Coordinator</span>
        </Badge>
      </div>

      {/* Coordination Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agents Managed</p>
                <p className="text-2xl font-bold">{metrics.totalAgentsManaged}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold">{metrics.activeCampaigns}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold">{metrics.coordinationEfficiency}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Decisions Made</p>
                <p className="text-2xl font-bold">{metrics.decisionsMade}</p>
              </div>
              <Brain className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Optimizations</p>
                <p className="text-2xl font-bold">{metrics.optimizationsApplied}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Management Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Agent Fleet Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {managedAgents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No agents to manage yet</p>
                <p className="text-sm">Create some agents to see coordination metrics</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {managedAgents.map((managedAgent) => (
                  <div key={managedAgent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getAgentTypeIcon(managedAgent.type)}</div>
                      <div>
                        <h4 className="font-medium">{managedAgent.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{managedAgent.type} Agent</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Performance</p>
                        <p className={`font-medium ${getPerformanceColor(85)}`}>85%</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Status</p>
                        <div className="flex items-center space-x-1">
                          {managedAgent.active ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Load</p>
                        <div className="w-20">
                          <Progress value={Math.random() * 100} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coordination Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Coordination Rules</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Decision Making</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Auto-optimize campaigns</span>
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Agent load balancing</span>
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cross-channel coordination</span>
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Performance monitoring</span>
                  <Badge variant="outline" className="text-green-600">Enabled</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Escalation Triggers</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Agent performance drops below 60%</span>
                  <Badge variant="outline" className="text-orange-600">Alert</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Campaign conversion rate drops 20%</span>
                  <Badge variant="outline" className="text-orange-600">Alert</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Agent becomes unresponsive</span>
                  <Badge variant="outline" className="text-red-600">Critical</Badge>
                </div>
                <div className="flex justify-between">
                  <span>System resource usage &gt; 90%</span>
                  <Badge variant="outline" className="text-red-600">Critical</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Recent Decisions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '2 minutes ago', action: 'Optimized email campaign timing for better engagement', type: 'optimization' },
              { time: '15 minutes ago', action: 'Redistributed chat load from Agent-3 to Agent-1', type: 'balancing' },
              { time: '1 hour ago', action: 'Triggered SMS follow-up sequence for email non-responders', type: 'coordination' },
              { time: '2 hours ago', action: 'Paused underperforming campaign and reallocated budget', type: 'optimization' },
              { time: '3 hours ago', action: 'Escalated complex customer query to human agent', type: 'escalation' }
            ].map((decision, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {decision.type === 'optimization' && <Zap className="h-4 w-4 text-yellow-500" />}
                  {decision.type === 'balancing' && <Users className="h-4 w-4 text-blue-500" />}
                  {decision.type === 'coordination' && <Target className="h-4 w-4 text-green-500" />}
                  {decision.type === 'escalation' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{decision.action}</p>
                  <p className="text-xs text-gray-500">{decision.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Agent Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Personality</p>
              <p className="font-medium capitalize">{agent.personality?.style || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-600">Tone</p>
              <p className="font-medium capitalize">{agent.tone}</p>
            </div>
            <div>
              <p className="text-gray-600">Response Length</p>
              <p className="font-medium capitalize">{agent.responseLength}</p>
            </div>
            <div>
              <p className="text-gray-600">Temperature</p>
              <p className="font-medium">{agent.temperature}%</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-600 text-sm">End Goal</p>
            <p className="text-sm">{agent.endGoal}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
