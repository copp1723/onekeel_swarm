import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Plus, 
  Play, 
  Pause, 
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import { CampaignEditor } from './CampaignEditor';

interface CampaignManagerProps {
  agents: any[];
  campaigns: any[];
  onUpdate: () => void;
}

export function CampaignManager({ agents, campaigns, onUpdate }: CampaignManagerProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleCampaignSave = async (campaign: any) => {
    try {
      const url = campaign.id 
        ? `/api/email/campaigns/${campaign.id}`
        : '/api/email/campaigns';
      
      const method = campaign.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });

      if (response.ok) {
        setShowEditor(false);
        setSelectedCampaign(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleCampaignDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/email/campaigns/${campaignId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const handleCampaignToggle = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(`/api/email/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error toggling campaign:', error);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agents.find(a => a.id === campaign.agentId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showEditor) {
    return (
      <CampaignEditor
        campaign={selectedCampaign}
        agents={agents}
        onSave={handleCampaignSave}
        onCancel={() => {
          setShowEditor(false);
          setSelectedCampaign(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowEditor(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </Button>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCampaigns.map((campaign) => {
          const agent = agents.find(a => a.id === campaign.agentId);
          const stats = campaign.stats || { sent: 0, opened: 0, clicked: 0, replied: 0 };
          const openRate = stats.sent > 0 ? Math.round(stats.opened / stats.sent * 100) : 0;
          const clickRate = stats.sent > 0 ? Math.round(stats.clicked / stats.sent * 100) : 0;

          return (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>
                        Agent: {agent?.name || 'Unknown'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Campaign Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.sent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{openRate}%</p>
                    <p className="text-xs text-gray-500">Open Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{clickRate}%</p>
                    <p className="text-xs text-gray-500">Click Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.replied}</p>
                    <p className="text-xs text-gray-500">Replies</p>
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Templates:</span>
                    <span className="font-medium">{campaign.templates?.length || 0} active</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Schedule:</span>
                    <span className="font-medium">
                      {campaign.schedule?.name || 'No schedule'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {campaign.status === 'draft' ? (
                      <Button
                        size="sm"
                        onClick={() => handleCampaignToggle(campaign.id, campaign.status)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Launch
                      </Button>
                    ) : campaign.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCampaignToggle(campaign.id, campaign.status)}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    ) : campaign.status === 'paused' ? (
                      <Button
                        size="sm"
                        onClick={() => handleCampaignToggle(campaign.id, campaign.status)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowEditor(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCampaignDelete(campaign.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filterStatus !== 'all' 
                ? 'No campaigns found' 
                : 'No campaigns yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first email campaign to get started.'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => setShowEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}