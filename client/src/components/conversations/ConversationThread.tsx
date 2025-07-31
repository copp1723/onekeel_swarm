import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, User, Bot, MoreVertical, ArrowLeft, Calendar, Clock, Info, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Sample conversations data for demo
const SAMPLE_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: '101',
      direction: 'outbound',
      content: "Hi Jennifer,\n\nI noticed you recently viewed our Enterprise Solutions page. I'd be happy to provide more information about how our platform can help scale your operations. Would you like to schedule a quick call to discuss your specific needs?\n\nBest regards,\nAlex",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'OneKeel Enterprise Solutions',
        generatedBy: 'ai',
        agentId: 'agent-123'
      }
    },
    {
      id: '102',
      direction: 'inbound',
      content: "Hello Alex,\n\nThanks for reaching out. Yes, I'm interested in learning more about your enterprise solutions. Before we schedule a call, could you send me some information about your pricing structure? We're particularly interested in the user management features and API access.\n\nRegards,\nJennifer",
      createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Re: OneKeel Enterprise Solutions'
      }
    },
    {
      id: '103',
      direction: 'outbound',
      content: "Hi Jennifer,\n\nThanks for your interest! I'd be happy to share our enterprise pricing details.\n\nOur Enterprise tier starts at $2,499/month and includes:\n• Unlimited users and workspaces\n• Advanced user management with SSO integration\n• Full API access with higher rate limits\n• Dedicated account manager\n• 24/7 priority support\n\nI've attached our full Enterprise brochure for more details. Would you like to schedule a demo to see these features in action?\n\nBest regards,\nAlex",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Re: OneKeel Enterprise Solutions',
        generatedBy: 'ai',
        agentId: 'agent-123'
      }
    },
    {
      id: '104',
      direction: 'inbound',
      content: "Alex,\n\nThank you for the information. The pricing is in line with what we expected. I'd like to learn more about your user management features and how the API access works with our existing systems.\n\nCan we schedule a demo for next week? Tuesday or Thursday afternoon would work best for our team.\n\nJennifer",
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Re: OneKeel Enterprise Solutions'
      }
    },
    {
      id: '105',
      direction: 'outbound',
      content: "Hi Jennifer,\n\nExcellent! I'd be happy to set up a demo for next week. Thursday at 2:00 PM Eastern works on our end. Would that time work for you and your team?\n\nIn preparation for our call, could you share a bit more about your current setup and integration requirements? This will help us tailor the demo to your specific needs.\n\nLooking forward to showing you our platform!\n\nBest regards,\nAlex",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Re: OneKeel Enterprise Solutions',
        generatedBy: 'ai',
        agentId: 'agent-123'
      }
    },
    {
      id: '106',
      direction: 'inbound',
      content: "I'd like to learn more about your enterprise pricing options. Can you send me a detailed breakdown?",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Re: OneKeel Enterprise Solutions'
      }
    }
  ],
  '2': [
    {
      id: '201',
      direction: 'inbound',
      content: "Hi there, I'm looking to get a demo of your analytics platform. I've heard good things about it from colleagues.",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '202',
      direction: 'outbound',
      content: "Hello Michael! I'm Emma from the support team. I'd be happy to give you a demo of our analytics platform. When would be a good time for you?",
      createdAt: new Date(Date.now() - 4.8 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-456'
      }
    },
    {
      id: '203',
      direction: 'inbound',
      content: "Would today at 3pm PST work?",
      createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '204',
      direction: 'outbound',
      content: "That works perfectly! I'll send you a calendar invite with the meeting link shortly. In the meantime, is there any specific feature you're most interested in seeing?",
      createdAt: new Date(Date.now() - 4.3 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-456'
      }
    },
    {
      id: '205',
      direction: 'inbound',
      content: "Great! I'm particularly interested in the custom dashboards and report scheduling features. Also curious about your data integration capabilities.",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '206',
      direction: 'outbound',
      content: "Perfect! I'll make sure to highlight those features during our demo. You'll be pleased to know that we have extensive data integration options and our custom dashboards are highly flexible.\n\nI've just sent the calendar invite to your email. Looking forward to speaking with you at 3pm PST today!",
      createdAt: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-456'
      }
    },
    {
      id: '207',
      direction: 'inbound',
      content: "Thanks for the demo! I'm impressed with the analytics dashboard. When can we schedule a follow-up call?",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ],
  '3': [
    {
      id: '301',
      direction: 'outbound',
      content: "Hi Sarah, this is Ryan from OneKeel! We've just released our latest update with the refreshed UI you requested. Would love to hear your thoughts once you've had a chance to try it out!",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-789'
      }
    },
    {
      id: '302',
      direction: 'inbound',
      content: "Hi Ryan! Thanks for letting me know. I'll check it out today and get back to you.",
      createdAt: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '303',
      direction: 'inbound',
      content: "Just logged in to check the new UI. Looks much cleaner! The navigation is definitely more intuitive.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '304',
      direction: 'outbound',
      content: "That's great to hear, Sarah! I'm glad you like the improved navigation. We put a lot of effort into making it more intuitive based on customer feedback like yours. Is there anything specific that stands out to you as particularly improved?",
      createdAt: new Date(Date.now() - 1.9 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-789'
      }
    },
    {
      id: '305',
      direction: 'inbound',
      content: "The dashboard layout is much better - I can see all my key metrics without scrolling now. And the dark mode option is a nice touch!",
      createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '306',
      direction: 'outbound',
      content: "I'm really happy to hear that! The dashboard layout was redesigned specifically to improve visibility of key metrics without scrolling. And the dark mode has been one of our most requested features!\n\nIs there anything else you'd like to see in future updates?",
      createdAt: new Date(Date.now() - 1.4 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generatedBy: 'ai',
        agentId: 'agent-789'
      }
    },
    {
      id: '307',
      direction: 'inbound',
      content: "I got the latest update. The new UI is much better! Just one question about the export feature.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  // Add similar data for conversations 4, 5, 6...
  '4': [
    {
      id: '401',
      direction: 'inbound',
      content: "Hello, I'd like to get more information about your enterprise solution. Our company is looking to upgrade our current system.",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Enterprise Solution Inquiry'
      }
    },
    // Add more messages for conversation 4
  ],
  '5': [
    {
      id: '501',
      direction: 'inbound',
      content: "We need to expand our current plan. Can you help me understand the upgrade options?",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      metadata: {
        subject: 'Plan Upgrade Options'
      }
    },
    // Add more messages for conversation 5
  ],
  '6': [
    {
      id: '601',
      direction: 'inbound',
      content: "Hi, I'm working on integrating your API with our application. I have a few technical questions.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Add more messages for conversation 6
  ]
};

