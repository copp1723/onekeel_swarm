import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Star, 
  MessageSquare, 
  Edit,
  ExternalLink,
  Activity,
  DollarSign,
  Briefcase,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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

interface Communication {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'sms' | 'chat';
  subject?: string;
  content: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  description?: string;
}

interface LeadDetailsProps {
  lead: Lead;
  communications?: Communication[];
  campaign?: Campaign;
  onEdit?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

export function LeadDetails({ 
  lead, 
  communications = [], 
  campaign, 
  onEdit, 
  onClose, 
  loading = false 
}: LeadDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');

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

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown Lead';

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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <p className="text-gray-600">{lead.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getStatusBadge(lead.status)}>
                {lead.status}
              </Badge>
              {onEdit && (
                <Button onClick={onEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onClose && (
                <Button onClick={onClose} variant="ghost">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="metadata">Custom Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{lead.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{lead.source}</span>
                </div>
                {lead.assignedChannel && (
                  <div className="flex items-center space-x-2">
                    {getChannelIcon(lead.assignedChannel)}
                    <span className="text-sm">{lead.assignedChannel}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Scoring</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Qualification Score</span>
                    <span className={`font-bold ${getScoreColor(lead.qualificationScore)}`}>
                      {lead.qualificationScore || 'N/A'}
                    </span>
                  </div>
                  {lead.qualificationScore && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${lead.qualificationScore}%` }}
                      />
                    </div>
                  )}
                </div>
                {lead.creditScore && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Credit Score</span>
                      <span className="font-bold">{lead.creditScore}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            {(lead.income || lead.creditScore) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Financial</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.income && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Annual Income</span>
                      <span className="font-bold">${lead.income.toLocaleString()}</span>
                    </div>
                  )}
                  {lead.creditScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Credit Score</span>
                      <span className="font-bold">{lead.creditScore}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Employment */}
            {(lead.employer || lead.jobTitle) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5" />
                    <span>Employment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.employer && (
                    <div>
                      <span className="text-sm text-gray-600">Employer</span>
                      <p className="font-medium">{lead.employer}</p>
                    </div>
                  )}
                  {lead.jobTitle && (
                    <div>
                      <span className="text-sm text-gray-600">Job Title</span>
                      <p className="font-medium">{lead.jobTitle}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Campaign */}
            {campaign && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Campaign</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                    <Badge variant="outline" className="mt-2">
                      {campaign.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Created</span>
                  <p className="font-medium">
                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <p className="font-medium">
                    {format(new Date(lead.updatedAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length > 0 ? (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(comm.channel)}
                          <Badge variant={comm.direction === 'inbound' ? 'default' : 'secondary'}>
                            {comm.direction}
                          </Badge>
                          <span className="text-sm text-gray-600">{comm.channel}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(comm.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {comm.subject && (
                        <h4 className="font-medium mb-2">{comm.subject}</h4>
                      )}
                      <p className="text-gray-700 text-sm">{comm.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No communications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <p className="font-medium">Lead Created</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(lead.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                {communications.map((comm) => (
                  <div key={comm.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div>
                      <p className="font-medium">
                        {comm.direction === 'inbound' ? 'Received' : 'Sent'} {comm.channel} message
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(comm.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Data Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Custom Fields</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.metadata && Object.keys(lead.metadata).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(lead.metadata).map(([key, value]) => (
                    <div key={key} className="border rounded-lg p-3">
                      <span className="text-sm font-medium text-gray-600">{key}</span>
                      <p className="text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No custom fields defined</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
