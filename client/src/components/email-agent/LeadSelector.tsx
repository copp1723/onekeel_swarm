import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Search, Filter, Plus, Minus } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  qualificationScore?: number;
  source: string;
  campaignId?: string;
}

interface LeadSelectorProps {
  selectedLeads: string[];
  onLeadsChange: (leadIds: string[]) => void;
}

export function LeadSelector({
  selectedLeads,
  onLeadsChange,
}: LeadSelectorProps) {
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAvailableLeads();
  }, []);

  const fetchAvailableLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/campaigns/available-leads');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with leads property
        const leadsArray = Array.isArray(data) ? data : data.leads || [];
        setAvailableLeads(leadsArray);
      }
    } catch (error) {
      console.error('Error fetching available leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = availableLeads.filter(lead => {
    const matchesSearch =
      !searchTerm ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedLeadObjects = availableLeads.filter(lead =>
    selectedLeads.includes(lead.id)
  );

  const toggleLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      onLeadsChange(selectedLeads.filter(id => id !== leadId));
    } else {
      onLeadsChange([...selectedLeads, leadId]);
    }
  };

  const selectAll = () => {
    onLeadsChange(filteredLeads.map(lead => lead.id));
  };

  const clearAll = () => {
    onLeadsChange([]);
  };

  const statusOptions = [
    'all',
    'new',
    'contacted',
    'responded',
    'qualified',
    'unqualified',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <Users className='h-5 w-5' />
          <span>Select Leads</span>
          {selectedLeads.length > 0 && (
            <Badge variant='secondary'>{selectedLeads.length} selected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Choose which leads to include in this campaign
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Search and Filter Controls */}
        <div className='flex space-x-2'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-gray-500' />
              <Input
                placeholder='Search leads by name or email...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-8'
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md text-sm'
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status === 'all'
                  ? 'All Status'
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className='flex space-x-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={selectAll}
            disabled={filteredLeads.length === 0}
          >
            <Plus className='h-4 w-4 mr-1' />
            Select All ({filteredLeads.length})
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={clearAll}
            disabled={selectedLeads.length === 0}
          >
            <Minus className='h-4 w-4 mr-1' />
            Clear All
          </Button>
        </div>

        {/* Selected Leads Summary */}
        {selectedLeads.length > 0 && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
            <p className='text-sm font-medium text-blue-900 mb-2'>
              Selected Leads ({selectedLeads.length})
            </p>
            <div className='flex flex-wrap gap-1'>
              {selectedLeadObjects.slice(0, 10).map(lead => (
                <Badge key={lead.id} variant='secondary' className='text-xs'>
                  {lead.name}
                </Badge>
              ))}
              {selectedLeadObjects.length > 10 && (
                <Badge variant='secondary' className='text-xs'>
                  +{selectedLeadObjects.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Leads List */}
        <div className='border rounded-lg max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='p-4 text-center text-gray-500'>
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className='p-4 text-center text-gray-500'>
              {searchTerm || statusFilter !== 'all'
                ? 'No leads match your filters'
                : 'No available leads found'}
            </div>
          ) : (
            <div className='divide-y'>
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  className='p-3 hover:bg-gray-50 flex items-center space-x-3'
                >
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={() => toggleLead(lead.id)}
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {lead.name}
                        </p>
                        <p className='text-sm text-gray-500 truncate'>
                          {lead.email}
                        </p>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Badge
                          variant='outline'
                          className={`text-xs ${
                            lead.status === 'qualified'
                              ? 'bg-green-50 text-green-700'
                              : lead.status === 'new'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {lead.status}
                        </Badge>
                        {lead.qualificationScore && (
                          <Badge variant='secondary' className='text-xs'>
                            Score: {lead.qualificationScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
