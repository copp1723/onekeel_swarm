import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Mail, 
  MousePointer, 
  MessageSquare,
  Users,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';

interface CampaignAnalyticsProps {
  campaigns: any[];
  agents: any[];
}

interface Analytics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgReplyRate: number;
  topPerformingCampaigns: any[];
  topPerformingAgents: any[];
  recentActivity: any[];
}

export function CampaignAnalytics({ campaigns, agents }: CampaignAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    avgReplyRate: 0,
    topPerformingCampaigns: [],
    topPerformingAgents: [],
    recentActivity: []
  });

  useEffect(() => {
    calculateAnalytics();
  }, [campaigns, timeRange, selectedCampaign]);

  const calculateAnalytics = () => {
    let filteredCampaigns = campaigns;
    
    if (selectedCampaign !== 'all') {
      filteredCampaigns = campaigns.filter(c => c.id === selectedCampaign);
    }

    const stats = filteredCampaigns.reduce((acc, campaign) => {
      acc.sent += campaign.stats.sent || 0;
      acc.opened += campaign.stats.opened || 0;
      acc.clicked += campaign.stats.clicked || 0;
      acc.replied += campaign.stats.replied || 0;
      return acc;
    }, { sent: 0, opened: 0, clicked: 0, replied: 0 });

    // Calculate rates
    const avgOpenRate = stats.sent > 0 ? (stats.opened / stats.sent * 100) : 0;
    const avgClickRate = stats.sent > 0 ? (stats.clicked / stats.sent * 100) : 0;
    const avgReplyRate = stats.sent > 0 ? (stats.replied / stats.sent * 100) : 0;

    // Top performing campaigns
    const topCampaigns = [...campaigns]
      .filter(c => c.stats.sent > 0)
      .sort((a, b) => {
        const aRate = a.stats.opened / a.stats.sent;
        const bRate = b.stats.opened / b.stats.sent;
        return bRate - aRate;
      })
      .slice(0, 5);

    // Top performing agents
    const agentStats = new Map();
    campaigns.forEach(campaign => {
      const agentId = campaign.agentId;
      if (!agentStats.has(agentId)) {
        agentStats.set(agentId, {
          sent: 0,
          opened: 0,
          clicked: 0,
          replied: 0
        });
      }
      const stats = agentStats.get(agentId);
      stats.sent += campaign.stats.sent || 0;
      stats.opened += campaign.stats.opened || 0;
      stats.clicked += campaign.stats.clicked || 0;
      stats.replied += campaign.stats.replied || 0;
    });

    const topAgents = agents
      .map(agent => {
        const stats = agentStats.get(agent.id) || { sent: 0, opened: 0, clicked: 0, replied: 0 };
        return {
          ...agent,
          stats,
          openRate: stats.sent > 0 ? (stats.opened / stats.sent * 100) : 0
        };
      })
      .filter(a => a.stats.sent > 0)
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);

    setAnalytics({
      totalSent: stats.sent,
      totalOpened: stats.opened,
      totalClicked: stats.clicked,
      totalReplied: stats.replied,
      avgOpenRate: Math.round(avgOpenRate),
      avgClickRate: Math.round(avgClickRate),
      avgReplyRate: Math.round(avgReplyRate),
      topPerformingCampaigns: topCampaigns,
      topPerformingAgents: topAgents,
      recentActivity: []
    });
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 30) return 'text-green-600';
    if (rate >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Emails delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getStatusColor(analytics.avgOpenRate)}>
                {analytics.avgOpenRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalOpened.toLocaleString()} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getStatusColor(analytics.avgClickRate)}>
                {analytics.avgClickRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalClicked.toLocaleString()} clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getStatusColor(analytics.avgReplyRate)}>
                {analytics.avgReplyRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalReplied.toLocaleString()} replies
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Top Performing Campaigns</span>
            </CardTitle>
            <CardDescription>
              Campaigns with highest open rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformingCampaigns.map((campaign) => {
                const openRate = campaign.stats.sent > 0 
                  ? Math.round(campaign.stats.opened / campaign.stats.sent * 100)
                  : 0;
                
                return (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{campaign.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{campaign.stats.sent} sent</span>
                        <span>{campaign.stats.opened} opened</span>
                        <span>{campaign.stats.clicked} clicked</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getStatusColor(openRate)}`}>
                        {openRate}%
                      </p>
                      <p className="text-xs text-gray-500">Open rate</p>
                    </div>
                  </div>
                );
              })}
              {analytics.topPerformingCampaigns.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No campaign data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Top Performing Agents</span>
            </CardTitle>
            <CardDescription>
              AI agents with best engagement rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformingAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-gray-500">{agent.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getStatusColor(agent.openRate)}`}>
                      {Math.round(agent.openRate)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {agent.stats.sent} emails
                    </p>
                  </div>
                </div>
              ))}
              {analytics.topPerformingAgents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No agent data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Performance Insights</span>
          </CardTitle>
          <CardDescription>
            Key insights and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.avgOpenRate < 20 && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                <Activity className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Low Open Rates Detected</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Your average open rate is below industry standards. Consider improving subject lines,
                    sender reputation, or sending times.
                  </p>
                </div>
              </div>
            )}
            
            {analytics.avgClickRate < 5 && analytics.avgOpenRate > 20 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <MousePointer className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Improve Call-to-Actions</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Good open rates but low clicks suggest your content needs stronger CTAs.
                    Make links more prominent and compelling.
                  </p>
                </div>
              </div>
            )}
            
            {analytics.avgReplyRate > 5 && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">High Engagement!</p>
                  <p className="text-sm text-green-800 mt-1">
                    Your campaigns are generating conversations. Keep up the personalized approach
                    and relevant content.
                  </p>
                </div>
              </div>
            )}
            
            {campaigns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Start running campaigns to see performance insights</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}