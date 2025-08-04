import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';
import { VirtualLeadsList, useVirtualList, PerformanceProfiler } from '@/components/performance';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  createdAt: string;
  lastActivity?: string;
  score?: number;
}

interface LeadsViewProps {
  onImportLeads?: () => void;
}

const LeadsView: React.FC<LeadsViewProps> = memo(({ onImportLeads }) => {
  const terminology = useTerminology();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockLeads: Lead[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `lead-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
        status: ['new', 'contacted', 'qualified', 'converted', 'lost'][i % 5] as Lead['status'],
        source: ['Website', 'Social Media', 'Referral', 'Cold Call', 'Email'][i % 5],
        createdAt: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        score: Math.floor(Math.random() * 100)
      }));
      setLeads(mockLeads);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and search leads
  const filteredLeads = useVirtualList(
    leads,
    searchQuery,
    selectedStatus === 'all' ? undefined : (lead) => lead.status === selectedStatus,
    (lead, query) => {
      const searchTerm = query.toLowerCase();
      return (
        lead.firstName.toLowerCase().includes(searchTerm) ||
        lead.lastName.toLowerCase().includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm)
      );
    }
  );

  const handleLeadClick = (lead: Lead) => {
    console.log('Lead clicked:', lead);
    // Navigate to lead detail or open modal
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{terminology.pluralCapitalized}</h1>
            <p className="text-gray-600">Manage your {terminology.singular} database</p>
          </div>
          <Button className="flex items-center space-x-2" onClick={onImportLeads}>
            <Plus className="h-4 w-4" />
            <span>{terminology.addNew}</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{terminology.singularCapitalized} Management</span>
            </CardTitle>
            <CardDescription>
              View and manage your {terminology.plural}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{terminology.noItemsFound}</h3>
              <p className="text-gray-500 mb-4">
                Get started by importing your first {terminology.plural} or adding them manually.
              </p>
              <Button onClick={onImportLeads}>{terminology.importBulk}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PerformanceProfiler id="LeadsView">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{terminology.pluralCapitalized}</h1>
            <p className="text-gray-600">
              Manage your {terminology.singular} database ({filteredLeads.length} of {leads.length})
            </p>
          </div>
          <Button className="flex items-center space-x-2" onClick={onImportLeads}>
            <Plus className="h-4 w-4" />
            <span>{terminology.addNew}</span>
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={`Search ${terminology.plural}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Virtual Scrolling List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{terminology.pluralCapitalized} ({filteredLeads.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <VirtualLeadsList
              leads={filteredLeads}
              onLeadClick={handleLeadClick}
              className="border-t"
            />
          </CardContent>
        </Card>
      </div>
    </PerformanceProfiler>
  );
});

LeadsView.displayName = 'LeadsView';

export { LeadsView };
export default LeadsView; 