import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { agentConfigurations } from '../db/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/enhanced-logger.js';

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
        or(
          ilike(agentConfigurations.name, searchPattern),
          ilike(agentConfigurations.systemPrompt, searchPattern)
        )
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

    return res.json({
      success: true,
      agents,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return res.status(500).json({
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

    return res.status(201).json({
      success: true,
      agent: newAgent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error toggling agent:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_TOGGLE_ERROR',
        message: 'Failed to toggle agent status',
        category: 'database'
      }
    });
  }
});

// Generate email sequence using AI
const generateSequenceSchema = z.object({
  campaignName: z.string().min(1),
  context: z.string().min(1),
  product: z.string().default('our product'),
  benefits: z.array(z.string()).default([]),
  priceAngle: z.string().default('Competitive pricing'),
  urgency: z.string().default('Limited time offer'),
  disclaimer: z.string().default(''),
  primaryCTA: z.string().default('Learn More'),
  CTAurl: z.string().default('#')
});

router.post('/email/generate-sequence', validateRequest({ body: generateSequenceSchema }), async (req, res) => {
  try {
    const {
      campaignName,
      context,
      product,
      benefits,
      priceAngle,
      urgency,
      disclaimer,
      primaryCTA,
      CTAurl
    } = req.body;

    logger.info('Generating email sequence', { campaignName, product });

    // Generate sophisticated email sequence (5 emails by default)
    const sequence = [
      {
        subject: `Interested in ${product}? Let's explore your options`,
        body: `Hi {{firstName}},

I hope this email finds you well! I wanted to reach out regarding ${product}.

${context || 'Based on your interest,'} I believe ${product} could be exactly what you're looking for.

Key benefits you'll receive:
${benefits.map((b: string) => `• ${b}`).join('\n')}

${priceAngle ? `${priceAngle} - ` : ''}I'd love to show you how this can benefit you specifically.

${primaryCTA ? `[${primaryCTA}](${CTAurl})\n\n` : ''}Would you like to schedule a quick 15-minute call to discuss your needs?

Best regards,
{{agentName}}

${disclaimer ? `\n---\n${disclaimer}` : ''}`
      },
      {
        subject: `Quick follow-up on ${product}`,
        body: `Hi {{firstName}},

I wanted to follow up on my previous email about ${product}.

I know you're probably busy, but I didn't want you to miss this opportunity. ${urgency || 'This offer won\'t last long.'}

Many of our clients have saved significant time and money by taking advantage of:
${benefits.slice(0, 3).map((b: string) => `• ${b}`).join('\n')}

${priceAngle ? `With ${priceAngle}, ` : ''}this could be the perfect solution for your needs.

${primaryCTA ? `[${primaryCTA}](${CTAurl})\n\n` : ''}Even if you're not ready now, I'd be happy to answer any questions you might have.

Best regards,
{{agentName}}

${disclaimer ? `\n---\n${disclaimer}` : ''}`
      },
      {
        subject: `Don't miss out: ${product} - final days`,
        body: `Hi {{firstName}},

I hope you don't mind me reaching out one more time about ${product}.

${urgency || 'Time is running out on this special offer'}, and I genuinely don't want you to miss this opportunity.

Here's what you're getting:
${benefits.map((b: string) => `✓ ${b}`).join('\n')}

${priceAngle ? `${priceAngle} - ` : ''}This is honestly one of the best deals we've offered all year.

${primaryCTA ? `[${primaryCTA}](${CTAurl})\n\n` : ''}If you have any concerns or questions, please don't hesitate to reply to this email.

Looking forward to helping you succeed,
{{agentName}}

${disclaimer ? `\n---\n${disclaimer}` : ''}`
      },
      {
        subject: `Last chance: ${product} expires soon`,
        body: `Hi {{firstName}},

This is my final email about ${product}, and I wanted to give you one last opportunity.

${urgency || 'The deadline is approaching fast'}, and after that, you'll have to wait until our next enrollment period.

I've helped hundreds of people just like you achieve their goals with:
${benefits.map((b: string) => `→ ${b}`).join('\n')}

${priceAngle ? `${priceAngle} means ` : ''}you're getting incredible value that may not be available again soon.

${primaryCTA ? `[${primaryCTA}](${CTAurl})\n\n` : ''}If you're on the fence, I'm here to answer any questions. Just reply to this email.

Don't let this opportunity pass you by,
{{agentName}}

${disclaimer ? `\n---\n${disclaimer}` : ''}`
      },
      {
        subject: `Final notice: ${product} - shall we proceed?`,
        body: `Hi {{firstName}},

I promised this would be my last email, and I always keep my promises.

The ${product} opportunity officially closes tonight, and I wanted to reach out one final time.

If you've been considering this, now is the time to act. ${urgency || 'After tonight, this exact offer won\'t be available again.'}

What you get:
${benefits.map((b: string) => `• ${b}`).join('\n')}

${priceAngle ? `${priceAngle} - ` : ''}It's a decision that could change everything for you.

${primaryCTA ? `[${primaryCTA}](${CTAurl})\n\n` : ''}If you have any last-minute questions, I'm here to help. Just reply to this email.

This is it - are you ready?

{{agentName}}

${disclaimer ? `\n---\n${disclaimer}` : ''}

P.S. If you're not interested, that's completely fine. I won't email you about this again. I just wanted to make sure you didn't miss out on something that could really benefit you.`
      }
    ];

    logger.info('Email sequence generated successfully', { count: sequence.length });

    return res.json({
      success: true,
      sequence,
      count: sequence.length
    });

  } catch (error) {
    logger.error('Error generating email sequence', error as Error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SEQUENCE_GENERATION_ERROR',
        message: 'Failed to generate email sequence',
        category: 'system'
      }
    });
  }
});

export default router;