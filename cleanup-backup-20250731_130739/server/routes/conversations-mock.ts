import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const conversationQuerySchema = z.object({
  leadId: z.string().optional(),
  channel: z.enum(['email', 'sms', 'chat']).optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
  agentType: z.enum(['overlord', 'email', 'sms', 'chat']).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(1000)).optional()
});

const createConversationSchema = z.object({
  leadId: z.string().min(1),
  channel: z.enum(['email', 'sms', 'chat']),
  agentType: z.enum(['overlord', 'email', 'sms', 'chat'])
});

const addMessageSchema = z.object({
  role: z.enum(['agent', 'lead']),
  content: z.string().min(1),
  timestamp: z.string().optional()
});

// Mock conversations data
const mockConversations = [
  {
    id: 'conv-1',
    leadId: 'lead-1',
    channel: 'email',
    agentType: 'email',
    status: 'active',
    messages: [
      {
        role: 'agent',
        content: 'Hello! Thank you for your interest in our services.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        role: 'lead',
        content: 'Hi, I\'m interested in getting a loan.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endedAt: null,
    qualificationScore: 75,
    goalProgress: ['interested'],
    crossChannelContext: {}
  },
  {
    id: 'conv-2',
    leadId: 'lead-2',
    channel: 'sms',
    agentType: 'sms',
    status: 'active',
    messages: [
      {
        role: 'agent',
        content: 'Hi! Following up on your loan inquiry.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ],
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endedAt: null,
    qualificationScore: 60,
    goalProgress: ['contacted'],
    crossChannelContext: {}
  }
];

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const validationResult = conversationQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      });
    }

    const { leadId, channel, status, agentType, limit } = validationResult.data;
    
    let filteredConversations = [...mockConversations];
    
    // Apply filters
    if (leadId) {
      filteredConversations = filteredConversations.filter(conv => conv.leadId === leadId);
    }
    
    if (channel) {
      filteredConversations = filteredConversations.filter(conv => conv.channel === channel);
    }
    
    if (status) {
      filteredConversations = filteredConversations.filter(conv => conv.status === status);
    }
    
    if (agentType) {
      filteredConversations = filteredConversations.filter(conv => conv.agentType === agentType);
    }
    
    // Apply limit
    if (limit) {
      filteredConversations = filteredConversations.slice(0, limit);
    }
    
    // Get active conversation counts by channel
    const activeConversationsByChannel = {
      email: mockConversations.filter(c => c.channel === 'email' && c.status === 'active').length,
      sms: mockConversations.filter(c => c.channel === 'sms' && c.status === 'active').length,
      chat: mockConversations.filter(c => c.channel === 'chat' && c.status === 'active').length
    };
    
    res.json({
      success: true,
      conversations: filteredConversations,
      activeConversationsByChannel,
      total: filteredConversations.length,
      limit: limit || 50
    });
  } catch (error) {
    console.error('Error in conversations endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATIONS_ERROR',
        message: 'Failed to fetch conversations',
        category: 'database'
      }
    });
  }
});

// Get single conversation
router.get('/:id', async (req, res) => {
  try {
    const conversation = mockConversations.find(c => c.id === req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }
    
    res.json({ 
      success: true,
      conversation 
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'CONVERSATION_FETCH_ERROR',
        message: 'Failed to fetch conversation',
        category: 'database'
      }
    });
  }
});

// Create new conversation
router.post('/', async (req, res) => {
  try {
    const validationResult = createConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid conversation data',
          details: validationResult.error.errors
        }
      });
    }
    
    const { leadId, channel, agentType } = validationResult.data;
    
    const newConversation = {
      id: `conv-${Date.now()}`,
      leadId,
      channel,
      agentType,
      status: 'active',
      messages: [],
      startedAt: new Date().toISOString(),
      endedAt: null,
      qualificationScore: 50,
      goalProgress: [],
      crossChannelContext: {}
    };
    
    mockConversations.push(newConversation);
    
    res.status(201).json({ 
      success: true,
      conversation: newConversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'CONVERSATION_CREATE_ERROR',
        message: 'Failed to create conversation',
        category: 'database'
      }
    });
  }
});

// Add message to conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const validationResult = addMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid message data',
          details: validationResult.error.errors
        }
      });
    }
    
    const conversationIndex = mockConversations.findIndex(c => c.id === req.params.id);
    if (conversationIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }
    
    const { role, content, timestamp } = validationResult.data;
    const message = {
      role,
      content,
      timestamp: timestamp || new Date().toISOString()
    };
    
    const conversation = mockConversations[conversationIndex];
    conversation.messages.push(message);
    
    res.json({ 
      success: true,
      conversation,
      message 
    });
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'MESSAGE_ADD_ERROR',
        message: 'Failed to add message to conversation',
        category: 'database'
      }
    });
  }
});

