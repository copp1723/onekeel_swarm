import { Router } from 'express';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { db } from '../db';
import { templates } from '../db/schema';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schema for template
const templateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'sms']),
  subject: z.string().optional(),
  content: z.string().min(1),
  category: z.string().min(1).max(100),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  clientId: z.string().uuid().nullable().optional(),
  isShared: z.boolean().optional()
});

// Get all templates
router.get('/', authenticate, async (req, res) => {
  try {
    const { global, clientId, search, category, channel } = req.query;
    const userId = req.user?.id;

    let conditions = [];

    // Handle global vs client-specific templates
    if (global === 'true') {
      // Show only templates without a clientId (global templates)
      conditions.push(eq(templates.channel, templates.channel)); // Always true, just to have a condition
    } else if (clientId) {
      // Show templates for specific client
      conditions.push(eq(templates.id, clientId as string));
    } else {
      // Show user's templates
      conditions.push(eq(templates.id, userId));
    }

    // Add search filter
    if (search) {
      conditions.push(
        or(
          ilike(templates.name, `%${search}%`),
          ilike(templates.content, `%${search}%`),
          ilike(templates.subject, `%${search}%`)
        )
      );
    }

    // Add category filter
    if (category && category !== 'all') {
      conditions.push(eq(templates.category, category as string));
    }

    // Add channel filter
    if (channel && channel !== 'all') {
      conditions.push(eq(templates.channel, channel as 'email' | 'sms'));
    }

    const templatesData = await db
      .select()
      .from(templates)
      .where(and(...conditions))
      .orderBy(desc(templates.updatedAt));

    // Transform data to match frontend expectations
    const transformedTemplates = templatesData.map(template => ({
      ...template,
      variables: template.variables || [],
      isShared: false, // We'll implement sharing logic later
      clientId: null // For now
    }));

    res.json({
      success: true,
      data: transformedTemplates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
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
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        variables: template.variables || [],
        isShared: false
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Create template
router.post('/', authenticate, async (req, res) => {
  try {
    const validatedData = templateSchema.parse(req.body);
    
    const newTemplate = {
      id: uuidv4(),
      ...validatedData,
      variables: validatedData.variables || [],
      active: validatedData.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [created] = await db
      .insert(templates)
      .values(newTemplate)
      .returning();

    res.json({
      success: true,
      data: {
        ...created,
        isShared: validatedData.isShared || false
      }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template data',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = templateSchema.partial().parse(req.body);

    const [updated] = await db
      .update(templates)
      .set({
        ...validatedData,
        variables: validatedData.variables || [],
        updatedAt: new Date()
      })
      .where(eq(templates.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...updated,
        isShared: validatedData.isShared || false
      }
    });
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template data',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// Duplicate template
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const [original] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!original) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const newTemplate = {
      ...original,
      id: uuidv4(),
      name: name || `${original.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [created] = await db
      .insert(templates)
      .values(newTemplate)
      .returning();

    res.json({
      success: true,
      data: created
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate template'
    });
  }
});

export default router;