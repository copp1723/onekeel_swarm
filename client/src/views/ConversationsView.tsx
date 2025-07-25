import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail, Phone, Search, User, Clock, Bot } from 'lucide-react';
import { ConversationThread } from '@/components/conversations/ConversationThread';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  leadId: string;
  leadName?: string;
  leadEmail?: string;
  channel: 'email' | 'sms' | 'chat';
  status: string;
  lastMessageAt?: string;
  lastMessage?: string;
  unreadCount?: number;
  hasAIResponse?: boolean;
}

export const ConversationsView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadConversations();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      // Fetch conversations
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }
      
      const data = await response.json();
      const convs = data.conversations || [];
      
      // Fetch latest message for each conversation
      const enrichedConversations = await Promise.all(
        convs.map(async (conv: any) => {
          try {
            const commResponse = await fetch(`/api/communications?conversationId=${conv.id}&limit=1&orderBy=createdAt&order=desc`);
            if (commResponse.ok) {
              const commData = await commResponse.json();
              const lastComm = commData.communications?.[0];
              
              return {
                ...conv,
                lastMessage: lastComm?.content?.substring(0, 100) + '...',
                lastMessageAt: lastComm?.createdAt,
                hasAIResponse: lastComm?.metadata?.generatedBy === 'ai'
              };
            }
          } catch (error) {
            console.error('Error fetching communications:', error);
          }
          return conv;
        })
      );
      
      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchTerm === '' || 
      conv.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.leadEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'active' && conv.status === 'active') ||
      (activeTab === 'handover' && conv.status === 'handover_pending');
    
    return matchesSearch && matchesTab;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-96 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <h2 className="text-xl font-semibold mb-4">Conversations</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="handover">Handover</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {conv.leadName || 'Unknown Lead'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {conv.leadEmail}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(conv.channel)}
                      {conv.hasAIResponse && (
                        <Bot className="h-4 w-4 text-purple-500" />
                      )}
                    </div>
                  </div>
                  
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                      {conv.lastMessage}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                      {conv.status}
                    </Badge>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Conversation Detail */}
      <div className="flex-1 bg-white">
        {selectedConversation ? (
          <ConversationThread
            conversationId={selectedConversation.id}
            leadName={selectedConversation.leadName}
            leadEmail={selectedConversation.leadEmail}
            channel={selectedConversation.channel}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Avatar component if not already imported
const Avatar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarFallback: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);