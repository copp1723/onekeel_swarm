import React, { useState, useEffect, memo } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';

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
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
      lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600">Manage your lead database</p>
          </div>
          <button
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={onImportLeads}
          >
            <Plus className="h-4 w-4" />
            <span>Add New Lead</span>
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span className="text-lg font-semibold">Lead Management</span>
            </div>
            <p className="text-gray-600 mt-1">View and manage your leads</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500 mb-4">
                Get started by importing your first leads or adding them manually.
              </p>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                onClick={onImportLeads}
              >
                Import Leads
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">
            Manage your lead database ({filteredLeads.length} of {leads.length})
          </p>
        </div>
        <button
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          onClick={onImportLeads}
        >
          <Plus className="h-4 w-4" />
          <span>Add New Lead</span>
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span className="text-lg font-semibold">Leads ({filteredLeads.length})</span>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleLeadClick(lead)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
                  <p className="text-sm text-gray-600">{lead.email}</p>
                  {lead.phone && <p className="text-sm text-gray-600">{lead.phone}</p>}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                    lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                    lead.status === 'converted' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lead.status}
                  </span>
                  {lead.score && (
                    <p className="text-sm text-gray-500 mt-1">Score: {lead.score}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

LeadsView.displayName = 'LeadsView';

export { LeadsView };
export default LeadsView; 