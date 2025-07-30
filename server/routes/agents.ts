import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { agentConfigurations } from '../db/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const { type, active, search, limit = 50, offset = 0 } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (type) {
      conditions.push(eq(agentConfigurations.type, type as any));
    }
    
    if (active !== undefined) {
      conditions.push(eq(agentConfigurations.active, active === 'true'));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        ilike(agentConfigurations.name, searchPattern)
      );
    }

    // Execute query
    const query = db
      .select()
      .from(agentConfigurations)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const agents = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentConfigurations);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    res.json({
      success: true,
      agents,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_FETCH_ERROR',
        message: 'Failed to fetch agents',
        category: 'database'
      }
    });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [agent] = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found'
        }
      });
    }

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_FETCH_ERROR',
        message: 'Failed to fetch agent',
        category: 'database'
      }
    });
  }
});

// Create agent
const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['email', 'sms', 'chat', 'voice']),
  systemPrompt: z.string().min(1),
  contextNote: z.string().optional(),
  temperature: z.number().min(0).max(10).default(7),
  maxTokens: z.number().min(1).max(4000).default(500),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().optional(),
  channelConfig: z.record(z.any()).optional(),
  responseDelay: z.number().min(0).default(0),
  retryAttempts: z.number().min(0).max(10).default(3),
  metadata: z.record(z.any()).optional()
});

router.post('/', validateRequest({ body: createAgentSchema }), async (req, res) => {
  try {
    const agentData = req.body;
    
    const [newAgent] = await db
      .insert(agentConfigurations)
      .values({
        ...agentData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({
      success: true,
      agent: newAgent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_CREATE_ERROR',
        message: 'Failed to create agent',
        category: 'database'
      }
    });
  }
});

// Update agent
const updateAgentSchema = createAgentSchema.partial();

router.put('/:id', validateRequest({ body: updateAgentSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedAgent] = await db
      .update(agentConfigurations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(agentConfigurations.id, id))
      .returning();

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found'
        }
      });
    }

    res.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_UPDATE_ERROR',
        message: 'Failed to update agent',
        category: 'database'
      }
    });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedAgent] = await db
      .delete(agentConfigurations)
      .where(eq(agentConfigurations.id, id))
      .returning();

    if (!deletedAgent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_DELETE_ERROR',
        message: 'Failed to delete agent',
        category: 'database'
      }
    });
  }
});

// Toggle agent active status
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status
    const [agent] = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found'
        }
      });
    }

    // Toggle status
    const [updatedAgent] = await db
      .update(agentConfigurations)
      .set({
        active: !agent.active,
        updatedAt: new Date()
      })
      .where(eq(agentConfigurations.id, id))
      .returning();

    res.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error toggling agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_TOGGLE_ERROR',
        message: 'Failed to toggle agent status',
        category: 'database'
      }
    });
  }
});

export default router;