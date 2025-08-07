import React, { useState, useEffect } from 'react';
import { Target, Bot, BarChart3, Users, MessageSquare, TrendingUp, Activity, Zap } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  onClick: () => void;
  stats?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  gradient,
  onClick,
  stats
}) => {
  return (
    <div 
      className="relative overflow-hidden rounded-xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
      style={{ background: gradient }}
      onClick={onClick}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Icon className="h-8 w-8 text-white" />
          {stats && (
            <span className="text-white/80 text-sm font-medium">{stats}</span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/90 text-sm leading-relaxed">{description}</p>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Icon className="w-full h-full text-white" />
      </div>
    </div>
  );
};

interface DashboardStatsProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  trend: 'up' | 'down' | 'neutral';
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend
}) => {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className={`text-sm mt-1 ${trendColor}`}>{change}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
};

export const EnhancedDashboardView: React.FC = () => {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeAgents: 0,
    totalLeads: 0,
    conversionRate: '0%'
  });

  useEffect(() => {
    // Simulate loading stats
    setStats({
      totalCampaigns: 12,
      activeAgents: 8,
      totalLeads: 1247,
      conversionRate: '24.5%'
    });
  }, []);

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // These would typically trigger navigation or modals
    switch (action) {
      case 'campaign':
        // Navigate to campaign wizard
        break;
      case 'agent':
        // Navigate to agent creation
        break;
      case 'analytics':
        // Navigate to analytics
        break;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your marketing automation.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardStats
          title="Total Campaigns"
          value={stats.totalCampaigns.toString()}
          change="+12% from last month"
          icon={Target}
          trend="up"
        />
        <DashboardStats
          title="Active AI Agents"
          value={stats.activeAgents.toString()}
          change="+3 new this week"
          icon={Bot}
          trend="up"
        />
        <DashboardStats
          title="Total Leads"
          value={stats.totalLeads.toLocaleString()}
          change="+8.2% from last week"
          icon={Users}
          trend="up"
        />
        <DashboardStats
          title="Conversion Rate"
          value={stats.conversionRate}
          change="+2.1% improvement"
          icon={TrendingUp}
          trend="up"
        />
      </div>

      {/* Quick Action Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Campaign Wizard"
            description="Create a new marketing campaign with AI-powered content generation and targeting."
            icon={Target}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            onClick={() => handleQuickAction('campaign')}
            stats="12 Active"
          />
          <QuickActionCard
            title="Create AI Agent"
            description="Build intelligent agents to automate customer interactions and lead nurturing."
            icon={Bot}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            onClick={() => handleQuickAction('agent')}
            stats="8 Running"
          />
          <QuickActionCard
            title="Analytics Hub"
            description="Dive deep into campaign performance, lead insights, and conversion analytics."
            icon={BarChart3}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            onClick={() => handleQuickAction('analytics')}
            stats="24.5% CVR"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">New campaign "Holiday Promotion" created</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Zap className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">AI Agent "Customer Support Bot" activated</p>
              <p className="text-xs text-gray-500">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">47 new leads captured from social media</p>
              <p className="text-xs text-gray-500">6 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardView;
