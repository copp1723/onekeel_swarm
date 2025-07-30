import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, 
  Users, 
  Search, 
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  Calendar,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  status: string;
  source: string;
  qualificationScore?: number;
  assignedChannel?: 'email' | 'sms' | 'chat';
  campaignId?: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignAssignmentProps {
  leads: Lead[];
  campaigns: Campaign[];
  onAssign: (leadIds: string[], campaignId: string, options?: AssignmentOptions) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

interface AssignmentOptions {
  startImmediately: boolean;
  preserveExistingCampaigns: boolean;
  notes?: string;
}

export function CampaignAssignment({ 
  leads, 
  campaigns, 
  onAssign, 
  onClose, 
  loading = false 
}: CampaignAssignmentProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOptions>({
    startImmediately: true,
    preserveExistingCampaigns: false,
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

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

  const getCampaignStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // Filter leads based on search and status
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get active campaigns only
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'active');

  // Validate assignment
  const validateAssignment = () => {
    const errors: string[] = [];
    
    if (selectedLeads.length === 0) {
      errors.push('Please select at least one lead');
    }
    
    if (!selectedCampaign) {
      errors.push('Please select a campaign');
    }
    
    // Campaign validation can be added here if needed
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
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

  const handleAssign = async () => {
    if (!validateAssignment()) {
      return;
    }
    
    try {
      await onAssign(selectedLeads, selectedCampaign, assignmentOptions);
      onClose();
    } catch (error) {
      console.error('Error assigning leads to campaign:', error);
    }
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  const leadsWithExistingCampaigns = selectedLeads.filter(leadId => {
    const lead = leads.find(l => l.id === leadId);
    return lead?.campaignId;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Assign Leads to Campaign</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Select Leads ({selectedLeads.length} selected)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select All */}
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm font-medium">
                Select All ({filteredLeads.length} leads)
              </Label>
            </div>

            {/* Lead List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50">
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600">{lead.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusBadge(lead.status)} variant="secondary">
                          {lead.status}
                        </Badge>
                        {lead.qualificationScore && (
                          <span className="text-xs font-medium">{lead.qualificationScore}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getChannelIcon(lead.assignedChannel)}
                      <span className="text-xs text-gray-500">{lead.source}</span>
                      {lead.campaignId && (
                        <Badge variant="outline" className="text-xs">
                          Already in campaign
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign Selector */}
            <div>
              <Label htmlFor="campaign">Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{campaign.name}</span>
                        <Badge className={getCampaignStatusBadge(campaign.status)} variant="secondary">
                          {campaign.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Details */}
            {selectedCampaignData && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-medium mb-2">{selectedCampaignData.name}</h4>
                <div className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getCampaignStatusBadge(selectedCampaignData.status)} variant="secondary">
                      {selectedCampaignData.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Assignment Options</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="start-immediately"
                    checked={assignmentOptions.startImmediately}
                    onCheckedChange={(checked) => 
                      setAssignmentOptions(prev => ({ ...prev, startImmediately: checked as boolean }))
                    }
                  />
                  <Label htmlFor="start-immediately" className="text-sm">
                    Start campaign immediately
                  </Label>
                </div>

                {leadsWithExistingCampaigns.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-campaigns"
                      checked={assignmentOptions.preserveExistingCampaigns}
                      onCheckedChange={(checked) => 
                        setAssignmentOptions(prev => ({ ...prev, preserveExistingCampaigns: checked as boolean }))
                      }
                    />
                    <Label htmlFor="preserve-campaigns" className="text-sm">
                      Keep leads in existing campaigns
                    </Label>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this assignment..."
                  value={assignmentOptions.notes}
                  onChange={(e) => 
                    setAssignmentOptions(prev => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {leadsWithExistingCampaigns.length > 0 && !assignmentOptions.preserveExistingCampaigns && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {leadsWithExistingCampaigns.length} lead(s) are already assigned to other campaigns. 
            They will be moved to the new campaign.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedLeads.length} lead(s) selected
              {selectedCampaignData && (
                <span> → {selectedCampaignData.name}</span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssign} 
                disabled={loading || selectedLeads.length === 0 || !selectedCampaign}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Assign to Campaign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
