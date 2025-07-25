import { Router } from 'express';
import { db } from '../db';
import { templates } from '../db/schema';
import { eq, and, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'sms', 'chat']),
  subject: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  category: z.string().optional(),
  active: z.boolean().default(true)
});

const updateTemplateSchema = createTemplateSchema.partial();

// Get all templates
router.get('/', async (req, res) => {
  try {
    const { channel, category, search, active } = req.query;
    
    let query = db.select().from(templates);
    const conditions = [];
    
    if (channel) {
      conditions.push(eq(templates.channel, channel as any));
    }
    
    if (category) {
      conditions.push(eq(templates.category, category as string));
    }
    
    if (active !== undefined) {
      conditions.push(eq(templates.active, active === 'true'));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(templates.name, `%${search}%`),
          ilike(templates.description, `%${search}%`),
          ilike(templates.content, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const templatesList = await query;
    
    res.json({
      success: true,
      templates: templatesList
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_FETCH_ERROR',
        message: 'Failed to fetch templates',
        category: 'database'
      }
    });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_FETCH_ERROR',
        message: 'Failed to fetch template',
        category: 'database'
      }
    });
  }
});

// Create new template
router.post('/', validateRequest({ body: createTemplateSchema }), async (req, res) => {
  try {
    const templateData = req.body;
    
    const [newTemplate] = await db
      .insert(templates)
      .values({
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.status(201).json({
      success: true,
      template: newTemplate
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_CREATE_ERROR',
        message: 'Failed to create template',
        category: 'database'
      }
    });
  }
});

// Update template
router.put('/:id', validateRequest({ body: updateTemplateSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedTemplate] = await db
      .update(templates)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(templates.id, id))
      .returning();
    
    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }
    
    res.json({
      success: true,
      template: updatedTemplate
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_UPDATE_ERROR',
        message: 'Failed to update template',
        category: 'database'
      }
    });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedTemplate] = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    
    if (!deletedTemplate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_DELETE_ERROR',
        message: 'Failed to delete template',
        category: 'database'
      }
    });
  }
});

// Clone template
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Get original template
    const [original] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    
    if (!original) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }
    
    // Create clone
    const [cloned] = await db
      .insert(templates)
      .values({
        ...original,
        id: undefined, // Let DB generate new ID
        name: name || `${original.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.status(201).json({
      success: true,
      template: cloned
    });
  } catch (error) {
    logger.error('Error cloning template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_CLONE_ERROR',
        message: 'Failed to clone template',
        category: 'database'
      }
    });
  }
});

export default router;