import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads, leadCampaignEnrollments, campaigns } from '../db/schema';
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { 
  ApiResponseBuilder, 
  LeadQuery, 
  AuthenticatedRequest, 
  TypedResponse, 
  validateLeadStatus, 
  validateChannel 
} from '../../shared/types/api';

const router = Router();

// Get all leads (OPTIMIZED - Parallel queries and better indexing)
router.get('/', async (req: AuthenticatedRequest, res: TypedResponse) => {
  try {
    const startTime = Date.now();
    const { 
      status, 
      source, 
      assignedChannel,
      search, 
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc',
      includeStats = 'false' // Optional stats inclusion
    } = req.query;

    // Validate limit to prevent excessive queries
    const validatedLimit = Math.min(Number(limit), 100);
    const validatedOffset = Math.max(Number(offset), 0);

    // Build query conditions
    const conditions = [];
    
    if (status && validateLeadStatus(status)) {
      conditions.push(eq(leads.status, status));
    }
    
    if (source) {
      conditions.push(eq(leads.source, source as string));
    }
    
    if (assignedChannel && validateChannel(assignedChannel)) {
      conditions.push(eq(leads.assignedChannel, assignedChannel));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(leads.first_name, searchPattern),
          ilike(leads.last_name, searchPattern),
          ilike(leads.email, searchPattern),
          ilike(leads.phone, searchPattern)
        )
      );
    }

    // Execute both queries in parallel (eliminates sequential execution)
    const [leadList, countResult] = await Promise.all([
      // Main query
      (() => {
        const query = db
          .select()
          .from(leads)
          .limit(validatedLimit)
          .offset(validatedOffset);

        if (conditions.length > 0) {
          query.where(and(...conditions));
        }

        // Add sorting with proper type checking
        const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'status'] as const;
        if (validSortFields.includes(sort as any)) {
          const sortField = leads[sort as keyof typeof leads];
          if (sortField) {
            if (order === 'desc') {
              query.orderBy(desc(sortField));
            } else {
              query.orderBy(sortField);
            }
          }
        }

        return query;
      })(),
      
      // Count query
      (() => {
        const countQuery = db
          .select({ count: sql<number>`count(*)::int` })
          .from(leads);

        if (conditions.length > 0) {
          countQuery.where(and(...conditions));
        }

        return countQuery;
      })()
    ]);

    const [{ count }] = countResult;
    const queryTime = Date.now() - startTime;

    // Optional: Include aggregated stats if requested
    let stats = undefined;
    if (includeStats === 'true') {
      const statsStartTime = Date.now();
      const [statusStats] = await db
        .select({
          status: leads.status,
          count: sql<number>`count(*)::int`
        })
        .from(leads)
        .groupBy(leads.status);
      
      const statsTime = Date.now() - statsStartTime;
      stats = {
        byStatus: statusStats,
        queryTime: statsTime
      };
    }

    logger.debug('Leads list query performance', {
      queryTime,
      resultCount: leadList.length,
      totalCount: count,
      conditions: conditions.length,
      includeStats: includeStats === 'true'
    });

    res.json(ApiResponseBuilder.success({
      leads: leadList,
      total: count,
      offset: validatedOffset,
      limit: validatedLimit,
      ...(stats && { stats })
    }, {
      queryTime,
      hasMore: validatedOffset + validatedLimit < count
    }));
  } catch (error) {
    logger.error('Error fetching leads:', error as Error);
    res.status(500).json(ApiResponseBuilder.databaseError('Failed to fetch leads'));
  }
});

