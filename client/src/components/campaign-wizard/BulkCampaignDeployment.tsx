import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Users,
  Target,
  Copy,
  CheckCircle,
  AlertCircle,
  Building,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { CampaignData } from './types';

interface Client {
  id: string;
  name: string;
  email: string;
  industry?: string;
  status: 'active' | 'inactive';
  campaignCount?: number;
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  industry?: string;
  campaignData: CampaignData;
  createdAt: string;
  usageCount: number;
}

interface BulkCampaignDeploymentProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (deploymentConfig: BulkDeploymentConfig) => void;
  campaignTemplate?: CampaignData;
}

interface BulkDeploymentConfig {
  name: string;
  clientIds: string[];
  campaignTemplate: CampaignData;
  customizations: Record<string, Partial<CampaignData>>;
  scheduleOffset: number; // Days to offset start dates between clients
}

export function BulkCampaignDeployment({
  isOpen,
  onClose,
  onDeploy,
  campaignTemplate,
}: BulkCampaignDeploymentProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [campaignTemplates, setCampaignTemplates] = useState<
    CampaignTemplate[]
  >([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [deploymentName, setDeploymentName] = useState('');
  const [scheduleOffset, setScheduleOffset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load clients and templates on mount
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadCampaignTemplates();

      // If a campaign template is provided, set deployment name
      if (campaignTemplate) {
        setDeploymentName(
          `${campaignTemplate.name || 'Campaign'} - Bulk Deployment`
        );
      }
    }
  }, [isOpen, campaignTemplate]);

  const loadClients = async () => {
    try {
      // TODO: Replace with actual API when backend is ready
      console.log('Clients API not yet available - using mock data');

      // Mock clients data for now
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Demo Client 1',
          industry: 'Real Estate',
          status: 'active',
          email: 'demo1@example.com',
        },
        {
          id: '2',
          name: 'Demo Client 2',
          industry: 'Finance',
          status: 'active',
          email: 'demo2@example.com',
        },
      ];

      setClients(mockClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    }
  };

  const loadCampaignTemplates = async () => {
    try {
      // TODO: Replace with actual API when backend is ready
      console.log(
        'Campaign templates API not yet available - using empty state'
      );

      // Set empty templates for now
      setCampaignTemplates([]);
    } catch (error) {
      console.error('Error loading campaign templates:', error);
      // Don't show error for templates as it's optional
    }
  };

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    const activeClients = clients.filter(c => c.status === 'active');
    if (selectedClientIds.length === activeClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(activeClients.map(c => c.id));
    }
  };

  const getSelectedTemplate = (): CampaignData | null => {
    if (campaignTemplate) {
      return campaignTemplate;
    }

    const template = campaignTemplates.find(t => t.id === selectedTemplateId);
    return template?.campaignData || null;
  };

  const handleDeploy = async () => {
    const template = getSelectedTemplate();
    if (!template) {
      setError('Please select a campaign template');
      return;
    }

    if (selectedClientIds.length === 0) {
      setError('Please select at least one client');
      return;
    }

    if (!deploymentName.trim()) {
      setError('Please enter a deployment name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const deploymentConfig: BulkDeploymentConfig = {
        name: deploymentName,
        clientIds: selectedClientIds,
        campaignTemplate: template,
        customizations: {}, // Could be extended for per-client customizations
        scheduleOffset,
      };

      await onDeploy(deploymentConfig);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const activeClients = clients.filter(c => c.status === 'active');
  const selectedClients = clients.filter(c => selectedClientIds.includes(c.id));

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='w-[600px] sm:max-w-[600px] h-full overflow-hidden flex flex-col'>
        <SheetHeader className='flex-shrink-0'>
          <SheetTitle className='flex items-center space-x-2'>
            <Copy className='h-5 w-5' />
            <span>Bulk Campaign Deployment</span>
          </SheetTitle>
          <SheetDescription>
            Deploy the same campaign to multiple clients simultaneously
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto space-y-6 mt-6'>
          {/* Deployment Name */}
          <div className='space-y-2'>
            <Label htmlFor='deploymentName'>Deployment Name</Label>
            <Input
              id='deploymentName'
              value={deploymentName}
              onChange={e => setDeploymentName(e.target.value)}
              placeholder='e.g., Q4 Real Estate Push'
            />
          </div>

          {/* Campaign Template Selection */}
          {!campaignTemplate && (
            <div className='space-y-2'>
              <Label>Campaign Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a campaign template...' />
                </SelectTrigger>
                <SelectContent>
                  {campaignTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className='flex items-center justify-between w-full'>
                        <span>{template.name}</span>
                        {template.industry && (
                          <Badge variant='outline' className='ml-2'>
                            {template.industry}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {campaignTemplates.length === 0 && (
                    <div className='p-2 text-sm text-gray-500 text-center'>
                      No campaign templates available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campaign Template Preview */}
          {(campaignTemplate || selectedTemplateId) && (
            <Card className='bg-blue-50 border-blue-200'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm flex items-center space-x-2'>
                  <Target className='h-4 w-4' />
                  <span>Selected Campaign</span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                {(() => {
                  const template = getSelectedTemplate();
                  return template ? (
                    <div className='space-y-1 text-sm'>
                      <div>
                        <span className='font-medium'>Name:</span>{' '}
                        {template.name}
                      </div>
                      <div>
                        <span className='font-medium'>Goal:</span>{' '}
                        {template.goal}
                      </div>
                      <div>
                        <span className='font-medium'>Templates:</span>{' '}
                        {template.templates.length} emails
                      </div>
                      <div>
                        <span className='font-medium'>Schedule:</span>{' '}
                        {template.schedule.totalEmails} emails,{' '}
                        {template.schedule.daysBetweenEmails} days apart
                      </div>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Schedule Offset */}
          <div className='space-y-2'>
            <Label htmlFor='scheduleOffset'>Schedule Offset (Days)</Label>
            <Input
              id='scheduleOffset'
              type='number'
              min='0'
              max='30'
              value={scheduleOffset}
              onChange={e => setScheduleOffset(parseInt(e.target.value) || 0)}
            />
            <p className='text-xs text-gray-500'>
              Days to stagger campaign start dates between clients (0 = all
              start same day)
            </p>
          </div>

          {/* Client Selection */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <Label>
                Target Clients ({selectedClientIds.length} selected)
              </Label>
              <Button variant='outline' size='sm' onClick={handleSelectAll}>
                {selectedClientIds.length === activeClients.length
                  ? 'Deselect All'
                  : 'Select All Active'}
              </Button>
            </div>

            {error && (
              <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                <div className='flex items-center space-x-2'>
                  <AlertCircle className='h-4 w-4 text-red-600' />
                  <p className='text-sm text-red-700'>{error}</p>
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 gap-3 max-h-60 overflow-y-auto'>
              {activeClients.map(client => (
                <div
                  key={client.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition ${
                    selectedClientIds.includes(client.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleClientToggle(client.id)}
                >
                  <Checkbox
                    checked={selectedClientIds.includes(client.id)}
                    onChange={() => handleClientToggle(client.id)}
                  />
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <Building className='h-4 w-4 text-gray-400' />
                      <span className='font-medium'>{client.name}</span>
                      {client.industry && (
                        <Badge variant='outline' className='text-xs'>
                          {client.industry}
                        </Badge>
                      )}
                    </div>
                    <p className='text-sm text-gray-500'>{client.email}</p>
                    {client.campaignCount !== undefined && (
                      <p className='text-xs text-gray-400'>
                        {client.campaignCount} active campaigns
                      </p>
                    )}
                  </div>
                  {selectedClientIds.includes(client.id) && (
                    <CheckCircle className='h-5 w-5 text-blue-600' />
                  )}
                </div>
              ))}

              {activeClients.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  <Users className='h-12 w-12 text-gray-300 mx-auto mb-3' />
                  <p>No active clients available</p>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Summary */}
          {selectedClientIds.length > 0 && (
            <Card className='bg-green-50 border-green-200'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm flex items-center space-x-2'>
                  <Zap className='h-4 w-4' />
                  <span>Deployment Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <div>
                  <span className='font-medium'>Clients:</span>{' '}
                  {selectedClientIds.length} selected
                </div>
                <div>
                  <span className='font-medium'>Total Campaigns:</span>{' '}
                  {selectedClientIds.length} will be created
                </div>
                <div>
                  <span className='font-medium'>Schedule:</span> Staggered over{' '}
                  {selectedClientIds.length * scheduleOffset} days
                </div>
                <div className='text-xs text-gray-600 mt-2'>
                  Each client will receive their own copy of the campaign with
                  personalized settings
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex justify-between pt-4 border-t flex-shrink-0'>
          <Button variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={
              loading ||
              selectedClientIds.length === 0 ||
              !getSelectedTemplate()
            }
            className='bg-blue-600 hover:bg-blue-700'
          >
            {loading ? (
              'Deploying...'
            ) : (
              <>
                Deploy to {selectedClientIds.length} Client
                {selectedClientIds.length !== 1 ? 's' : ''}
                <ArrowRight className='h-4 w-4 ml-2' />
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
