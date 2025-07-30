import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Plus, Search, Filter, MoreHorizontal, Mail, MessageSquare, Phone, Upload, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { LeadImport } from '@/components/lead-import';

interface LeadsViewProps {
  onImportLeads?: () => void;
}

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  qualificationScore?: number;
  assignedChannel?: 'email' | 'sms' | 'chat';
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
}

interface AddLeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ onImportLeads }) => {
  const terminology = useTerminology();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'website',
    notes: ''
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const pageSize = 10;

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(sourceFilter !== 'all' && { source: sourceFilter })
      });

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads);
        setTotalLeads(data.total);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, debouncedSearch, statusFilter, sourceFilter]);

  // Add new lead
  const handleAddLead = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addLeadForm)
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `${terminology.singularCapitalized} added successfully`
        });
        setShowAddDialog(false);
        setAddLeadForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          source: 'website',
          notes: ''
        });
        fetchLeads();
      } else {
        throw new Error(data.error?.message || 'Failed to add lead');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add lead',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${terminology.singular}?`)) return;
    
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `${terminology.singularCapitalized} deleted successfully`
        });
        fetchLeads();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete lead',
        variant: 'destructive'
      });
    }
  };

  // Update lead status
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Status updated successfully'
        });
        fetchLeads();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  // Start conversation
  const handleStartConversation = async (lead: Lead, channel: 'email' | 'sms' | 'chat') => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          channel,
          agentType: channel
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `${channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Chat'} conversation started`
        });
        // Navigate to conversation view or open conversation panel
        window.location.href = `/conversations/${data.conversation.id}`;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'contacted': return 'secondary';
      case 'qualified': return 'outline';
      case 'converted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };

  const totalPages = Math.ceil(totalLeads / pageSize);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{terminology.pluralCapitalized}</h1>
          <p className="text-gray-600">Manage your {terminology.singular} database</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Button>
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            <span>{terminology.addNew}</span>
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={`Search ${terminology.plural}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
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
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading {terminology.plural}...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{terminology.noItemsFound}</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' 
                  ? `No ${terminology.plural} found matching your criteria.`
                  : `Get started by importing your first ${terminology.plural} or adding them manually.`}
              </p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  {terminology.importBulk}
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  {terminology.addNew}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName || lead.lastName 
                            ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                            : 'Unnamed'}
                        </TableCell>
                        <TableCell>{lead.email || '—'}</TableCell>
                        <TableCell>{lead.phone || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.qualificationScore !== undefined 
                            ? `${lead.qualificationScore}%` 
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleStartConversation(lead, 'email')}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStartConversation(lead, 'sms')}
                              >
                                <Phone className="mr-2 h-4 w-4" />
                                Send SMS
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStartConversation(lead, 'chat')}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Start Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => window.location.href = `/leads/${lead.id}`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} {terminology.plural}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{terminology.addNew}</DialogTitle>
            <DialogDescription>
              Add a new {terminology.singular} to your database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={addLeadForm.firstName}
                  onChange={(e) => setAddLeadForm({ ...addLeadForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={addLeadForm.lastName}
                  onChange={(e) => setAddLeadForm({ ...addLeadForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={addLeadForm.email}
                onChange={(e) => setAddLeadForm({ ...addLeadForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={addLeadForm.phone}
                onChange={(e) => setAddLeadForm({ ...addLeadForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select 
                value={addLeadForm.source} 
                onValueChange={(value) => setAddLeadForm({ ...addLeadForm, source: value })}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={addLeadForm.notes}
                onChange={(e) => setAddLeadForm({ ...addLeadForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLead} 
              disabled={!addLeadForm.email || actionLoading}
            >
              {actionLoading ? 'Adding...' : 'Add ' + terminology.singularCapitalized}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import {terminology.pluralCapitalized}</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple {terminology.plural} at once
            </DialogDescription>
          </DialogHeader>
          <LeadImport />
        </DialogContent>
      </Dialog>
    </div>
  );
}; 