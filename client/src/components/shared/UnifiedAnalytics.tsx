import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calculator, TrendingUp, Users } from 'lucide-react';

// Type definitions
interface Campaign {
  id: string;
  name: string;
  [key: string]: any;
}

interface UnifiedAgentConfig {
  id: string;
  active: boolean;
  [key: string]: any;
}

interface LeadStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
}

interface ClientMetrics {
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

interface UnifiedAnalyticsProps {
  // Campaign Analytics
  campaigns?: Campaign[];
  agents?: UnifiedAgentConfig[];
  
  // Lead Stats
  leadStats?: LeadStats;
  
  // Benchmark Comparison
  clientIndustry?: 'Real Estate' | 'E-commerce' | 'Finance' | 'Healthcare';
  clientMetrics?: ClientMetrics;
  
  // Quick Actions
  onImportLeads?: () => void;
  onCreateCampaign?: () => void;
  
  // Display options
  showTabs?: boolean;
  defaultTab?: 'overview' | 'benchmarks' | 'roi';
  compact?: boolean;
}

const benchmarkData = {
  'Real Estate': { openRate: 22, clickRate: 2.5, conversionRate: 1.5 },
  'E-commerce': { openRate: 18, clickRate: 2.2, conversionRate: 2.0 },
  'Finance': { openRate: 25, clickRate: 3.0, conversionRate: 1.8 },
  'Healthcare': { openRate: 28, clickRate: 3.5, conversionRate: 2.5 },
};

export function UnifiedAnalytics({
  campaigns = [],
  agents = [],
  leadStats,
  clientIndustry,
  clientMetrics,
  onImportLeads,
  onCreateCampaign,
  showTabs = true,
  defaultTab = 'overview',
  compact = false
}: UnifiedAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'benchmarks' | 'roi'>(defaultTab);

  // Lead Stats Component
  const LeadStatsView = () => {
    const defaultStats = {
      totalLeads: 0,
      newLeads: 0,
      contactedLeads: 0,
      qualifiedLeads: 0,
      ...leadStats
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{defaultStats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{defaultStats.newLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{defaultStats.contactedLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{defaultStats.qualifiedLeads}</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Campaign Overview Component
  const CampaignOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Campaign Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Agents</p>
              <p className="text-2xl font-bold">{agents.filter(a => a.active).length}</p>
            </div>
          </div>
          
          {campaigns.length === 0 && (
            <p className="text-gray-600">No active campaigns. Create your first campaign to see detailed analytics.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Quick Actions Component
  const QuickActionsView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onImportLeads}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Import Leads</span>
          </button>
          <button
            onClick={onCreateCampaign}
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="h-8 w-8 bg-green-500 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-gray-900">Create Campaign</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  // Benchmark Comparison Component
  const BenchmarkComparisonView = () => {
    if (!clientIndustry || !clientMetrics) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Industry Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Configure industry and metrics to see benchmark comparison.</p>
          </CardContent>
        </Card>
      );
    }

    const benchmarks = benchmarkData[clientIndustry];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance vs. {clientIndustry} Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="font-medium">Open Rate</h4>
              <span className="text-sm text-gray-600">Benchmark: {benchmarks.openRate}%</span>
            </div>
            <Progress value={(clientMetrics.openRate / benchmarks.openRate) * 100} />
            <p className="text-right text-lg font-bold">{clientMetrics.openRate.toFixed(2)}%</p>
          </div>
          
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="font-medium">Click-Through Rate</h4>
              <span className="text-sm text-gray-600">Benchmark: {benchmarks.clickRate}%</span>
            </div>
            <Progress value={(clientMetrics.clickRate / benchmarks.clickRate) * 100} />
            <p className="text-right text-lg font-bold">{clientMetrics.clickRate.toFixed(2)}%</p>
          </div>

          <div>
             <div className="flex justify-between items-baseline mb-1">
              <h4 className="font-medium">Conversion Rate</h4>
              <span className="text-sm text-gray-600">Benchmark: {benchmarks.conversionRate}%</span>
            </div>
            <Progress value={(clientMetrics.conversionRate / benchmarks.conversionRate) * 100} />
            <p className="text-right text-lg font-bold">{clientMetrics.conversionRate.toFixed(2)}%</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ROI Calculator Component
  const ROICalculatorView = () => {
    const [campaignCost, setCampaignCost] = useState('');
    const [revenueGenerated, setRevenueGenerated] = useState('');

    const roi = useMemo(() => {
      const cost = parseFloat(campaignCost);
      const revenue = parseFloat(revenueGenerated);

      if (isNaN(cost) || isNaN(revenue) || cost === 0) {
        return null;
      }

      const calculatedRoi = ((revenue - cost) / cost) * 100;
      return calculatedRoi.toFixed(2);
    }, [campaignCost, revenueGenerated]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ROI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaignCost">Total Campaign Cost ($)</Label>
            <Input 
              id="campaignCost"
              type="number"
              value={campaignCost}
              onChange={e => setCampaignCost(e.target.value)}
              placeholder="e.g., 5000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenueGenerated">Total Revenue Generated ($)</Label>
            <Input 
              id="revenueGenerated"
              type="number"
              value={revenueGenerated}
              onChange={e => setRevenueGenerated(e.target.value)}
              placeholder="e.g., 20000"
            />
          </div>
          
          {roi !== null && (
            <div className="pt-4">
              <h4 className="text-lg font-semibold">Calculated ROI</h4>
              <p className={`text-3xl font-bold ${parseFloat(roi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Compact View
  if (compact) {
    return (
      <div className="space-y-4">
        <CampaignOverview />
        {leadStats && <LeadStatsView />}
      </div>
    );
  }

  // Tabbed View
  if (showTabs) {
    return (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'benchmarks' | 'roi')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <CampaignOverview />
          {leadStats && <LeadStatsView />}
          {(onImportLeads || onCreateCampaign) && <QuickActionsView />}
        </TabsContent>
        
        <TabsContent value="benchmarks">
          <BenchmarkComparisonView />
        </TabsContent>
        
        <TabsContent value="roi">
          <ROICalculatorView />
        </TabsContent>
      </Tabs>
    );
  }

  // Single View (all components stacked)
  return (
    <div className="space-y-6">
      <CampaignOverview />
      {leadStats && <LeadStatsView />}
      {(onImportLeads || onCreateCampaign) && <QuickActionsView />}
      <BenchmarkComparisonView />
      <ROICalculatorView />
    </div>
  );
}

// Export individual components for backward compatibility
export const CampaignAnalytics = ({ campaigns, agents }: { campaigns: Campaign[], agents: UnifiedAgentConfig[] }) => (
  <UnifiedAnalytics campaigns={campaigns} agents={agents} compact={true} showTabs={false} />
);

export const SimpleReport = ({ stats }: { stats?: LeadStats }) => (
  <UnifiedAnalytics leadStats={stats} compact={true} showTabs={false} />
);

export const BenchmarkComparison = ({ clientIndustry, clientMetrics }: { 
  clientIndustry: 'Real Estate' | 'E-commerce' | 'Finance' | 'Healthcare', 
  clientMetrics: ClientMetrics 
}) => (
  <UnifiedAnalytics 
    clientIndustry={clientIndustry} 
    clientMetrics={clientMetrics} 
    compact={true} 
    showTabs={false} 
    defaultTab="benchmarks" 
  />
);

export const ROICalculator = () => (
  <UnifiedAnalytics compact={true} showTabs={false} defaultTab="roi" />
);

export const QuickActions = ({ onImportLeads, onCreateCampaign }: {
  onImportLeads?: () => void;
  onCreateCampaign?: () => void;
}) => (
  <UnifiedAnalytics 
    onImportLeads={onImportLeads} 
    onCreateCampaign={onCreateCampaign} 
    compact={true} 
    showTabs={false} 
  />
);