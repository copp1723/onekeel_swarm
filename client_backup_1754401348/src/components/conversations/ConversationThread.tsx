import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// ScrollArea component removed - using standard div with overflow
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, User, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  createdAt: string;
  metadata?: {
    subject?: string;
    generatedBy?: string;
    agentId?: string;
  };
}

interface ConversationThreadProps {
  conversationId: string;
  leadName?: string;
  leadEmail?: string;
  channel?: string;
}

export function ConversationThread({ 
  conversationId, 
  leadName, 
  leadEmail,
  channel = 'email' 
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversation();
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadConversation, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      
      await response.json();
      
      // Get messages from the communications endpoint
      const commResponse = await fetch(`/api/communications?conversationId=${conversationId}`);
      if (commResponse.ok) {
        const commData = await commResponse.json();
        setMessages(commData.communications || []);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isInbound = message.direction === 'inbound';
    const isAI = message.metadata?.generatedBy === 'ai';
    
    return (
      <div
        key={message.id}
        className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-4`}
      >
        <div className={`flex ${isInbound ? 'flex-row' : 'flex-row-reverse'} max-w-[80%]`}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className={isInbound ? 'bg-blue-100' : isAI ? 'bg-purple-100' : 'bg-green-100'}>
              {isInbound ? <User className="h-4 w-4" /> : isAI ? <Bot className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          
          <div className={`mx-2 ${isInbound ? 'text-left' : 'text-right'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-600">
                {isInbound ? leadName || leadEmail : isAI ? 'AI Agent' : 'You'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
              {isAI && (
                <Badge variant="secondary" className="text-xs">
                  AI Generated
                </Badge>
              )}
            </div>
            
            {message.metadata?.subject && (
              <div className="text-sm font-medium text-gray-700 mb-1">
                {message.metadata.subject}
              </div>
            )}
            
            <Card className={`${isInbound ? 'bg-gray-50' : isAI ? 'bg-purple-50' : 'bg-blue-50'} border-none`}>
              <CardContent className="p-3">
                <div 
                  className="text-sm text-gray-800 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: message.content.replace(/\n/g, '<br>') 
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading conversation...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{leadName || 'Unknown Lead'}</CardTitle>
              <p className="text-sm text-gray-500">{leadEmail}</p>
            </div>
          </div>
          <Badge variant="outline">
            <Mail className="h-3 w-3 mr-1" />
            {channel}
          </Badge>
        </div>
      </CardHeader>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(renderMessage)}
          </div>
        )}
      </div>
    </Card>
  );
}