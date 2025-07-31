import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
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
  onViewAll
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
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-normal text-gray-600 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Campaign Snapshot
          </CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Row */}
        <div className="grid grid-cols-5 gap-2 pb-3 border-b border-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Sent</p>
            <p className="text-sm font-normal text-gray-700">
              {formatNumber(campaigns.reduce((sum, c) => sum + c.metrics.sent, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Open Rate</p>
            <p className="text-sm font-normal text-gray-700">
              {campaigns.length > 0 
                ? `${(campaigns.reduce((sum, c) => sum + c.metrics.openRate, 0) / campaigns.length).toFixed(0)}%`
                : '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Reply Rate</p>
            <p className="text-sm font-normal text-gray-700">
              {campaigns.length > 0 
                ? `${(campaigns.reduce((sum, c) => sum + c.metrics.replyRate, 0) / campaigns.length).toFixed(0)}%`
                : '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Handovers</p>
            <p className="text-sm font-normal text-gray-700">
              {campaigns.reduce((sum, c) => sum + c.metrics.handovers, 0)}
            </p>
          </div>
          {/* Conversion rate column removed as requested */}
        </div>

        {/* Campaign List */}
        <div className="space-y-2">
          {campaigns.slice(0, 3).map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 -mx-2 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-normal text-gray-700 truncate">{campaign.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-1.5 py-0 bg-opacity-50 ${getStatusColor(campaign.status)}`}
                >
                  {campaign.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  {formatNumber(campaign.metrics.sent)}
                </span>
                <span>
                  {campaign.metrics.openRate}%
                </span>
                <span>
                  {campaign.metrics.replyRate}%
                </span>
                <span>
                  {campaign.metrics.handovers}
                </span>
                {/* Conversion rate display removed as requested */}
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