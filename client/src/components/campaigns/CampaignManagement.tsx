import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MoreVertical,
  Users,
  Target,
  Calendar,
  Mail,
  Copy,
  Edit,
  Trash2,
  Plus,
  Sparkles,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  type: 'standard' | 'ai-generated';
  leadCount: number;
  conversions: number;
  createdAt: string;
}

interface CampaignManagementProps {
  campaigns: Campaign[];
  onCreateCampaign: () => void;
  onEditCampaign: (campaignId: string) => void;
  onCloneCampaign: (campaignId: string) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onOpenClassicEditor: () => void;
}

export function CampaignManagement({
  campaigns,
  onCreateCampaign,
  onEditCampaign,
  onCloneCampaign,
  onDeleteCampaign,
  onOpenClassicEditor,
}: CampaignManagementProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (campaignToDelete) {
      onDeleteCampaign(campaignToDelete);
      setCampaignToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-transparent border-0 p-0 h-auto font-normal';
      case 'paused':
        return 'text-yellow-600 bg-transparent border-0 p-0 h-auto font-normal';
      case 'draft':
        return 'text-gray-600 bg-transparent border-0 p-0 h-auto font-normal';
      case 'completed':
        return 'text-blue-600 bg-transparent border-0 p-0 h-auto font-normal';
      default:
        return 'text-gray-600 bg-transparent border-0 p-0 h-auto font-normal';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Campaigns</h1>
          <p className='text-gray-600'>Manage your marketing campaigns</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            onClick={onOpenClassicEditor}
            className='flex items-center gap-2'
          >
            <Plus className='h-4 w-4' />
            Classic Editor
          </Button>
          <Button
            onClick={onCreateCampaign}
            className='flex items-center gap-2 bg-purple-600 hover:bg-purple-700'
          >
            <Sparkles className='h-4 w-4' />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className='space-y-3'>
        {campaigns.length === 0 ? (
          <Card className='p-8 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <Mail className='h-12 w-12 text-gray-400' />
              <div>
                <h3 className='text-lg font-medium text-gray-900'>
                  No campaigns yet
                </h3>
                <p className='text-gray-600'>
                  Create your first campaign to get started
                </p>
              </div>
              <Button
                onClick={onCreateCampaign}
                className='flex items-center gap-2 bg-purple-600 hover:bg-purple-700'
              >
                <Sparkles className='h-4 w-4' />
                Create Campaign
              </Button>
            </div>
          </Card>
        ) : (
          campaigns.map(campaign => (
            <Card
              key={campaign.id}
              className='hover:shadow-sm transition-shadow border border-gray-200'
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between mb-2'>
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {campaign.name}
                      </h3>
                      <div className='flex items-center gap-3'>
                        <Badge
                          variant='outline'
                          className={getStatusColor(campaign.status)}
                        >
                          {campaign.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                            >
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-48'>
                            <DropdownMenuItem
                              onClick={() => onCloneCampaign(campaign.id)}
                              className='flex items-center gap-2'
                            >
                              <Copy className='h-4 w-4' />
                              Clone Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditCampaign(campaign.id)}
                              className='flex items-center gap-2'
                            >
                              <Edit className='h-4 w-4' />
                              Edit Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(campaign.id)}
                              className='flex items-center gap-2 text-red-600 focus:text-red-600'
                            >
                              <Trash2 className='h-4 w-4' />
                              Delete Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {campaign.description && (
                      <p className='text-gray-600 text-sm mb-3'>
                        {campaign.description}
                      </p>
                    )}

                    <div className='flex items-center gap-6 text-sm text-gray-600'>
                      <div className='flex items-center gap-1'>
                        <Mail className='h-4 w-4' />
                        <span className='font-medium'>{campaign.type}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Users className='h-4 w-4' />
                        <span>{campaign.leadCount} leads</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Target className='h-4 w-4' />
                        <span>{campaign.conversions} conversions</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Calendar className='h-4 w-4' />
                        <span>{formatDate(campaign.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this campaign? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-700'
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
