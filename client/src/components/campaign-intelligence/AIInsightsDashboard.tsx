import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Users, MessageSquare, Target, Lightbulb } from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'pattern' | 'optimization' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface AgentMemory {
  agentType: string;
  totalInteractions: number;
  successRate: number;
  topPatterns: string[];
  learningScore: number;
}

export function AIInsightsDashboard() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [agentMemories, setAgentMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
    fetchAgentMemories();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/campaign-intelligence/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || mockInsights);
      } else {
        setInsights(mockInsights);
      }
    } catch (error) {
      setInsights(mockInsights);
    }
  };

  const fetchAgentMemories = async () => {
    try {
      const response = await fetch('/api/campaign-intelligence/agent-memories');
      if (response.ok) {
        const data = await response.json();
        setAgentMemories(data.memories || mockAgentMemories);
      } else {
        setAgentMemories(mockAgentMemories);
      }
    } catch (error) {
      setAgentMemories(mockAgentMemories);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <Brain className="h-4 w-4" />;
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'prediction': return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading AI insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Intelligence Dashboard
        </h3>
        <p className="text-sm text-gray-600">Cross-campaign learning and optimization insights</p>
      </div>

      {/* Agent Memory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentMemories.map((memory) => (
          <Card key={memory.agentType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                {memory.agentType.charAt(0).toUpperCase() + memory.agentType.slice(1)} Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Interactions:</span>
                <span className="font-medium">{memory.totalInteractions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Success Rate:</span>
                <span className="font-medium">{memory.successRate}%</span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Learning Score:</span>
                  <span className="font-medium">{memory.learningScore}/100</span>
                </div>
                <Progress value={memory.learningScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI-Generated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <h4 className="font-medium">{insight.title}</h4>
                    <Badge className={getImpactColor(insight.impact)}>
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{insight.confidence}% confidence</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{insight.description}</p>
                
                <div className="flex items-center justify-between">
                  <Progress value={insight.confidence} className="flex-1 max-w-xs h-2" />
                  {insight.actionable && (
                    <Button size="sm" variant="outline">
                      Apply Insight
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Agent Learning Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Cross-Agent Learning Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentMemories.map((memory) => (
              <div key={memory.agentType} className="space-y-2">
                <h5 className="font-medium">{memory.agentType.charAt(0).toUpperCase() + memory.agentType.slice(1)} Agent Patterns</h5>
                <div className="space-y-1">
                  {memory.topPatterns.map((pattern, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mock data for development
const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'pattern',
    title: 'Email-SMS Sequence Optimization',
    description: 'Leads respond 34% better when SMS follows email within 2-4 hours rather than immediately.',
    confidence: 87,
    impact: 'high',
    actionable: true
  },
  {
    id: '2',
    type: 'optimization',
    title: 'Channel Preference Learning',
    description: 'Chat agent identifies lead preferences 23% faster when email agent shares initial interaction context.',
    confidence: 92,
    impact: 'medium',
    actionable: true
  },
  {
    id: '3',
    type: 'prediction',
    title: 'Qualification Timing',
    description: 'Leads are 45% more likely to qualify when contacted between 10-11 AM on weekdays.',
    confidence: 78,
    impact: 'high',
    actionable: false
  }
];

const mockAgentMemories: AgentMemory[] = [
  {
    agentType: 'email',
    totalInteractions: 2847,
    successRate: 73,
    topPatterns: [
      'Subject lines with questions get 28% more opens',
      'Follow-up timing: 3-day intervals work best',
      'Personalization increases response by 41%'
    ],
    learningScore: 85
  },
  {
    agentType: 'sms',
    totalInteractions: 1923,
    successRate: 68,
    topPatterns: [
      'Short messages (under 160 chars) perform better',
      'Emoji usage increases engagement by 19%',
      'Tuesday-Thursday optimal send times'
    ],
    learningScore: 79
  },
  {
    agentType: 'chat',
    totalInteractions: 1456,
    successRate: 81,
    topPatterns: [
      'Quick responses (under 30s) improve satisfaction',
      'Question-based openers work 34% better',
      'Contextual handoffs reduce drop-off by 52%'
    ],
    learningScore: 91
  },
  {
    agentType: 'overlord',
    totalInteractions: 4521,
    successRate: 76,
    topPatterns: [
      'Multi-channel campaigns outperform single by 67%',
      'Lead scoring accuracy improved 23% over time',
      'Handover timing optimization reduces waste by 31%'
    ],
    learningScore: 88
  }
];