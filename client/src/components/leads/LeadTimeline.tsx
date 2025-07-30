import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  Edit, 
  UserPlus, 
  Activity,
  Calendar,
  Star,
  Target,
  ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'communication' | 'status_change' | 'campaign_assigned' | 'score_updated' | 'note_added';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  actor?: {
    name: string;
    type: 'system' | 'user' | 'agent';
  };
}

interface LeadTimelineProps {
  leadId: string;
  events?: TimelineEvent[];
  loading?: boolean;
  showFilters?: boolean;
}

export function LeadTimeline({ 
  leadId, 
  events = [], 
  loading = false, 
  showFilters = true 
}: LeadTimelineProps) {
  const [filterType, setFilterType] = React.useState<string>('all');

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-yellow-500" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'status_change':
        return <ArrowRight className="h-4 w-4 text-purple-500" />;
      case 'campaign_assigned':
        return <Target className="h-4 w-4 text-orange-500" />;
      case 'score_updated':
        return <Star className="h-4 w-4 text-indigo-500" />;
      case 'note_added':
        return <Edit className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'border-blue-200 bg-blue-50';
      case 'updated':
        return 'border-yellow-200 bg-yellow-50';
      case 'communication':
        return 'border-green-200 bg-green-50';
      case 'status_change':
        return 'border-purple-200 bg-purple-50';
      case 'campaign_assigned':
        return 'border-orange-200 bg-orange-50';
      case 'score_updated':
        return 'border-indigo-200 bg-indigo-50';
      case 'note_added':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getActorBadge = (actor?: TimelineEvent['actor']) => {
    if (!actor) return null;
    
    const variants = {
      system: 'bg-gray-100 text-gray-800',
      user: 'bg-blue-100 text-blue-800',
      agent: 'bg-purple-100 text-purple-800'
    };

    return (
      <Badge className={variants[actor.type]} variant="secondary">
        {actor.name}
      </Badge>
    );
  };

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(event => event.type === filterType);

  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Mock events if none provided (for demonstration)
  const mockEvents: TimelineEvent[] = [
    {
      id: '1',
      type: 'created',
      title: 'Lead Created',
      description: 'Lead was created from website form submission',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      actor: { name: 'System', type: 'system' },
      metadata: { source: 'website' }
    },
    {
      id: '2',
      type: 'communication',
      title: 'Email Sent',
      description: 'Welcome email sent to lead',
      timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
      actor: { name: 'Email Agent', type: 'agent' },
      metadata: { channel: 'email', subject: 'Welcome to our service' }
    },
    {
      id: '3',
      type: 'score_updated',
      title: 'Qualification Score Updated',
      description: 'Score increased from 45 to 72',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      actor: { name: 'AI Scoring', type: 'system' },
      metadata: { oldScore: 45, newScore: 72 }
    },
    {
      id: '4',
      type: 'status_change',
      title: 'Status Changed',
      description: 'Status changed from "new" to "contacted"',
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      actor: { name: 'John Smith', type: 'user' },
      metadata: { oldStatus: 'new', newStatus: 'contacted' }
    }
  ];

  const displayEvents = sortedEvents.length > 0 ? sortedEvents : mockEvents;

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Timeline</span>
          </CardTitle>
          {showFilters && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Events</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="communication">Communications</option>
              <option value="status_change">Status Changes</option>
              <option value="campaign_assigned">Campaign Assignments</option>
              <option value="score_updated">Score Updates</option>
              <option value="note_added">Notes</option>
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayEvents.length > 0 ? (
          <div className="space-y-4">
            {displayEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < displayEvents.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                )}
                
                {/* Event card */}
                <div className={`border rounded-lg p-4 ${getEventColor(event.type)}`}>
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border flex items-center justify-center">
                      {getEventIcon(event.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          {getActorBadge(event.actor)}
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      
                      {/* Metadata */}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key} className="text-xs text-gray-500">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="text-xs text-gray-400 mt-2">
                        {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No timeline events found</p>
            <p className="text-sm text-gray-400">Events will appear here as the lead progresses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for fetching timeline events
export function useLeadTimeline(leadId: string) {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/leads/${leadId}/timeline`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch timeline');
        }
        
        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching lead timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchTimeline();
    }
  }, [leadId]);

  const addEvent = React.useCallback((event: Omit<TimelineEvent, 'id'>) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: Date.now().toString()
    };
    setEvents(prev => [newEvent, ...prev]);
  }, []);

  return { events, loading, error, addEvent };
}
