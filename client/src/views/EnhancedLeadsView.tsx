import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LeadTable, 
  LeadForm, 
  LeadDetails, 
  LeadFilters, 
  CampaignAssignment, 
  BulkActions,
  type LeadFiltersType 
} from '@/components/leads';
import { useLeads } from '@/hooks/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Upload, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

type ViewMode = 'table' | 'form' | 'details' | 'campaign-assignment' | 'bulk-actions';

export function EnhancedLeadsView() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const {
    leads,
    filteredLeads,
    loading,
    error,
    filters,
    totalCount,
    availableSources,
    availableCampaigns,
    fetchLeads,
    setFilters,
    createLead,
    updateLead,
    deleteLead,
    bulkUpdateLeads,
    bulkDeleteLeads,
    assignToCampaign
  } = useLeads();

  const handleCreateLead = () => {
    setSelectedLead(null);
    setViewMode('form');
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setViewMode('form');
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setViewMode('details');
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      await deleteLead(leadId);
      toast({
        title: 'Success',
        description: 'Lead deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete lead',
        variant: 'destructive'
      });
    }
  };

  const handleSaveLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedLead) {
        await updateLead(selectedLead.id, leadData);
        toast({
          title: 'Success',
          description: 'Lead updated successfully'
        });
      } else {
        await createLead(leadData);
        toast({
          title: 'Success',
          description: 'Lead created successfully'
        });
      }
      setViewMode('table');
      setSelectedLead(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: selectedLead ? 'Failed to update lead' : 'Failed to create lead',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleBulkAction = (action: string, leadIds: string[]) => {
    const leads = filteredLeads.filter(lead => leadIds.includes(lead.id));
    setSelectedLeads(leads);
    
    if (action === 'assign_campaign') {
      setViewMode('campaign-assignment');
    } else {
      setViewMode('bulk-actions');
    }
  };

  const handleBulkUpdate = async (updates: Partial<Lead>) => {
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      await bulkUpdateLeads(leadIds, updates);
      toast({
        title: 'Success',
        description: `${selectedLeads.length} lead(s) updated successfully`
      });
      setViewMode('table');
      setSelectedLeads([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update leads',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleBulkDelete = async () => {
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      await bulkDeleteLeads(leadIds);
      toast({
        title: 'Success',
        description: `${selectedLeads.length} lead(s) deleted successfully`
      });
      setViewMode('table');
      setSelectedLeads([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete leads',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleCampaignAssignment = async (leadIds: string[], campaignId: string, options?: any) => {
    try {
      await assignToCampaign(leadIds, campaignId);
      toast({
        title: 'Success',
        description: `${leadIds.length} lead(s) assigned to campaign successfully`
      });
      setViewMode('table');
      setSelectedLeads([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign leads to campaign',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleExportLeads = () => {
    // Create CSV content
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Source', 'Score', 'Created'];
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        lead.firstName || '',
        lead.lastName || '',
        lead.email,
        lead.phone || '',
        lead.status,
        lead.source,
        lead.qualificationScore || '',
        new Date(lead.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Error loading leads</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <Button onClick={fetchLeads} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-600">Manage your lead database with advanced tools</p>
        </div>
        <div className="flex items-center space-x-2">
          {viewMode !== 'table' && (
            <Button variant="outline" onClick={() => setViewMode('table')}>
              Back to List
            </Button>
          )}
          {viewMode === 'table' && (
            <>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleExportLeads}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleCreateLead}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'table' && (
        <>
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableSources={availableSources}
            availableCampaigns={availableCampaigns}
            totalResults={totalCount}
            loading={loading}
          />
          <LeadTable
            leads={filteredLeads}
            loading={loading}
            onLeadSelect={handleViewLead}
            onLeadEdit={handleEditLead}
            onLeadDelete={handleDeleteLead}
            onLeadView={handleViewLead}
            onBulkAction={handleBulkAction}
            onCreateLead={handleCreateLead}
            onImportLeads={() => setShowImportDialog(true)}
            onExportLeads={handleExportLeads}
          />
        </>
      )}

      {viewMode === 'form' && (
        <LeadForm
          lead={selectedLead || undefined}
          campaigns={availableCampaigns}
          onSave={handleSaveLead}
          onCancel={() => setViewMode('table')}
          loading={loading}
        />
      )}

      {viewMode === 'details' && selectedLead && (
        <LeadDetails
          lead={selectedLead}
          campaign={availableCampaigns.find(c => c.id === selectedLead.campaignId)}
          onEdit={() => setViewMode('form')}
          onClose={() => setViewMode('table')}
          loading={loading}
        />
      )}

      {viewMode === 'campaign-assignment' && (
        <CampaignAssignment
          leads={selectedLeads}
          campaigns={availableCampaigns}
          onAssign={handleCampaignAssignment}
          onClose={() => setViewMode('table')}
          loading={loading}
        />
      )}

      {viewMode === 'bulk-actions' && (
        <BulkActions
          selectedLeads={selectedLeads}
          campaigns={availableCampaigns}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
          onAssignToCampaign={(leadIds, campaignId) => assignToCampaign(leadIds, campaignId)}
          onClose={() => setViewMode('table')}
          loading={loading}
        />
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-600 mb-4">
              Upload a CSV file to import multiple leads at once. The file should include columns for 
              firstName, lastName, email, phone, source, and any other lead data.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                // Handle file upload here
                console.log('File selected:', e.target.files?.[0]);
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