// Update conversation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'completed', 'paused'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid status. Must be one of: active, completed, paused'
        }
      });
    }
    
    const conversationIndex = mockConversations.findIndex(c => c.id === req.params.id);
    if (conversationIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }
    
    const conversation = mockConversations[conversationIndex];
    conversation.status = status;
    
    if (status === 'completed') {
      conversation.endedAt = new Date().toISOString();
    }
    
    res.json({ 
      success: true,
      conversation 
    });
  } catch (error) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'STATUS_UPDATE_ERROR',
        message: 'Failed to update conversation status',
        category: 'database'
      }
    });
  }
});

// Get conversations by lead ID
router.get('/lead/:leadId', async (req, res) => {
  try {
    const conversations = mockConversations.filter(c => c.leadId === req.params.leadId);
    
    res.json({ 
      success: true,
      conversations,
      total: conversations.length 
    });
  } catch (error) {
    console.error('Error fetching conversations for lead:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'LEAD_CONVERSATIONS_ERROR',
        message: 'Failed to fetch conversations for lead',
        category: 'database'
      }
    });
  }
});

// Get active conversations by channel
router.get('/active/by-channel', async (req, res) => {
  try {
    const activeConversations = {
      email: mockConversations.filter(c => c.channel === 'email' && c.status === 'active').length,
      sms: mockConversations.filter(c => c.channel === 'sms' && c.status === 'active').length,
      chat: mockConversations.filter(c => c.channel === 'chat' && c.status === 'active').length
    };
    
    res.json({ 
      success: true,
      conversations: activeConversations
    });
  } catch (error) {
    console.error('Error fetching active conversations by channel:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'ACTIVE_CONVERSATIONS_ERROR',
        message: 'Failed to fetch active conversations by channel',
        category: 'database'
      }
    });
  }
});

// Complete/close conversation
router.put('/:id/complete', async (req, res) => {
  try {
    const { outcome, notes } = req.body;
    
    const conversationIndex = mockConversations.findIndex(c => c.id === req.params.id);
    if (conversationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    const conversation = mockConversations[conversationIndex];
    conversation.status = 'completed';
    conversation.endedAt = new Date().toISOString();
    
    // Add completion message
    conversation.messages.push({
      role: 'agent',
      content: `[SYSTEM] Conversation completed. Outcome: ${outcome}. Notes: ${notes || 'None'}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: conversation.id,
        status: 'completed',
        outcome,
        notes,
        completedAt: conversation.endedAt
      }
    });
  } catch (error) {
    console.error('Error completing conversation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATION_COMPLETE_ERROR',
        message: 'Failed to complete conversation',
        category: 'database'
      }
    });
  }
});

// Trigger handover to human agent
router.post('/:id/handover', async (req, res) => {
  try {
    const { reason, priority = 'medium', notes } = req.body;
    
    const conversationIndex = mockConversations.findIndex(c => c.id === req.params.id);
    if (conversationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    const conversation = mockConversations[conversationIndex];
    conversation.status = 'handed_over';
    
    // Add handover message
    conversation.messages.push({
      role: 'agent',
      content: `[SYSTEM] Conversation handed over to human agent. Reason: ${reason}. Priority: ${priority}. Notes: ${notes || 'None'}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        handoverStatus: 'initiated',
        reason,
        priority,
        notes,
        handoverTime: new Date().toISOString(),
        status: 'handed_over'
      }
    });
  } catch (error) {
    console.error('Error triggering handover:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HANDOVER_ERROR',
        message: 'Failed to trigger handover',
        category: 'processing'
      }
    });
  }
});

// Get conversation analytics
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d', agentType = 'email' } = req.query;
    
    // Calculate analytics from mock data
    const totalConversations = mockConversations.length;
    const activeConversations = mockConversations.filter(c => c.status === 'active').length;
    const completedConversations = mockConversations.filter(c => c.status === 'completed').length;
    
    const analytics = {
      totalConversations,
      activeConversations,
      completedConversations,
      averageMessages: Math.round(
        mockConversations.reduce((sum, c) => sum + c.messages.length, 0) / totalConversations
      ),
      channelDistribution: {
        email: mockConversations.filter(c => c.channel === 'email').length,
        sms: mockConversations.filter(c => c.channel === 'sms').length,
        chat: mockConversations.filter(c => c.channel === 'chat').length
      },
      timeframe,
      agentType,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching conversation analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to fetch conversation analytics',
        category: 'processing'
      }
    });
  }
});

export default router;