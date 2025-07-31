import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  MessageSquare, 
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Phone,
  ChevronRight,
  FileText,
  Brain,
  Send,
  Eye,
  History,
  Target,
  RefreshCw
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'active' | 'replied' | 'handover' | 'completed' | 'unsubscribed';
  conversationMode: 'template' | 'ai' | 'human';
  templateProgress: {
    current: number;
    total: number;
    lastSent?: string;
    nextScheduled?: string;
  };
  aiEngagement?: {
    messagesExchanged: number;
    lastInteraction: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  metrics: {
    emailsSent: number;
    emailsOpened: number;
    linksClicked: number;
    repliesReceived: number;
  };
  tags?: string[];
  createdAt: string;
  lastActivity: string;
}

interface LeadViewProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onModeSwitch?: (leadId: string, newMode: 'template' | 'ai' | 'human') => void;
}

export function LeadView({ leads, onLeadSelect, onModeSwitch }: LeadViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'template' | 'ai' | 'human'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'engagement' | 'progress'>('recent');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const getModeIcon = (mode: Lead['conversationMode']) => {
    switch (mode) {
      case 'template':
        return <FileText className="h-4 w-4" />;
      case 'ai':
        return <Brain className="h-4 w-4" />;
      case 'human':
        return <User className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: Lead['conversationMode']) => {
    switch (mode) {
      case 'template':
        return 'bg-blue-100 text-blue-800';
      case 'ai':
        return 'bg-purple-100 text-purple-800';
      case 'human':
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusIcon = (status: Lead['status']) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'replied':
        return <MessageSquare className="h-4 w-4" />;
      case 'handover':
        return <Target className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'unsubscribed':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'replied':
        return 'bg-purple-100 text-purple-800';
      case 'handover':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'unsubscribed':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = (leads || []).filter(lead => 
    filterMode === 'all' || lead.conversationMode === filterMode
  );

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      case 'engagement':
        const engagementA = a.metrics.emailsOpened + a.metrics.linksClicked + a.metrics.repliesReceived;
        const engagementB = b.metrics.emailsOpened + b.metrics.linksClicked + b.metrics.repliesReceived;
        return engagementB - engagementA;
      case 'progress':
        const progressA = a.templateProgress.current / a.templateProgress.total;
        const progressB = b.templateProgress.current / b.templateProgress.total;
        return progressB - progressA;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={filterMode === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('all')}
            >
              All ({leads.length})
            </Button>
            <Button
              variant={filterMode === 'template' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('template')}
              className="flex items-center space-x-1"
            >
              <FileText className="h-3 w-3" />
              <span>Template ({(leads || []).filter(l => l.conversationMode === 'template').length})</span>
            </Button>
            <Button
              variant={filterMode === 'ai' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('ai')}
              className="flex items-center space-x-1"
            >
              <Brain className="h-3 w-3" />
              <span>AI ({(leads || []).filter(l => l.conversationMode === 'ai').length})</span>
            </Button>
            <Button
              variant={filterMode === 'human' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('human')}
              className="flex items-center space-x-1"
            >
              <User className="h-3 w-3" />
              <span>Human ({(leads || []).filter(l => l.conversationMode === 'human').length})</span>
            </Button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border rounded-lg"
          >
            <option value="recent">Most Recent</option>
            <option value="engagement">Most Engaged</option>
            <option value="progress">Progress</option>
          </select>
        </div>

        {selectedLeads.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{selectedLeads.length} selected</span>
            <Button size="sm" variant="outline">Bulk Actions</Button>
          </div>
        )}
      </div>

      {/* Mode Distribution Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Template Mode</p>
                <p className="text-2xl font-bold">{(leads || []).filter(l => l.conversationMode === 'template').length}</p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Mode</p>
                <p className="text-2xl font-bold">{(leads || []).filter(l => l.conversationMode === 'ai').length}</p>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Human Handover</p>
                <p className="text-2xl font-bold">{(leads || []).filter(l => l.conversationMode === 'human').length}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Conversations</p>
                <p className="text-2xl font-bold">{(leads || []).filter(l => l.status === 'replied').length}</p>
              </div>
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead List */}
      <div className="space-y-4">
        {sortedLeads.map((lead) => (
          <Card 
            key={lead.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onLeadSelect(lead)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {lead.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    {/* Lead Info */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <Badge className={getStatusColor(lead.status)}>
                          {getStatusIcon(lead.status)}
                          <span className="ml-1">{lead.status}</span>
                        </Badge>
                        <Badge className={getModeColor(lead.conversationMode)}>
                          {getModeIcon(lead.conversationMode)}
                          <span className="ml-1">{lead.conversationMode} mode</span>
                        </Badge>
                        {lead.conversationMode === 'template' && lead.status === 'replied' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <Zap className="h-3 w-3 mr-1" />
                            Ready for AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{lead.email}</span>
                        </span>
                        {lead.phone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </span>
                        )}
                        {lead.company && (
                          <span>{lead.company}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar for Template Mode */}
                    {lead.conversationMode === 'template' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Email {lead.templateProgress.current} of {lead.templateProgress.total}
                          </span>
                          <span className="text-gray-500">
                            {Math.round((lead.templateProgress.current / lead.templateProgress.total) * 100)}% complete
                          </span>
                        </div>
                        <Progress 
                          value={(lead.templateProgress.current / lead.templateProgress.total) * 100} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          {lead.templateProgress.lastSent && (
                            <span>Last sent: {new Date(lead.templateProgress.lastSent).toLocaleDateString()}</span>
                          )}
                          {lead.templateProgress.nextScheduled && (
                            <span>Next: {new Date(lead.templateProgress.nextScheduled).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Engagement Info */}
                    {lead.conversationMode === 'ai' && lead.aiEngagement && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-purple-900">AI Conversation Active</p>
                            <p className="text-xs text-purple-700">
                              {lead.aiEngagement.messagesExchanged} messages exchanged
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={
                              lead.aiEngagement.sentiment === 'positive' ? 'text-green-700' :
                              lead.aiEngagement.sentiment === 'negative' ? 'text-red-700' :
                              'text-gray-700'
                            }>
                              {lead.aiEngagement.sentiment === 'positive' ? '😊' :
                               lead.aiEngagement.sentiment === 'negative' ? '😟' : '😐'}
                              {lead.aiEngagement.sentiment}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-4 pt-2">
                      <div className="text-center">
                        <p className="text-2xl font-semibold">{lead.metrics.emailsSent}</p>
                        <p className="text-xs text-gray-500">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-blue-600">
                          {lead.metrics.emailsOpened}
                        </p>
                        <p className="text-xs text-gray-500">Opened</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-purple-600">
                          {lead.metrics.linksClicked}
                        </p>
                        <p className="text-xs text-gray-500">Clicked</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-600">
                          {lead.metrics.repliesReceived}
                        </p>
                        <p className="text-xs text-gray-500">Replies</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(lead.tags || []).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeadSelect(lead);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {lead.conversationMode === 'template' && lead.status === 'replied' && onModeSwitch && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        onModeSwitch(lead.id, 'ai');
                      }}
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Switch to AI
                    </Button>
                  )}
                  
                  {lead.conversationMode === 'ai' && onModeSwitch && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onModeSwitch(lead.id, 'human');
                      }}
                      className="w-full"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Handover
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedLeads.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leads found
            </h3>
            <p className="text-gray-500">
              {filterMode !== 'all' 
                ? `No leads in ${filterMode} mode`
                : 'Import leads to start your campaigns'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}