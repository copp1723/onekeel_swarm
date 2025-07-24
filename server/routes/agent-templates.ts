import express from 'express';
import { db } from '../db';
import { agentTemplates, agentConfigurations } from '../db/schema';
import { eq, sql, ilike } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  contextNote: z.string().optional(),
  type: z.enum(['email', 'sms', 'chat', 'voice']),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  temperature: z.number().min(0).max(10).default(7),
  maxTokens: z.number().min(1).max(4000).default(500),
  configurableParams: z.array(z.string()).optional(),
  defaultParams: z.record(z.any()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const searchTemplateSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['email', 'sms', 'chat', 'voice']).optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Search agent templates
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, type, category, limit = 20, offset = 0 } = req.query as any;
    
    // Execute query with filters
    const templates = await db.query.agentTemplates.findMany({
      where: (template, { and, or, ilike, eq }) => {
        const conditions = [];
        
        if (query) {
          conditions.push(
            or(
              ilike(template.name, `%${query}%`),
              ilike(template.description, `%${query}%`)
            )
          );
        }
        
        if (type) {
          conditions.push(eq(template.type, type));
        }
        
        if (category) {
          conditions.push(eq(template.category, category));
        }
        
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      limit: Number(limit),
      offset: Number(offset),
      orderBy: sql`name`
    });
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(agentTemplates);
    const total = countResult[0].count;
    
    res.json({
      templates,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total,
      }
    });
  } catch (error) {
    logger.error('Error searching agent templates', { error });
    res.status(500).json({ error: 'Failed to search agent templates' });
  }
});

// Get all agent templates
router.get('/', authenticate, async (req, res) => {
  try {
    const templates = await db.query.agentTemplates.findMany({
      orderBy: [sql`category`, sql`name`]
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching agent templates', { error });
    res.status(500).json({ error: 'Failed to fetch agent templates' });
  }
});

// Get agent templates by category
router.get('/category/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    
    const templates = await db.query.agentTemplates.findMany({
      where: eq(agentTemplates.category, category),
      orderBy: sql`name`
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching agent templates by category', { error });
    res.status(500).json({ error: 'Failed to fetch agent templates' });
  }
});

// Get a single agent template
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await db.query.agentTemplates.findFirst({
      where: eq(agentTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    logger.error('Error fetching agent template', { error });
    res.status(500).json({ error: 'Failed to fetch agent template' });
  }
});

// Create a new agent template (admin only)
router.post('/', authenticate, validateRequest({ body: createTemplateSchema }), async (req, res) => {
  try {
    const { user } = req as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create agent templates' });
    }
    
    const {
      name,
      description,
      type,
      category,
      systemPrompt,
      contextNote,
      temperature,
      maxTokens,
      configurableParams,
      defaultParams
    } = req.body;
    
    const newTemplate = await db.insert(agentTemplates).values({
      name,
      description: description || '',
      type,
      category: category || 'general',
      systemPrompt,
      contextNote,
      temperature: temperature || 7,
      maxTokens: maxTokens || 500,
      configurableParams: configurableParams || [],
      defaultParams: defaultParams || {},
      metadata: {},
      isDefault: false
    }).returning();
    
    res.status(201).json({ template: newTemplate[0] });
  } catch (error) {
    logger.error('Error creating agent template', { error });
    res.status(500).json({ error: 'Failed to create agent template' });
  }
});

// Update an agent template (admin only)
router.put('/:id', authenticate, validateRequest({ body: updateTemplateSchema }), async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update agent templates' });
    }
    
    const template = await db.query.agentTemplates.findFirst({
      where: eq(agentTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' });
    }
    
    const {
      name,
      description,
      type,
      category,
      systemPrompt,
      contextNote,
      temperature,
      maxTokens,
      configurableParams,
      defaultParams
    } = req.body;
    
    const updatedTemplate = await db.update(agentTemplates)
      .set({
        name: name || template.name,
        description: description !== undefined ? description : template.description,
        type: type || template.type,
        category: category || template.category,
        systemPrompt: systemPrompt || template.systemPrompt,
        contextNote: contextNote !== undefined ? contextNote : template.contextNote,
        temperature: temperature !== undefined ? temperature : template.temperature,
        maxTokens: maxTokens !== undefined ? maxTokens : template.maxTokens,
        configurableParams: configurableParams !== undefined ? configurableParams : template.configurableParams,
        defaultParams: defaultParams !== undefined ? defaultParams : template.defaultParams,
        metadata: template.metadata,
        updatedAt: new Date()
      })
      .where(eq(agentTemplates.id, id))
      .returning();
    
    res.json({ template: updatedTemplate[0] });
  } catch (error) {
    logger.error('Error updating agent template', { error });
    res.status(500).json({ error: 'Failed to update agent template' });
  }
});