export function ConversationThread({ 
  conversationId, 
  leadName, 
  leadEmail,
  channel = 'email' 
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(window.innerWidth < 768);

  useEffect(() => {
    // For demo purposes, load sample data instead of making an API call
    setTimeout(() => {
      setMessages(SAMPLE_MESSAGES[conversationId] || []);
      setLoading(false);
    }, 500);
    
    const handleResize = () => {
      setShowBackButton(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [conversationId]);

  const renderMessage = (message: Message) => {
    const isInbound = message.direction === 'inbound';
    const isAI = message.metadata?.generatedBy === 'ai';
    
    return (
      <div
        key={message.id}
        className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-6`}
      >
        <div className={`flex ${isInbound ? 'flex-row' : 'flex-row-reverse'} max-w-[85%]`}>
          <Avatar className={`h-8 w-8 flex-shrink-0 ${isInbound ? 'mt-1' : 'mt-1'}`}>
            <AvatarFallback className={isInbound ? 'bg-blue-100 text-blue-700' : isAI ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
              {isInbound ? leadName?.[0] || 'U' : isAI ? 'AI' : 'A'}
            </AvatarFallback>
          </Avatar>
          
          <div className={`mx-2 ${isInbound ? 'text-left' : 'text-right'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-700">
                {isInbound ? leadName || leadEmail : isAI ? 'AI Agent' : 'You'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
              {isAI && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                        <Bot className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generated by AI Assistant</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {message.metadata?.subject && (
              <div className="text-sm font-medium text-gray-700 mb-1">
                {message.metadata.subject}
              </div>
            )}
            
            <div className={`${isInbound ? 'bg-white border border-gray-200' : isAI ? 'bg-purple-50 border border-purple-100' : 'bg-blue-50 border border-blue-100'} rounded-lg shadow-sm`}>
              <div className="p-3">
                <div 
                  className="text-sm text-gray-800 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: message.content.replace(/\n/g, '<br>') 
                  }}
                />
              </div>
              {/* Show attachment UI if we want to simulate attachments */}
              {message.id === '103' && (
                <div className="border-t p-3 bg-gray-50 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center mr-2">
                        <span className="text-blue-700 text-xs">PDF</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Enterprise_Brochure.pdf</p>
                        <p className="text-xs text-gray-500">2.4 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-none">
      <CardHeader className="border-b bg-gray-50/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button variant="ghost" size="sm" className="mr-1" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {leadName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center">
                {leadName || 'Unknown Lead'}
                <Badge variant="outline" className="ml-2 text-xs">
                  {channel}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-500">{leadEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Schedule Meeting</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Lead Details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                <DropdownMenuItem>Transfer Conversation</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                <DropdownMenuItem>Add Note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Archive Conversation</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(renderMessage)}
          </div>
        )}
      </div>
    </Card>
  );
}