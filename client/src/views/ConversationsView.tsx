import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Search, Mail, Phone, CheckCircle, Users, Calendar, Filter, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { ConversationThread } from '@/components/conversations/ConversationThread';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Sample data for mockup
const SAMPLE_CONVERSATIONS = [
  {
    id: '1',
    leadName: 'Jennifer Wilson',
    leadEmail: 'jennifer.wilson@example.com',
    leadInitials: 'JW',
    channel: 'email',
    status: 'active',
    lastMessage: "I'd like to learn more about your enterprise pricing options. Can you send me a detailed breakdown?",
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    unread: true,
    agentName: 'Alex',
    agentType: 'sales',
    messages: 6,
    campaign: 'Enterprise Outreach',
    avatarColor: 'bg-blue-100'
  },
  {
    id: '2',
    leadName: 'Michael Sanchez',
    leadEmail: 'mike.s@techcorp.com',
    leadInitials: 'MS',
    channel: 'chat',
    status: 'active',
    lastMessage: "Thanks for the demo! I'm impressed with the analytics dashboard. When can we schedule a follow-up call?",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unread: false,
    agentName: 'Emma',
    agentType: 'support',
    messages: 12,
    campaign: 'Product Demo',
    avatarColor: 'bg-green-100'
  },
  {
    id: '3',
    leadName: 'Sarah Johnson',
    leadEmail: 's.johnson@innovate.co',
    leadInitials: 'SJ',
    channel: 'sms',
    status: 'active',
    lastMessage: "I got the latest update. The new UI is much better! Just one question about the export feature.",
    lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    unread: false,
    agentName: 'Ryan',
    agentType: 'customer success',
    messages: 8,
    campaign: 'Q3 Product Update',
    avatarColor: 'bg-purple-100'
  },
  {
    id: '4',
    leadName: 'David Chen',
    leadEmail: 'david.chen@globalfirm.com',
    leadInitials: 'DC',
    channel: 'email',
    status: 'completed',
    lastMessage: "Contract signed and returned. Looking forward to getting started next week!",
    lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    unread: false,
    agentName: 'Taylor',
    agentType: 'sales',
    messages: 21,
    campaign: 'Enterprise Deals Q3',
    avatarColor: 'bg-yellow-100'
  },
  {
    id: '5',
    leadName: 'Laura Patel',
    leadEmail: 'lpatel@mediagroup.org',
    leadInitials: 'LP',
    channel: 'email',
    status: 'active',
    lastMessage: "We need to expand our current plan. Can you help me understand the upgrade options?",
    lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    unread: true,
    agentName: 'Chris',
    agentType: 'account manager',
    messages: 4,
    campaign: 'Account Expansion',
    avatarColor: 'bg-pink-100'
  },
  {
    id: '6',
    leadName: 'Robert Thompson',
    leadEmail: 'robert@rthompson.dev',
    leadInitials: 'RT',
    channel: 'chat',
    status: 'active',
    lastMessage: "The API integration worked perfectly. I'm ready to move forward with the implementation.",
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    unread: false,
    agentName: 'Mia',
    agentType: 'technical support',
    messages: 15,
    campaign: 'Developer Relations',
    avatarColor: 'bg-teal-100'
  }
];

export const ConversationsView: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  // Filter conversations based on current filters
  const filteredConversations = SAMPLE_CONVERSATIONS.filter(conversation => {
    // Filter by search query
    if (searchQuery && !conversation.leadName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !conversation.leadEmail.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by tab
    if (selectedTab === 'unread' && !conversation.unread) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && conversation.status !== statusFilter) {
      return false;
    }
    
    // Filter by channel
    if (channelFilter !== 'all' && conversation.channel !== channelFilter) {
      return false;
    }
    
    return true;
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
    <div className="flex h-[calc(100vh-64px)]"> {/* Subtract header height */}
      <div className={`w-full md:w-[450px] border-r transition-all duration-200 ${selectedConversation ? 'hidden md:block' : 'block'}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Conversations</h1>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Sort
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                <Badge variant="secondary" className="ml-1 bg-primary/10">
                  {SAMPLE_CONVERSATIONS.filter(c => c.unread).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-240px)]"> {/* Adjust based on your header height */}
          {filteredConversations.length > 0 ? (
            <div className="divide-y">
              {filteredConversations.map(conversation => (
                <div 
                  key={conversation.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedConversation === conversation.id ? 'bg-gray-50' : ''
                  } ${conversation.unread ? 'border-l-4 border-primary' : ''}`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarFallback className={conversation.avatarColor}>
                        {conversation.leadInitials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {conversation.leadName}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: true })}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Mark as Read</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Archive Conversation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 mb-1 space-x-2">
                        <span className="flex items-center">
                          {getChannelIcon(conversation.channel)}
                          <span className="ml-1 capitalize">{conversation.channel}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{conversation.agentName}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{conversation.campaign}</span>
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {conversation.lastMessage}
                      </p>
                      
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge variant="outline" className={`
                          text-xs px-2 py-0.5 
                          ${conversation.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 
                            conversation.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-gray-50 text-gray-700 border-gray-200'}
                        `}>
                          {conversation.status === 'completed' && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
                        </Badge>
                        
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {conversation.messages} messages
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations found</h3>
              <p className="text-gray-500 max-w-md">
                {searchQuery 
                  ? `No conversations match your search for "${searchQuery}"`
                  : 'No conversations match your current filters'}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setChannelFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Conversation detail view */}
      <div className={`flex-1 ${selectedConversation ? 'block' : 'hidden md:block'}`}>
        {selectedConversation ? (
          <div className="h-full">
            <ConversationThread 
              conversationId={selectedConversation}
              leadName={SAMPLE_CONVERSATIONS.find(c => c.id === selectedConversation)?.leadName}
              leadEmail={SAMPLE_CONVERSATIONS.find(c => c.id === selectedConversation)?.leadEmail}
              channel={SAMPLE_CONVERSATIONS.find(c => c.id === selectedConversation)?.channel}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="max-w-md">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Conversation</h2>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the list to view the full thread and details.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-blue-500" />
                      Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      {SAMPLE_CONVERSATIONS.filter(c => c.channel === 'email').length} conversations
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                      Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      {SAMPLE_CONVERSATIONS.filter(c => c.channel === 'chat').length} conversations
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};