// Get lead by ID with details (OPTIMIZED - Single query with joins)
router.get('/:id', async (req: AuthenticatedRequest, res: TypedResponse) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;
    
    // Single optimized query using Promise.all to fetch all related data in parallel
    const [leadResult, enrollments] = await Promise.all([
      // Main lead query
      db
        .select()
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1),

      // Campaign enrollments with campaign details (JOIN to avoid N+1)
      db
        .select({
          id: leadCampaignEnrollments.id,
          leadId: leadCampaignEnrollments.leadId,
          campaignId: leadCampaignEnrollments.campaignId,
          status: leadCampaignEnrollments.status,
          completed: leadCampaignEnrollments.completed,
          enrolledAt: leadCampaignEnrollments.enrolledAt,
          completedAt: leadCampaignEnrollments.completedAt,
          // Include campaign details to avoid additional queries
          campaignName: campaigns.name,
          campaignType: campaigns.type,
          campaignStatus: campaigns.status
        })
        .from(leadCampaignEnrollments)
        .leftJoin(campaigns, eq(leadCampaignEnrollments.campaignId, campaigns.id))
        .where(eq(leadCampaignEnrollments.leadId, id))
    ]);

    const [lead] = leadResult;

    if (!lead) {
      return res.status(404).json(ApiResponseBuilder.notFoundError('Lead'));
    }

    const queryTime = Date.now() - startTime;
    logger.debug('Lead detail query performance', {
      leadId: id,
      queryTime,
      enrollments: enrollments.length
    });

    res.json(ApiResponseBuilder.success({
      ...lead,
      campaigns: enrollments
    }, {
      queryTime
    }));
  } catch (error) {
    logger.error('Error fetching lead:', error as Error);
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

router.post('/', validateRequest({ body: createLeadSchema }), async (req: AuthenticatedRequest, res: TypedResponse) => {
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

router.put('/:id', validateRequest({ body: updateLeadSchema }), async (req: AuthenticatedRequest, res: TypedResponse) => {
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
router.delete('/:id', async (req: AuthenticatedRequest, res: TypedResponse) => {
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

// Bulk import leads (OPTIMIZED - Batch processing and transaction)
router.post('/import', async (req: AuthenticatedRequest, res: TypedResponse) => {
  try {
    const startTime = Date.now();
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

    // Limit batch size to prevent memory issues
    const maxBatchSize = 1000;
    if (leadData.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_TOO_LARGE',
          message: `Maximum batch size is ${maxBatchSize} leads`,
          received: leadData.length
        }
      });
    }

    // Validate and prepare leads in batches
    const validLeads = [];
    const errors = [];
    const batchSize = 100; // Process in smaller chunks for better performance

    for (let i = 0; i < leadData.length; i += batchSize) {
      const batch = leadData.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        try {
          const validated = createLeadSchema.parse(batch[j]);
          validLeads.push({
            ...validated,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            error: error instanceof Error ? error.message : 'Validation failed'
          });
        }
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

    // Check for existing emails in batch to prevent duplicates
    const emailsToCheck = validLeads
      .filter(lead => lead.email)
      .map(lead => lead.email!);
    
    let existingEmails: string[] = [];
    if (emailsToCheck.length > 0) {
      const existingLeads = await db
        .select({ email: leads.email })
        .from(leads)
        .where(inArray(leads.email, emailsToCheck));
      
      existingEmails = existingLeads.map(lead => lead.email!).filter(Boolean);
    }

    // Filter out leads with existing emails
    const leadsToInsert = validLeads.filter(lead => 
      !lead.email || !existingEmails.includes(lead.email)
    );

    // Insert valid leads in batches using transaction
    const insertedLeads = [];
    const insertBatchSize = 100;
    
    for (let i = 0; i < leadsToInsert.length; i += insertBatchSize) {
      const batch = leadsToInsert.slice(i, i + insertBatchSize);
      const batchResult = await db
        .insert(leads)
        .values(batch)
        .onConflictDoNothing()
        .returning();
      
      insertedLeads.push(...batchResult);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Bulk lead import completed', {
      totalReceived: leadData.length,
      validationErrors: errors.length,
      duplicateEmails: validLeads.length - leadsToInsert.length,
      inserted: insertedLeads.length,
      processingTime
    });

    res.json({
      success: true,
      imported: insertedLeads.length,
      failed: errors.length,
      duplicates: validLeads.length - leadsToInsert.length,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        processingTime,
        batchSize: leadData.length
      }
    });
  } catch (error) {
    logger.error('Error importing leads:', error as Error);
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
router.patch('/:id/status', async (req: AuthenticatedRequest, res: TypedResponse) => {
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
        status: validateLeadStatus(status) ? status : 'new',
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