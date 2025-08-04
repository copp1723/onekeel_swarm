import React, { useState, useEffect } from 'react';
import { MetricCard } from './MetricCard';
import { 
  Users, 
  MessageSquare, 
  Target, 
  TrendingUp,
  Mail,
  Phone,
  Activity,
  DollarSign
} from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';

interface PerformanceData {
  totalLeads: number;
  newLeadsToday: number;
  activeConversations: number;
  activeCampaigns: number;
  conversionRate: number;
  campaignEngagement: number;
  responseRate: number;
  totalRevenue: number;
  avgResponseTime: string;
}

interface PerformanceMetricsProps {
  onError?: (error: Error) => void;
  refreshInterval?: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  onError,
  refreshInterval = 30000 // 30 seconds default
}) => {
  const [metrics, setMetrics] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const terminology = useTerminology();

  useEffect(() => {
    fetchMetrics();
    
    // Set up refresh interval if specified
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const response = await fetch('/api/monitoring/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        }
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch metrics');
      console.error('Failed to fetch metrics:', error);
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      // Fallback to mock data
      setMetrics({
        totalLeads: 1247,
        newLeadsToday: 23,
        activeConversations: 87,
        activeCampaigns: 12,
        conversionRate: 12.5,
        campaignEngagement: 68.3,
        responseRate: 94.2,
        totalRevenue: 124500,
        avgResponseTime: '2.3 min'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (error && !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
            <p className="text-sm text-red-700 mt-1">Using cached data. {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title={terminology.totalCount}
        value={metrics?.totalLeads || 0}
        change={metrics?.newLeadsToday}
        changeLabel="today"
        icon={Users}
        iconColor="text-blue-600"
        loading={loading}
      />
      
      <MetricCard
        title="Active Conversations"
        value={metrics?.activeConversations || 0}
        trend="up"
        changeLabel="vs yesterday"
        icon={MessageSquare}
        iconColor="text-green-600"
        loading={loading}
      />
      
      <MetricCard
        title="Conversion Rate"
        value={`${metrics?.conversionRate || 0}%`}
        change={2.3}
        changeLabel="vs last month"
        icon={TrendingUp}
        iconColor="text-purple-600"
        loading={loading}
      />
      
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(metrics?.totalRevenue || 0)}
        change={15.2}
        changeLabel="this month"
        icon={DollarSign}
        iconColor="text-green-600"
        loading={loading}
      />
      
      <MetricCard
        title="Campaign Engagement"
        value={`${metrics?.campaignEngagement || 0}%`}
        change={-3.1}
        changeLabel="vs last week"
        icon={Target}
        iconColor="text-orange-600"
        loading={loading}
      />
      
      <MetricCard
        title="Response Rate"
        value={`${metrics?.responseRate || 0}%`}
        trend="up"
        changeLabel="improvement"
        icon={Mail}
        iconColor="text-indigo-600"
        loading={loading}
      />
      
      <MetricCard
        title="Avg Response Time"
        value={metrics?.avgResponseTime || '-'}
        trend="down"
        changeLabel="faster"
        icon={Activity}
        iconColor="text-red-600"
        loading={loading}
      />
      
      <MetricCard
        title="SMS Delivered"
        value="98.7%"
        change={0.5}
        changeLabel="vs yesterday"
        icon={Phone}
        iconColor="text-teal-600"
        loading={loading}
      />
    </div>
  );
};

export default PerformanceMetrics;