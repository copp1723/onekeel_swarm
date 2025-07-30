import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Target, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  source: string;
  assignedChannel?: 'email' | 'sms' | 'chat';
  campaignId?: string;
  notes?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface BulkActionsProps {
  selectedLeads: Lead[];
  campaigns: Campaign[];
  onBulkUpdate: (updates: Partial<Lead>) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onAssignToCampaign: (leadIds: string[], campaignId: string) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

type ActionType = 'update_status' | 'assign_channel' | 'assign_campaign' | 'add_notes' | 'delete';

export function BulkActions({
  selectedLeads,
  campaigns,
  onBulkUpdate,
  onBulkDelete,
  onAssignToCampaign,
  onClose,
  loading = false
}: BulkActionsProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | ''>('');
  const [updateData, setUpdateData] = useState<any>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const channelOptions = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Phone },
    { value: 'chat', label: 'Chat', icon: MessageSquare }
  ];

  const actionOptions = [
    { value: 'update_status', label: 'Update Status', icon: Edit },
    { value: 'assign_channel', label: 'Assign Channel', icon: MessageSquare },
    { value: 'assign_campaign', label: 'Assign to Campaign', icon: Target },
    { value: 'add_notes', label: 'Add Notes', icon: Edit },
    { value: 'delete', label: 'Delete Leads', icon: Trash2, dangerous: true }
  ];

  const handleActionChange = (action: ActionType) => {
    setSelectedAction(action);
    setUpdateData({});
  };

  const handleExecuteAction = async () => {
    try {
      switch (selectedAction) {
        case 'update_status':
          if (updateData.status) {
            await onBulkUpdate({ status: updateData.status });
          }
          break;
        case 'assign_channel':
          if (updateData.assignedChannel) {
            await onBulkUpdate({ assignedChannel: updateData.assignedChannel });
          }
          break;
        case 'assign_campaign':
          if (updateData.campaignId) {
            const leadIds = selectedLeads.map(lead => lead.id);
            await onAssignToCampaign(leadIds, updateData.campaignId);
          }
          break;
        case 'add_notes':
          if (updateData.notes) {
            await onBulkUpdate({ notes: updateData.notes });
          }
          break;
        case 'delete':
          await onBulkDelete();
          break;
      }
      onClose();
    } catch (error) {
      console.error('Error executing bulk action:', error);
    }
  };

  const handleConfirmAction = (action: () => void) => {
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  const getActionIcon = (action: string) => {
    const option = actionOptions.find(opt => opt.value === action);
    if (option) {
      const Icon = option.icon;
      return <Icon className="h-4 w-4" />;
    }
    return null;
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'update_status':
        return (
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select 
              value={updateData.status || ''} 
              onValueChange={(value) => setUpdateData({ ...updateData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'assign_channel':
        return (
          <div>
            <Label htmlFor="channel">Assigned Channel</Label>
            <Select 
              value={updateData.assignedChannel || ''} 
              onValueChange={(value) => setUpdateData({ ...updateData, assignedChannel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'assign_campaign':
        return (
          <div>
            <Label htmlFor="campaign">Campaign</Label>
            <Select 
              value={updateData.campaignId || ''} 
              onValueChange={(value) => setUpdateData({ ...updateData, campaignId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'add_notes':
        return (
          <div>
            <Label htmlFor="notes">Notes to Add</Label>
            <Textarea
              id="notes"
              placeholder="Enter notes to add to all selected leads..."
              value={updateData.notes || ''}
              onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
              rows={3}
            />
          </div>
        );

      case 'delete':
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will permanently delete {selectedLeads.length} lead(s). 
              This cannot be undone.
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  const canExecuteAction = () => {
    switch (selectedAction) {
      case 'update_status':
        return updateData.status;
      case 'assign_channel':
        return updateData.assignedChannel;
      case 'assign_campaign':
        return updateData.campaignId;
      case 'add_notes':
        return updateData.notes?.trim();
      case 'delete':
        return true;
      default:
        return false;
    }
  };

  const isDangerousAction = selectedAction === 'delete';

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Bulk Actions</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Leads Summary */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-2">Selected Leads ({selectedLeads.length})</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedLeads.slice(0, 5).map(lead => (
                <div key={lead.id} className="text-sm text-gray-600">
                  {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'N/A'} - {lead.email}
                </div>
              ))}
              {selectedLeads.length > 5 && (
                <div className="text-sm text-gray-500">
                  ... and {selectedLeads.length - 5} more
                </div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <Label htmlFor="action">Select Action</Label>
            <Select 
              value={selectedAction} 
              onValueChange={(value) => handleActionChange(value as ActionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an action" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className={`h-4 w-4 ${option.dangerous ? 'text-red-500' : ''}`} />
                      <span className={option.dangerous ? 'text-red-600' : ''}>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Form */}
          {selectedAction && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getActionIcon(selectedAction)}
                <h4 className="font-medium">
                  {actionOptions.find(opt => opt.value === selectedAction)?.label}
                </h4>
              </div>
              {renderActionForm()}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (isDangerousAction) {
                  handleConfirmAction(handleExecuteAction);
                } else {
                  handleExecuteAction();
                }
              }}
              disabled={loading || !canExecuteAction()}
              variant={isDangerousAction ? 'destructive' : 'default'}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                getActionIcon(selectedAction)
              )}
              <span className="ml-2">
                Execute Action
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Confirm Action</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedAction === 'delete' ? 'delete' : 'update'} {selectedLeads.length} lead(s)? 
              {selectedAction === 'delete' && ' This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setShowConfirmDialog(false);
                confirmAction();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
