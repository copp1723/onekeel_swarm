import { useState, useEffect, useCallback } from 'react';
import { LeadFilters } from '@/components/leads/LeadFilters';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  qualificationScore?: number;
  assignedChannel?: 'email' | 'sms' | 'chat';
  campaignId?: string;
  creditScore?: number;
  income?: number;
  employer?: string;
  jobTitle?: string;
  metadata?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseLeadsOptions {
  autoFetch?: boolean;
  initialFilters?: Partial<LeadFilters>;
}

interface UseLeadsReturn {
  leads: Lead[];
  filteredLeads: Lead[];
  loading: boolean;
  error: string | null;
  filters: LeadFilters;
  totalCount: number;
  availableSources: string[];
  availableCampaigns: Array<{ id: string; name: string; status: string }>;
  
  // Actions
  fetchLeads: () => Promise<void>;
  setFilters: (filters: LeadFilters) => void;
  createLead: (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Lead>;
  updateLead: (id: string, leadData: Partial<Lead>) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  bulkUpdateLeads: (leadIds: string[], updates: Partial<Lead>) => Promise<void>;
  bulkDeleteLeads: (leadIds: string[]) => Promise<void>;
  assignToCampaign: (leadIds: string[], campaignId: string) => Promise<void>;
}

const defaultFilters: LeadFilters = {
  search: '',
  status: [],
  source: [],
  assignedChannel: [],
  qualificationScoreRange: [0, 100],
  creditScoreRange: [300, 850],
  incomeRange: [0, 500000],
  dateRange: {},
  campaignId: [],
  hasNotes: null,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { autoFetch = true, initialFilters = {} } = options;
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    ...defaultFilters,
    ...initialFilters
  });
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{ id: string; name: string; status: string }>>([]);

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status.length > 0) params.append('status', filters.status.join(','));
      if (filters.source.length > 0) params.append('source', filters.source.join(','));
      if (filters.assignedChannel.length > 0) params.append('assignedChannel', filters.assignedChannel.join(','));
      if (filters.campaignId.length > 0) params.append('campaignId', filters.campaignId.join(','));
      if (filters.dateRange.from) params.append('dateFrom', filters.dateRange.from.toISOString());
      if (filters.dateRange.to) params.append('dateTo', filters.dateRange.to.toISOString());
      if (filters.hasNotes !== null) params.append('hasNotes', filters.hasNotes.toString());
      
      params.append('sort', filters.sortBy);
      params.append('order', filters.sortOrder);
      params.append('limit', '1000'); // Adjust as needed

      const response = await fetch(`/api/leads?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads';
      setError(errorMessage);
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch available campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setAvailableCampaigns(data.campaigns?.map((c: any) => ({ id: c.id, name: c.name, status: c.status || 'active' })) || []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  }, []);

  // Filter leads client-side for advanced filtering
  const filteredLeads = leads.filter(lead => {
    // Qualification score range
    if (lead.qualificationScore !== undefined) {
      if (lead.qualificationScore < filters.qualificationScoreRange[0] || 
          lead.qualificationScore > filters.qualificationScoreRange[1]) {
        return false;
      }
    }

    // Credit score range
    if (lead.creditScore !== undefined) {
      if (lead.creditScore < filters.creditScoreRange[0] || 
          lead.creditScore > filters.creditScoreRange[1]) {
        return false;
      }
    }

    // Income range
    if (lead.income !== undefined) {
      if (lead.income < filters.incomeRange[0] || 
          lead.income > filters.incomeRange[1]) {
        return false;
      }
    }

    return true;
  });

  // Get unique sources from leads
  const availableSources = Array.from(new Set(leads.map(lead => lead.source)));

  // Create lead
  const createLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create lead');
      }

      const data = await response.json();
      const newLead = data.lead;
      
      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lead';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update lead
  const updateLead = useCallback(async (id: string, leadData: Partial<Lead>): Promise<Lead> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update lead');
      }

      const data = await response.json();
      const updatedLead = data.lead;
      
      setLeads(prev => prev.map(lead => lead.id === id ? updatedLead : lead));
      return updatedLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Delete lead
  const deleteLead = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete lead');
      }

      setLeads(prev => prev.filter(lead => lead.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete lead';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Bulk update leads
  const bulkUpdateLeads = useCallback(async (leadIds: string[], updates: Partial<Lead>): Promise<void> => {
    try {
      const response = await fetch('/api/leads/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds, updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update leads');
      }

      // Refresh leads after bulk update
      await fetchLeads();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update leads';
      setError(errorMessage);
      throw err;
    }
  }, [fetchLeads]);

  // Bulk delete leads
  const bulkDeleteLeads = useCallback(async (leadIds: string[]): Promise<void> => {
    try {
      const response = await fetch('/api/leads/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete leads');
      }

      setLeads(prev => prev.filter(lead => !leadIds.includes(lead.id)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete leads';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Assign leads to campaign
  const assignToCampaign = useCallback(async (leadIds: string[], campaignId: string): Promise<void> => {
    try {
      const response = await fetch('/api/leads/assign-campaign', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds, campaignId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to assign leads to campaign');
      }

      // Update leads locally
      setLeads(prev => prev.map(lead => 
        leadIds.includes(lead.id) ? { ...lead, campaignId } : lead
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign leads to campaign';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
    }
  }, [autoFetch, fetchLeads]);

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    leads,
    filteredLeads,
    loading,
    error,
    filters,
    totalCount: filteredLeads.length,
    availableSources,
    availableCampaigns,
    
    // Actions
    fetchLeads,
    setFilters,
    createLead,
    updateLead,
    deleteLead,
    bulkUpdateLeads,
    bulkDeleteLeads,
    assignToCampaign,
  };
}