// Delete an agent template (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete agent templates' });
    }
    
    const template = await db.query.agentTemplates.findFirst({
      where: eq(agentTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' });
    }
    
    // Don't allow deletion of default templates
    if (template.isDefault) {
      return res.status(403).json({ error: 'Default templates cannot be deleted' });
    }
    
    await db.delete(agentTemplates).where(eq(agentTemplates.id, id));
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting agent template', { error });
    res.status(500).json({ error: 'Failed to delete agent template' });
  }
});

// Clone an agent template
router.post('/:id/clone', authenticate, async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can clone agent templates' });
    }
    
    const template = await db.query.agentTemplates.findFirst({
      where: eq(agentTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' });
    }
    
    // Create a new template based on the existing one
    const newTemplate = await db.insert(agentTemplates).values({
      name: name || `${template.name} (Copy)`,
      description: description || template.description,
      type: template.type,
      category: template.category,
      isDefault: false,
      systemPrompt: template.systemPrompt,
      contextNote: template.contextNote,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      configurableParams: template.configurableParams,
      defaultParams: template.defaultParams,
      metadata: {
        ...(typeof template.metadata === 'object' ? template.metadata : {}),
        clonedFrom: template.id
      }
    }).returning();
    
    res.status(201).json({ template: newTemplate[0] });
  } catch (error) {
    logger.error('Error cloning agent template', { error });
    res.status(500).json({ error: 'Failed to clone agent template' });
  }
});

// Get agent templates by type
router.get('/type/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate type parameter
    const validTypes = ['email', 'sms', 'chat', 'voice'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    const templates = await db.query.agentTemplates.findMany({
      where: eq(agentTemplates.type, type as any),
      orderBy: sql`name`
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching agent templates by type', { error });
    res.status(500).json({ error: 'Failed to fetch agent templates' });
  }
});

// Get agent templates by category
router.get('/category/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    
    const templates = await db.query.agentTemplates.findMany({
      where: eq(agentTemplates.category, category),
      orderBy: sql`name`
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching agent templates by category', { error });
    res.status(500).json({ error: 'Failed to fetch agent templates' });
  }
});

// Get default agent templates
router.get('/defaults', authenticate, async (req, res) => {
  try {
    const templates = await db.query.agentTemplates.findMany({
      where: eq(agentTemplates.isDefault, true),
      orderBy: sql`name`
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching default agent templates', { error });
    res.status(500).json({ error: 'Failed to fetch default agent templates' });
  }
});

// Create an agent configuration from a template
router.post('/:id/create-agent', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, paramValues } = req.body;
    
    const template = await db.query.agentTemplates.findFirst({
      where: eq(agentTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' });
    }
    
    // Process the system prompt with parameter values
    let systemPrompt = template.systemPrompt;
    const params = {
      ...(typeof template.defaultParams === 'object' ? template.defaultParams : {}),
      ...(typeof paramValues === 'object' ? paramValues : {})
    };
    
    // Replace template variables with actual values
    Object.entries(params).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      systemPrompt = systemPrompt.replace(regex, value as string);
    });
    
    // Create a new agent configuration
    const newAgent = await db.insert(agentConfigurations).values({
      name: name || template.name,
      type: template.type,
      systemPrompt,
      contextNote: template.contextNote,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      metadata: {
        createdFromTemplate: template.id,
        templateParams: params
      }
    }).returning();
    
    res.status(201).json({ agent: newAgent[0] });
  } catch (error) {
    logger.error('Error creating agent from template', { error });
    res.status(500).json({ error: 'Failed to create agent from template' });
  }
});

export default router;