import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { templates } from '../db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Get all templates
router.get('/', async (req, res) => {
  try {
    const { 
      channel, 
      category, 
      active,
      search,
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;

    // Build query conditions
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
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(templates.name, searchPattern),
          ilike(templates.subject, searchPattern),
          ilike(templates.content, searchPattern)
        )
      );
    }

    // Execute query
    const query = db
      .select()
      .from(templates)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    if (order === 'desc') {
      if (sort === 'createdAt') {
        query.orderBy(desc(templates.createdAt));
      } else if (sort === 'updatedAt') {
        query.orderBy(desc(templates.updatedAt));
      } else if (sort === 'name') {
        query.orderBy(desc(templates.name));
      } else {
        query.orderBy(desc(templates.createdAt)); // default
      }
    } else {
      if (sort === 'createdAt') {
        query.orderBy(templates.createdAt);
      } else if (sort === 'updatedAt') {
        query.orderBy(templates.updatedAt);
      } else if (sort === 'name') {
        query.orderBy(templates.name);
      } else {
        query.orderBy(templates.createdAt); // default
      }
    }

    const templateList = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(templates);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    return res.json({
      success: true,
      data: templateList,
      total: count,
      offset: Number(offset),
      limit: Number(limit),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_FETCH_ERROR',
        message: 'Failed to fetch template',
        category: 'database'
      }
    });
  }
});

// Create template
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'sms', 'chat']),
  subject: z.string().max(255).optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).default([]),
  category: z.string().max(100).optional()
});

router.post('/', validateRequest({ body: createTemplateSchema }), async (req, res) => {
  try {
    const templateData = req.body;
    
    // Extract variables from content
    const variableMatches = templateData.content.match(/\{\{([^}]+)\}\}/g) || [];
    const extractedVariables = variableMatches.map((v: string) => v.replace(/[{}]/g, ''));
    
    const [newTemplate] = await db
      .insert(templates)
      .values({
        ...templateData,
        variables: [...new Set([...templateData.variables, ...extractedVariables])],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return res.status(201).json({
      success: true,
      data: newTemplate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({
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
const updateTemplateSchema = createTemplateSchema.partial();

router.put('/:id', validateRequest({ body: updateTemplateSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If content is being updated, extract variables
    if (updates.content) {
      const variableMatches = updates.content.match(/\{\{([^}]+)\}\}/g) || [];
      const extractedVariables = variableMatches.map((v: string) => v.replace(/[{}]/g, ''));
      updates.variables = [...new Set([...(updates.variables || []), ...extractedVariables])];
    }
    
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

    return res.json({
      success: true,
      data: updatedTemplate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Template deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_DELETE_ERROR',
        message: 'Failed to delete template',
        category: 'database'
      }
    });
  }
});

// Toggle template active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status
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

    // Toggle status
    const [updatedTemplate] = await db
      .update(templates)
      .set({
        active: !template.active,
        updatedAt: new Date()
      })
      .where(eq(templates.id, id))
      .returning();

    return res.json({
      success: true,
      data: updatedTemplate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error toggling template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_TOGGLE_ERROR',
        message: 'Failed to toggle template status',
        category: 'database'
      }
    });
  }
});

// Preview template with variables
router.post('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;
    
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

    // Replace variables in content
    let renderedContent = template.content;
    let renderedSubject = template.subject || '';
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, String(value));
      renderedSubject = renderedSubject.replace(regex, String(value));
    });

    return res.json({
      success: true,
      data: {
        ...template,
        content: renderedContent,
        subject: renderedSubject,
        isPreview: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_PREVIEW_ERROR',
        message: 'Failed to preview template',
        category: 'database'
      }
    });
  }
});

// Get template categories
router.get('/meta/categories', async (_req, res) => {
  try {
    const categories = await db
      .select({
        category: templates.category,
        count: sql<number>`count(*)::int`
      })
      .from(templates)
      .where(sql`category is not null`)
      .groupBy(templates.category);

    return res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_FETCH_ERROR',
        message: 'Failed to fetch template categories',
        category: 'database'
      }
    });
  }
});

export default router;