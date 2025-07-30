import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  MessageSquare,
  Search,
  Filter,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

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
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  notes?: string;
}

interface LeadTableProps {
  leads: Lead[];
  loading?: boolean;
  onLeadSelect?: (lead: Lead) => void;
  onLeadEdit?: (lead: Lead) => void;
  onLeadDelete?: (leadId: string) => void;
  onLeadView?: (lead: Lead) => void;
  onBulkAction?: (action: string, leadIds: string[]) => void;
  onCreateLead?: () => void;
  onImportLeads?: () => void;
  onExportLeads?: () => void;
}

export function LeadTable({
  leads,
  loading = false,
  onLeadSelect,
  onLeadEdit,
  onLeadDelete,
  onLeadView,
  onBulkAction,
  onCreateLead,
  onImportLeads,
  onExportLeads
}: LeadTableProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      converted: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredAndSortedLeads = leads
    .filter(lead => {
      const matchesSearch = searchTerm === '' || 
        `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm));
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      
      return matchesSearch && matchesStatus && matchesSource;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Lead] || '';
      const bValue = b[sortBy as keyof Lead] || '';
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredAndSortedLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedLeads.length > 0 && onBulkAction) {
      onBulkAction(action, selectedLeads);
      setSelectedLeads([]);
    }
  };

  const uniqueSources = Array.from(new Set(leads.map(lead => lead.source)));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads Management</h2>
          <p className="text-gray-600">
            {filteredAndSortedLeads.length} of {leads.length} leads
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {onCreateLead && (
            <Button onClick={onCreateLead} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </Button>
          )}
          {onImportLeads && (
            <Button variant="outline" onClick={onImportLeads}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          {onExportLeads && (
            <Button variant="outline" onClick={onExportLeads}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedLeads.length} lead(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('assign_campaign')}
                >
                  Assign to Campaign
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('update_status')}
                >
                  Update Status
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.map((lead) => (
              <TableRow 
                key={lead.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onLeadSelect?.(lead)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'N/A'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.phone || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(lead.status)}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {getChannelIcon(lead.assignedChannel)}
                    <span className="ml-2">{lead.assignedChannel || 'None'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.qualificationScore ? (
                    <span className="font-medium">{lead.qualificationScore}</span>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onLeadView && (
                        <DropdownMenuItem onClick={() => onLeadView(lead)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      {onLeadEdit && (
                        <DropdownMenuItem onClick={() => onLeadEdit(lead)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onLeadDelete && (
                        <DropdownMenuItem 
                          onClick={() => onLeadDelete(lead.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredAndSortedLeads.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No leads found matching your criteria</p>
          </div>
        )}
      </Card>
    </div>
  );
}
