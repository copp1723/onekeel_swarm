import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Mail, MessageSquare, User, Bot, Clock, CheckCircle, AlertCircle, Paperclip, Smile, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  attachments?: string[];
}

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface Conversation {
  id: string;
  leadId?: string;
  channel: 'email' | 'sms' | 'chat';
  agentType?: 'email' | 'sms' | 'chat' | 'voice';
  status: 'active' | 'completed' | 'abandoned';
  messages: Message[];
  metadata?: Record<string, any>;
  startedAt: string;
  endedAt?: string;
  lastMessageAt?: string;
  lead?: Lead;
}

interface ConversationViewProps {
  conversationId: string;
  onClose?: () => void;
}

export function ConversationView({ conversationId, onClose }: ConversationViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConversation();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        setConversation(data.conversation);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch conversation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    const messageContent = message.trim();
    setMessage('');

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: messageContent
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchConversation();
        
        // Simulate agent typing
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          // In a real implementation, the agent response would come from the backend
          simulateAgentResponse();
        }, 2000);
      } else {
        throw new Error(data.error?.message || 'Failed to send message');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
      setMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const simulateAgentResponse = async () => {
    // In a real implementation, this would be handled by the backend
    // The agent would process the message and generate a response
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: 'Thank you for your message. I\'ll help you with that right away.'
        })
      });

      if (response.ok) {
        await fetchConversation();
      }
    } catch (error) {
      console.error('Error simulating agent response:', error);
    }
  };

  const handleStatusChange = async (status: 'completed' | 'abandoned') => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Conversation marked as ${status}`
        });
        await fetchConversation();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive'
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getLeadName = (lead?: Lead) => {
    if (!lead) return 'Unknown';
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
    return name || lead.email || 'Unknown';
  };

  const getLeadInitials = (lead?: Lead) => {
    if (!lead) return 'U';
    const initials = [lead.firstName?.[0], lead.lastName?.[0]].filter(Boolean).join('');
    return initials || lead.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>{getLeadInitials(conversation.lead)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{getLeadName(conversation.lead)}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {getChannelIcon(conversation.channel)}
                <span className="capitalize">{conversation.channel}</span>
                <span>•</span>
                <span>Started {formatDistanceToNow(new Date(conversation.startedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
              {conversation.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('abandoned')}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Mark as Abandoned
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => window.location.href = `/leads/${conversation.leadId}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Lead Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Avatar className="h-8 w-8">
                  {msg.role === 'user' ? (
                    <AvatarFallback>{getLeadInitials(conversation.lead)}</AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className={`rounded-lg px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'
                  }`}>
                    {format(new Date(msg.timestamp), 'HH:mm')}
                    {msg.status && msg.status !== 'sent' && (
                      <span className="ml-2">
                        {msg.status === 'delivered' && <CheckCircle className="inline h-3 w-3" />}
                        {msg.status === 'failed' && <AlertCircle className="inline h-3 w-3" />}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {conversation.status === 'active' && (
        <div className="border-t p-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type your ${conversation.channel === 'email' ? 'email' : 'message'}...`}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={sending}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" disabled={sending}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={sending}>
                <Smile className="h-4 w-4" />
              </Button>
              <Button 
                onClick={sendMessage} 
                disabled={!message.trim() || sending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {conversation.channel === 'email' 
              ? 'This will send an email to the lead' 
              : conversation.channel === 'sms'
              ? 'This will send an SMS to the lead'
              : 'This will send a message to the lead'}
          </p>
        </div>
      )}
    </div>
  );
}