import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Target,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Users,
  Mail,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalLeads: number;
    activeLeads: number;
    completedLeads: number;
    conversionRate?: string;
  };
  settings?: any;
}

interface CampaignListProps {
  campaigns: Campaign[];
  loading?: boolean;
  onRefresh: () => void;
  onEdit?: (campaign: Campaign) => void;
  onDuplicate?: (campaign: Campaign) => void;
  onDelete?: (campaignId: string) => void;
  onToggleStatus?: (campaignId: string, active: boolean) => void;
  onLaunch?: (campaignId: string) => void;
  executionStatuses?: Record<string, any>;
}

export function CampaignList({
  campaigns,
  loading = false,
  onRefresh,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onLaunch,
  executionStatuses = {},
}: CampaignListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'drip' | 'blast' | 'trigger'
  >('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>(
    'created'
  );

  // Filter and sort campaigns
  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campaign.description || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && campaign.active) ||
        (statusFilter === 'inactive' && !campaign.active);
      const matchesType = typeFilter === 'all' || campaign.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case 'created':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

  const getStatusBadge = (campaign: Campaign) => {
    const executionStatus = executionStatuses[campaign.id];

    if (executionStatus) {
      switch (executionStatus.status) {
        case 'running':
          return <Badge className='bg-blue-100 text-blue-800'>Running</Badge>;
        case 'completed':
          return (
            <Badge className='bg-green-100 text-green-800'>Completed</Badge>
          );
        case 'failed':
          return <Badge className='bg-red-100 text-red-800'>Failed</Badge>;
        case 'paused':
          return (
            <Badge className='bg-yellow-100 text-yellow-800'>Paused</Badge>
          );
      }
    }

    if (campaign.active) {
      return <Badge className='bg-green-100 text-green-800'>Active</Badge>;
    }
    return <Badge variant='secondary'>Inactive</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      drip: 'bg-blue-100 text-blue-800',
      blast: 'bg-orange-100 text-orange-800',
      trigger: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge
        className={
          colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='text-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4' />
          <p className='text-gray-600'>Loading campaigns...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Target className='h-5 w-5' />
            <span>Your Campaigns ({campaigns.length})</span>
          </CardTitle>
          <CardDescription>
            Manage and monitor your marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <Input
                  placeholder='Search campaigns...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value: any) => setTypeFilter(value)}
            >
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Types</SelectItem>
                <SelectItem value='drip'>Drip</SelectItem>
                <SelectItem value='blast'>Blast</SelectItem>
                <SelectItem value='trigger'>Trigger</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Sort by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='created'>Created Date</SelectItem>
                <SelectItem value='updated'>Updated Date</SelectItem>
                <SelectItem value='name'>Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Grid */}
          {filteredCampaigns.length > 0 ? (
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
              {filteredCampaigns.map(campaign => (
                <Card
                  key={campaign.id}
                  className='hover:shadow-lg transition-shadow'
                >
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 min-w-0'>
                        <CardTitle className='text-lg truncate'>
                          {campaign.name}
                        </CardTitle>
                        <CardDescription className='line-clamp-2'>
                          {campaign.description || 'No description'}
                        </CardDescription>
                      </div>
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
                        <DropdownMenuContent align='end'>
                          {onLaunch && (
                            <DropdownMenuItem
                              onClick={() => onLaunch(campaign.id)}
                            >
                              <Play className='h-4 w-4 mr-2' />
                              Launch Campaign
                            </DropdownMenuItem>
                          )}
                          {onToggleStatus && (
                            <DropdownMenuItem
                              onClick={() =>
                                onToggleStatus(campaign.id, !campaign.active)
                              }
                            >
                              {campaign.active ? (
                                <>
                                  <Pause className='h-4 w-4 mr-2' />
                                  Pause Campaign
                                </>
                              ) : (
                                <>
                                  <Play className='h-4 w-4 mr-2' />
                                  Activate Campaign
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(campaign)}>
                              <Edit className='h-4 w-4 mr-2' />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDuplicate && (
                            <DropdownMenuItem
                              onClick={() => onDuplicate(campaign)}
                            >
                              <Copy className='h-4 w-4 mr-2' />
                              Duplicate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(campaign.id)}
                              className='text-red-600'
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className='flex items-center space-x-2 mt-2'>
                      {getStatusBadge(campaign)}
                      {getTypeBadge(campaign.type)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      <div className='flex items-center text-sm text-gray-600'>
                        <Calendar className='h-4 w-4 mr-2' />
                        Created{' '}
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>

                      {/* Execution Status */}
                      {executionStatuses[campaign.id] && (
                        <div className='text-sm text-gray-600'>
                          <strong>Progress:</strong>{' '}
                          {executionStatuses[campaign.id].sentCount || 0} sent,{' '}
                          {executionStatuses[campaign.id].failedCount || 0}{' '}
                          failed
                          {executionStatuses[campaign.id].totalLeads && (
                            <span>
                              {' '}
                              of {
                                executionStatuses[campaign.id].totalLeads
                              }{' '}
                              total
                            </span>
                          )}
                        </div>
                      )}

                      {campaign.stats && (
                        <div className='grid grid-cols-3 gap-4 pt-3 border-t'>
                          <div className='text-center'>
                            <div className='text-lg font-semibold text-gray-900'>
                              {campaign.stats.totalLeads || 0}
                            </div>
                            <div className='text-xs text-gray-500 flex items-center justify-center'>
                              <Users className='h-3 w-3 mr-1' />
                              Total
                            </div>
                          </div>
                          <div className='text-center'>
                            <div className='text-lg font-semibold text-blue-600'>
                              {campaign.stats.activeLeads || 0}
                            </div>
                            <div className='text-xs text-gray-500 flex items-center justify-center'>
                              <Mail className='h-3 w-3 mr-1' />
                              Active
                            </div>
                          </div>
                          <div className='text-center'>
                            <div className='text-lg font-semibold text-green-600'>
                              {campaign.stats.completedLeads || 0}
                            </div>
                            <div className='text-xs text-gray-500 flex items-center justify-center'>
                              <TrendingUp className='h-3 w-3 mr-1' />
                              Done
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className='text-center py-8'>
              <Target className='h-12 w-12 text-gray-300 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No campaigns found'
                  : 'No campaigns yet'}
              </h3>
              <p className='text-gray-500'>
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first campaign to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
