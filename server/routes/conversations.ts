import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { conversations, leads } from '../db/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const { 
      leadId, 
      channel, 
      status, 
      agentType,
      limit = 50, 
      offset = 0, 
      sort = 'startedAt', 
      order = 'desc' 
    } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (leadId) {
      conditions.push(eq(conversations.leadId, leadId as string));
    }
    
    if (channel) {
      conditions.push(eq(conversations.channel, channel as any));
    }
    
    if (status) {
      conditions.push(eq(conversations.status, status as string));
    }
    
    if (agentType) {
      conditions.push(eq(conversations.agentType, agentType as any));
    }

    // Execute query with lead info
    const query = db
      .select({
        conversation: conversations,
        lead: {
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          email: leads.email,
          phone: leads.phone
        }
      })
      .from(conversations)
      .leftJoin(leads, eq(conversations.leadId, leads.id))
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    if (order === 'desc') {
      query.orderBy(desc(conversations[sort as keyof typeof conversations]));
    } else {
      query.orderBy(conversations[sort as keyof typeof conversations]);
    }

    const results = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    // Format results
    const conversationList = results.map(r => ({
      ...r.conversation,
      lead: r.lead
    }));

    res.json({
      success: true,
      conversations: conversationList,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATION_FETCH_ERROR',
        message: 'Failed to fetch conversations',
        category: 'database'
      }
    });
  }
});

// Get conversation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db
      .select({
        conversation: conversations,
        lead: {
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          email: leads.email,
          phone: leads.phone
        }
      })
      .from(conversations)
      .leftJoin(leads, eq(conversations.leadId, leads.id))
      .where(eq(conversations.id, id))
      .limit(1);

    if (!result) {
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
      conversation: {
        ...result.conversation,
        lead: result.lead
      }
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

// Create conversation
const createConversationSchema = z.object({
  leadId: z.string().uuid().optional(),
  channel: z.enum(['email', 'sms', 'chat']),
  agentType: z.enum(['email', 'sms', 'chat', 'voice']).optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string().datetime().optional()
  })).default([]),
  metadata: z.record(z.any()).optional()
});

router.post('/', validateRequest({ body: createConversationSchema }), async (req, res) => {
  try {
    const conversationData = req.body;
    
    const [newConversation] = await db
      .insert(conversations)
      .values({
        ...conversationData,
        status: 'active',
        startedAt: new Date(),
        lastMessageAt: new Date()
      })
      .returning();

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
const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1)
});

router.post('/:id/messages', validateRequest({ body: addMessageSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;
    
    // Get current conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    // Add message to messages array
    const messages = conversation.messages as any[] || [];
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    // Update conversation
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        messages,
        lastMessageAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();

    res.json({
      success: true,
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Error adding message:', error);
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
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'abandoned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid conversation status',
          validStatuses
        }
      });
    }

    const updates: any = {
      status
    };

    if (status === 'completed' || status === 'abandoned') {
      updates.endedAt = new Date();
    }

    const [updatedConversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    if (!updatedConversation) {
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
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATION_UPDATE_ERROR',
        message: 'Failed to update conversation status',
        category: 'database'
      }
    });
  }
});

// Delete conversation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedConversation] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();

    if (!deletedConversation) {
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
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATION_DELETE_ERROR',
        message: 'Failed to delete conversation',
        category: 'database'
      }
    });
  }
});

// Get conversation statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await db
      .select({
        totalConversations: sql<number>`count(*)::int`,
        activeConversations: sql<number>`count(*) filter (where status = 'active')::int`,
        completedConversations: sql<number>`count(*) filter (where status = 'completed')::int`,
        abandonedConversations: sql<number>`count(*) filter (where status = 'abandoned')::int`,
        avgMessagesPerConversation: sql<number>`avg(jsonb_array_length(messages))::int`
      })
      .from(conversations);

    const channelStats = await db
      .select({
        channel: conversations.channel,
        count: sql<number>`count(*)::int`
      })
      .from(conversations)
      .groupBy(conversations.channel);

    res.json({
      success: true,
      stats: {
        ...stats[0],
        byChannel: channelStats
      }
    });
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_ERROR',
        message: 'Failed to fetch conversation statistics',
        category: 'database'
      }
    });
  }
});

export default router;