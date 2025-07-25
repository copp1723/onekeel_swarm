import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { ReportingSnapshot } from '@/components/dashboard/ReportingSnapshot';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useTerminology } from '@/hooks/useTerminology';
import { 
  BarChart3, 
  Users, 
  Mail, 
  Target,
  Clock,
  Plus
} from 'lucide-react';

interface CampaignMetric {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  engagement: number;
  conversions: number;
  sent: number;
  opened: number;
}


export const EnhancedDashboardView: React.FC = () => {
  const { enabled: useEnhancedDashboard } = useFeatureFlag('ui.enhanced-dashboard');
  const terminology = useTerminology();
  const [campaigns, setCampaigns] = useState<CampaignMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with real API calls
      setTimeout(() => {
        setCampaigns([
          {
            id: '1',
            name: 'Welcome Series',
            status: 'active',
            engagement: 72.5,
            conversions: 15,
            sent: 245,
            opened: 178
          },
          {
            id: '2',
            name: 'Re-engagement Campaign',
            status: 'active',
            engagement: 45.2,
            conversions: 8,
            sent: 189,
            opened: 85
          },
          {
            id: '3',
            name: 'Product Launch',
            status: 'paused',
            engagement: 81.3,
            conversions: 42,
            sent: 567,
            opened: 461
          }
        ]);


        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (!useEnhancedDashboard) {
    // Fallback to basic dashboard
    return <BasicDashboard terminology={terminology} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Real-time performance insights</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Key Performance Indicators</h2>
        <PerformanceMetrics />
      </div>

      {/* Reporting Snapshot */}
      <div className="mb-6">
        <ReportingSnapshot 
          onViewAll={() => window.location.href = '/campaigns'} 
        />
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Campaign Performance</span>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New Campaign
            </Button>
          </CardTitle>
          <CardDescription>Active campaigns and their metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              campaigns.map(campaign => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{campaign.engagement}%</div>
                      <div className="text-xs text-gray-500">engagement</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Sent:</span> {campaign.sent}
                    </div>
                    <div>
                      <span className="text-gray-500">Opened:</span> {campaign.opened}
                    </div>
                    <div>
                      <span className="text-gray-500">Converted:</span> {campaign.conversions}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Fallback basic dashboard component
const BasicDashboard: React.FC<{ terminology: any }> = ({ terminology }) => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Welcome to your AI Marketing Automation Platform</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{terminology.totalCount}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1,234</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">
            +2 new this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5,678</div>
          <p className="text-xs text-muted-foreground">
            +12% from last week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24.3%</div>
          <p className="text-xs text-muted-foreground">
            +2.1% from last month
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default EnhancedDashboardView;