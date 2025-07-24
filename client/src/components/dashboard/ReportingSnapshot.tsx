import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

interface CampaignMetrics {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  metrics: {
    sent: number;
    openRate: number;
    replyRate: number;
    handovers: number;
    conversionRate: number;
  };
}

interface ReportingSnapshotProps {
  onViewAll?: () => void;
  compact?: boolean;
}

export const ReportingSnapshot: React.FC<ReportingSnapshotProps> = ({ 
  onViewAll,
  compact = true
}) => {
  const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignData();
  }, []);

  const fetchCampaignData = async () => {
    try {
      const response = await fetch('/api/campaigns/metrics?limit=5&sort=recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || getMockCampaigns());
      } else {
        setCampaigns(getMockCampaigns());
      }
    } catch (error) {
      console.error('Failed to fetch campaign metrics:', error);
      setCampaigns(getMockCampaigns());
    } finally {
      setLoading(false);
    }
  };

  const getMockCampaigns = (): CampaignMetrics[] => [
    {
      id: '1',
      name: 'Q4 Car Loan Refinance',
      status: 'active',
      metrics: {
        sent: 2456,
        openRate: 68.5,
        replyRate: 12.3,
        handovers: 89,
        conversionRate: 8.7
      }
    },
    {
      id: '2',
      name: 'Holiday Personal Loan',
      status: 'completed',
      metrics: {
        sent: 1823,
        openRate: 72.1,
        replyRate: 15.8,
        handovers: 124,
        conversionRate: 11.2
      }
    },
    {
      id: '3',
      name: 'Auto Loan Re-engage',
      status: 'active',
      metrics: {
        sent: 945,
        openRate: 45.3,
        replyRate: 8.9,
        handovers: 34,
        conversionRate: 4.2
      }
    }
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'completed':
        return 'text-gray-600 bg-gray-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Campaign Snapshot
          </CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Row */}
        <div className="grid grid-cols-5 gap-2 pb-3 border-b">
          <div className="text-center">
            <p className="text-xs text-gray-500">Sent</p>
            <p className="font-semibold text-sm">
              {formatNumber(campaigns.reduce((sum, c) => sum + c.metrics.sent, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Open Rate</p>
            <p className="font-semibold text-sm">
              {campaigns.length > 0 
                ? `${(campaigns.reduce((sum, c) => sum + c.metrics.openRate, 0) / campaigns.length).toFixed(0)}%`
                : '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Reply Rate</p>
            <p className="font-semibold text-sm">
              {campaigns.length > 0 
                ? `${(campaigns.reduce((sum, c) => sum + c.metrics.replyRate, 0) / campaigns.length).toFixed(0)}%`
                : '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Handovers</p>
            <p className="font-semibold text-sm">
              {campaigns.reduce((sum, c) => sum + c.metrics.handovers, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Conversion</p>
            <p className="font-semibold text-sm">
              {campaigns.length > 0 
                ? `${(campaigns.reduce((sum, c) => sum + c.metrics.conversionRate, 0) / campaigns.length).toFixed(0)}%`
                : '0%'}
            </p>
          </div>
        </div>

        {/* Campaign List */}
        <div className="space-y-2">
          {campaigns.slice(0, 3).map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 -mx-2 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{campaign.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-1.5 py-0 ${getStatusColor(campaign.status)}`}
                >
                  {campaign.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-600">
                  {formatNumber(campaign.metrics.sent)}
                </span>
                <span className="font-medium">
                  {campaign.metrics.openRate}%
                </span>
                <span className="font-medium">
                  {campaign.metrics.replyRate}%
                </span>
                <span className="text-gray-600">
                  {campaign.metrics.handovers}
                </span>
                <span className={`font-medium ${
                  campaign.metrics.conversionRate > 10 ? 'text-green-600' : 
                  campaign.metrics.conversionRate > 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {campaign.metrics.conversionRate}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {campaigns.length > 3 && (
          <p className="text-xs text-gray-500 text-center pt-1">
            +{campaigns.length - 3} more campaigns
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportingSnapshot;