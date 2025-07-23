import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads, communications, conversations, leadCampaignEnrollments } from '../db/schema';
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Get all leads
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      source, 
      assignedChannel,
      search, 
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(leads.status, status as any));
    }
    
    if (source) {
      conditions.push(eq(leads.source, source as string));
    }
    
    if (assignedChannel) {
      conditions.push(eq(leads.assignedChannel, assignedChannel as any));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(leads.firstName, searchPattern),
          ilike(leads.lastName, searchPattern),
          ilike(leads.email, searchPattern),
          ilike(leads.phone, searchPattern)
        )
      );
    }

    // Execute query
    const query = db
      .select()
      .from(leads)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    if (order === 'desc') {
      query.orderBy(desc(leads[sort as keyof typeof leads]));
    } else {
      query.orderBy(leads[sort as keyof typeof leads]);
    }

    const leadList = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    res.json({
      success: true,
      leads: leadList,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_FETCH_ERROR',
        message: 'Failed to fetch leads',
        category: 'database'
      }
    });
  }
});

// Get lead by ID with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    // Get communications
    const communicationsList = await db
      .select()
      .from(communications)
      .where(eq(communications.leadId, id))
      .orderBy(desc(communications.createdAt))
      .limit(10);

    // Get conversations
    const conversationsList = await db
      .select()
      .from(conversations)
      .where(eq(conversations.leadId, id))
      .orderBy(desc(conversations.startedAt));

    // Get campaign enrollments
    const enrollments = await db
      .select()
      .from(leadCampaignEnrollments)
      .where(eq(leadCampaignEnrollments.leadId, id));

    res.json({
      success: true,
      lead: {
        ...lead,
        communications: communicationsList,
        conversations: conversationsList,
        campaigns: enrollments
      }
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_FETCH_ERROR',
        message: 'Failed to fetch lead details',
        category: 'database'
      }
    });
  }
});

// Create lead
const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.string().default('api'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).default('new'),
  qualificationScore: z.number().min(0).max(100).optional(),
  assignedChannel: z.enum(['email', 'sms', 'chat']).optional(),
  boberdooId: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  creditScore: z.number().optional(),
  income: z.number().optional(),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional()
});

router.post('/', validateRequest({ body: createLeadSchema }), async (req, res) => {
  try {
    const leadData = req.body;
    
    // Check for duplicate email
    if (leadData.email) {
      const [existing] = await db
        .select()
        .from(leads)
        .where(eq(leads.email, leadData.email))
        .limit(1);
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_LEAD',
            message: 'A lead with this email already exists',
            leadId: existing.id
          }
        });
      }
    }
    
    const [newLead] = await db
      .insert(leads)
      .values({
        ...leadData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({
      success: true,
      lead: newLead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_CREATE_ERROR',
        message: 'Failed to create lead',
        category: 'database'
      }
    });
  }
});

// Update lead
const updateLeadSchema = createLeadSchema.partial();

router.put('/:id', validateRequest({ body: updateLeadSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedLead] = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    res.json({
      success: true,
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_UPDATE_ERROR',
        message: 'Failed to update lead',
        category: 'database'
      }
    });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedLead] = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning();

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_DELETE_ERROR',
        message: 'Failed to delete lead',
        category: 'database'
      }
    });
  }
});

// Bulk import leads
router.post('/import', async (req, res) => {
  try {
    const { leads: leadData } = req.body;

    if (!Array.isArray(leadData) || leadData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'leads must be a non-empty array'
        }
      });
    }

    // Validate and prepare leads
    const validLeads = [];
    const errors = [];

    for (let i = 0; i < leadData.length; i++) {
      try {
        const validated = createLeadSchema.parse(leadData[i]);
        validLeads.push({
          ...validated,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Validation failed'
        });
      }
    }

    if (validLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALL_LEADS_INVALID',
          message: 'All leads failed validation',
          errors
        }
      });
    }

    // Insert valid leads
    const insertedLeads = await db
      .insert(leads)
      .values(validLeads)
      .onConflictDoNothing()
      .returning();

    res.json({
      success: true,
      imported: insertedLeads.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_IMPORT_ERROR',
        message: 'Failed to import leads',
        category: 'database'
      }
    });
  }
});

// Update lead status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid lead status',
          validStatuses
        }
      });
    }

    const [updatedLead] = await db
      .update(leads)
      .set({
        status: status as any,
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    res.json({
      success: true,
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_STATUS_UPDATE_ERROR',
        message: 'Failed to update lead status',
        category: 'database'
      }
    });
  }
});

export default router;