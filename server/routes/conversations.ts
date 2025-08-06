import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createConversationSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  campaignId: z.string().uuid('Invalid campaign ID').optional(),
  channel: z.enum(['email', 'sms', 'chat'], { 
    errorMap: () => ({ message: 'Channel must be email, sms, or chat' })
  }),
  metadata: z.record(z.any()).optional()
});

const addMessageSchema = z.object({
  sender: z.enum(['agent', 'lead', 'system', 'human'], {
    errorMap: () => ({ message: 'Sender must be agent, lead, system, or human' })
  }),
  content: z.string().min(1, 'Message content is required'),
  metadata: z.record(z.any()).optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'handover_pending', 'handover_completed'], {
    errorMap: () => ({ message: 'Invalid status' })
  })
});

/**
 * GET /api/conversations
 * Get all conversations with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { 
      leadId, 
      campaignId,
      channel, 
      status, 
      limit = 50, 
      offset = 0, 
      sort = 'created_at', 
      order = 'desc' 
    } = req.query;

    // Build WHERE conditions
    const conditions = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (leadId) {
      conditions.push(`c.lead_id = $${paramIndex}`);
      params.push(leadId);
      paramIndex++;
    }

    if (campaignId) {
      conditions.push(`c.campaign_id = $${paramIndex}`);
      params.push(campaignId);
      paramIndex++;
    }

    if (channel) {
      conditions.push(`c.channel = $${paramIndex}`);
      params.push(channel);
      paramIndex++;
    }

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY c.${sort} ${String(order).toUpperCase()}`;
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    // Build query with proper parameter binding
    // Build the complete query string with placeholders
    let queryParts = [`
      SELECT
        c.*,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
    `];
    
    if (whereClause) {
      queryParts.push(whereClause);
    }
    queryParts.push(orderClause);
    queryParts.push(limitClause);
    
    const fullQuery = queryParts.join(' ');
    
    // Use sql template with proper parameter binding
    const result = await db.execute(sql.raw(fullQuery));

    res.json({
      success: true,
      data: {
        conversations: (result as any).rows || result,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: ((result as any).rows || result).length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATIONS_FETCH_ERROR',
        message: 'Failed to fetch conversations',
        category: 'database'
      }
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get a specific conversation with messages
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conversationQuery = `
      SELECT
        c.*,
        l.first_name,
        l.last_name,
        l.email,
        l.phone
      FROM conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.id = $1
    `;

    const messagesQuery = `
      SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;

    // Use sql template literals for safe parameter binding
    const conversationSql = sql`
      SELECT
        c.*,
        l.first_name,
        l.last_name,
        l.email,
        l.phone
      FROM conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.id = ${id}
    `;

    const messagesSql = sql`
      SELECT * FROM messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    const [conversationResult, messagesResult] = await Promise.all([
      db.execute(conversationSql),
      db.execute(messagesSql)
    ]);

    if ((conversationResult as any).rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    const conversation = (conversationResult as any).rows[0];
    const messages = (messagesResult as any).rows;

    res.json({
      success: true,
      data: {
        conversation: {
          ...conversation,
          messages
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching conversation:', error);
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

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', async (req, res) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parsed.error.flatten(),
          category: 'validation'
        }
      });
    }

    const { leadId, campaignId, channel, metadata } = parsed.data;

    const insertSql = sql`
      INSERT INTO conversations (lead_id, campaign_id, channel, metadata)
      VALUES (${leadId}, ${campaignId || null}, ${channel}, ${JSON.stringify(metadata || {})}::jsonb)
      RETURNING *
    `;

    const result = await db.execute(insertSql);

    const conversation = (result as any).rows[0];

    res.status(201).json({
      success: true,
      data: { conversation },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating conversation:', error);
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

/**
 * POST /api/conversations/:id/messages
 * Add a message to a conversation
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = addMessageSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parsed.error.flatten(),
          category: 'validation'
        }
      });
    }

    const { sender, content, metadata } = parsed.data;

    // Check if conversation exists
    const checkSql = sql`SELECT id FROM conversations WHERE id = ${id}`;
    const checkResult = await db.execute(checkSql);
    
    if ((checkResult as any).rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    // Add message
    const insertMessageSql = sql`
      INSERT INTO messages (conversation_id, sender, content, metadata)
      VALUES (${id}, ${sender}, ${content}, ${JSON.stringify(metadata || {})}::jsonb)
      RETURNING *
    `;

    const result = await db.execute(insertMessageSql);

    const message = (result as any).rows[0];

    res.status(201).json({
      success: true,
      data: { message },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MESSAGE_ADD_ERROR',
        message: 'Failed to add message',
        category: 'database'
      }
    });
  }
});

/**
 * PATCH /api/conversations/:id/status
 * Update conversation status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateStatusSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parsed.error.flatten(),
          category: 'validation'
        }
      });
    }

    const { status } = parsed.data;

    let updateSql;
    
    if (['completed', 'handover_completed'].includes(status)) {
      updateSql = sql`
        UPDATE conversations
        SET status = ${status}, updated_at = NOW(), ended_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      updateSql = sql`
        UPDATE conversations
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }

    const result = await db.execute(updateSql);

    if ((result as any).rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found'
        }
      });
    }

    const conversation = (result as any).rows[0];

    res.json({
      success: true,
      data: { conversation },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error updating conversation status:', error);
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

export default router;
