import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { campaigns, leadCampaignEnrollments, leads, campaignSteps } from '../db/schema';
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import { campaignExecutionEngine } from '../services/campaign-execution-engine';
import { EmailServiceFactory } from '../services/email/factory';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Get campaign metrics for reporting
router.get('/metrics', async (req, res) => {
  try {
    const { limit = 5, sort = 'recent' } = req.query;
    
    // Mock data for now - replace with real DB queries
    const campaigns = [
      {
        id: '1',
        name: 'Q4 Car Loan Refinance',
        status: 'active',
        metrics: {
          sent: 2456,
          openRate: 68.5,
          replyRate: 12.3,
          handovers: 89,
          conversionRate: 8.7
        }
      },
      {
        id: '2',
        name: 'Holiday Personal Loan',
        status: 'completed',
        metrics: {
          sent: 1823,
          openRate: 72.1,
          replyRate: 15.8,
          handovers: 124,
          conversionRate: 11.2
        }
      },
      {
        id: '3',
        name: 'Auto Loan Re-engage',
        status: 'active',
        metrics: {
          sent: 945,
          openRate: 45.3,
          replyRate: 8.9,
          handovers: 34,
          conversionRate: 4.2
        }
      },
      {
        id: '4',
        name: 'New Year Special',
        status: 'completed',
        metrics: {
          sent: 3210,
          openRate: 55.7,
          replyRate: 10.2,
          handovers: 145,
          conversionRate: 9.8
        }
      },
      {
        id: '5',
        name: 'Summer Promo',
        status: 'paused',
        metrics: {
          sent: 1567,
          openRate: 62.3,
          replyRate: 13.5,
          handovers: 78,
          conversionRate: 7.4
        }
      }
    ];
    
    res.json({
      success: true,
      campaigns: campaigns.slice(0, Number(limit))
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch campaign metrics' 
    });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { active, type, search, limit = 50, offset = 0, sort = 'createdAt', order = 'desc' } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (active !== undefined) {
      conditions.push(eq(campaigns.active, active === 'true'));
    }
    
    if (type) {
      conditions.push(eq(campaigns.type, type as any));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(campaigns.name, searchPattern),
          ilike(campaigns.description, searchPattern)
        )
      );
    }

    // Execute query
    const query = db
      .select()
      .from(campaigns)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    if (order === 'desc') {
      query.orderBy(desc(campaigns[sort as keyof typeof campaigns]));
    } else {
      query.orderBy(campaigns[sort as keyof typeof campaigns]);
    }

    const campaignList = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    // Get enrollment stats for each campaign
    const campaignIds = campaignList.map(c => c.id);
    let enrollmentStats = [];
    
    if (campaignIds.length > 0) {
      enrollmentStats = await db
        .select({
          campaignId: leadCampaignEnrollments.campaignId,
          totalLeads: sql<number>`count(*)::int`,
          activeLeads: sql<number>`count(*) filter (where status = 'active')::int`,
          completedLeads: sql<number>`count(*) filter (where completed = true)::int`
        })
        .from(leadCampaignEnrollments)
        .where(inArray(leadCampaignEnrollments.campaignId, campaignIds))
        .groupBy(leadCampaignEnrollments.campaignId);
    }

    // Merge stats with campaigns
    const campaignsWithStats = campaignList.map(campaign => {
      const stats = enrollmentStats.find(s => s.campaignId === campaign.id) || {
        totalLeads: 0,
        activeLeads: 0,
        completedLeads: 0
      };
      
      return {
        ...campaign,
        stats: {
          totalLeads: stats.totalLeads,
          activeLeads: stats.activeLeads,
          completedLeads: stats.completedLeads,
          conversionRate: stats.totalLeads > 0 
            ? (stats.completedLeads / stats.totalLeads * 100).toFixed(1) 
            : 0
        }
      };
    });

    res.json({
      success: true,
      campaigns: campaignsWithStats,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_FETCH_ERROR',
        message: 'Failed to fetch campaigns',
        category: 'database'
      }
    });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    // Get enrollment stats
    const stats = await db
      .select({
        totalLeads: sql<number>`count(*)::int`,
        activeLeads: sql<number>`count(*) filter (where status = 'active')::int`,
        completedLeads: sql<number>`count(*) filter (where completed = true)::int`
      })
      .from(leadCampaignEnrollments)
      .where(eq(leadCampaignEnrollments.campaignId, id));

    res.json({
      success: true,
      campaign: {
        ...campaign,
        stats: stats[0] || { totalLeads: 0, activeLeads: 0, completedLeads: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_FETCH_ERROR',
        message: 'Failed to fetch campaign',
        category: 'database'
      }
    });
  }
});

// Create campaign
const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['drip', 'blast', 'trigger']).default('drip'),
  targetCriteria: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Rate limiter for campaign creation
const createCampaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many campaigns created. Please try again later.'
});

router.post('/', createCampaignLimiter, validateRequest({ body: createCampaignSchema }), async (req, res) => {
  try {
    const campaignData = req.body;
    
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        ...campaignData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({
      success: true,
      campaign: newCampaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_CREATE_ERROR',
        message: 'Failed to create campaign',
        category: 'database'
      }
    });
  }
});

// Update campaign
const updateCampaignSchema = createCampaignSchema.partial();

router.put('/:id', validateRequest({ body: updateCampaignSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    res.json({
      success: true,
      campaign: updatedCampaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_UPDATE_ERROR',
        message: 'Failed to update campaign',
        category: 'database'
      }
    });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedCampaign] = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning();

    if (!deletedCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_DELETE_ERROR',
        message: 'Failed to delete campaign',
        category: 'database'
      }
    });
  }
});

// Toggle campaign active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    // Toggle status
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        active: !campaign.active,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, id))
      .returning();

    res.json({
      success: true,
      campaign: updatedCampaign
    });
  } catch (error) {
    console.error('Error toggling campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_TOGGLE_ERROR',
        message: 'Failed to toggle campaign status',
        category: 'database'
      }
    });
  }
});

// Assign leads to campaign
router.post('/:id/assign-leads', async (req, res) => {
  try {
    const { id } = req.params;
    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'leadIds must be a non-empty array'
        }
      });
    }

    // Check if campaign exists
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    // Enroll leads
    const enrollments = leadIds.map(leadId => ({
      leadId,
      campaignId: id,
      status: 'active' as const,
      currentStep: 0,
      completed: false,
      enrolledAt: new Date()
    }));

    await db
      .insert(leadCampaignEnrollments)
      .values(enrollments)
      .onConflictDoNothing();

    res.json({
      success: true,
      message: `${leadIds.length} leads assigned to campaign`
    });
  } catch (error) {
    console.error('Error assigning leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_ASSIGN_ERROR',
        message: 'Failed to assign leads to campaign',
        category: 'database'
      }
    });
  }
});

// Campaign execution trigger endpoint
const triggerCampaignSchema = z.object({
  campaignId: z.string().min(1),
  leadIds: z.array(z.string()).min(1),
  templates: z.array(z.object({
    subject: z.string(),
    body: z.string()
  })).optional()
});

router.post('/execution/trigger', validateRequest(triggerCampaignSchema), async (req, res) => {
  try {
    const { campaignId, leadIds, templates } = req.body;
    
    // Validate lead IDs to prevent SQL injection
    const validateId = (id: string): boolean => {
      // UUID v4 pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      // Custom ID pattern (lead_timestamp_random)
      const customPattern = /^[a-zA-Z]+_\d+_[a-zA-Z0-9]+$/;
      
      return uuidPattern.test(id) || customPattern.test(id);
    };
    
    if (!leadIds.every(validateId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LEAD_ID',
          message: 'Invalid lead ID format detected'
        }
      });
    }
    
    // Get lead details from database
    const leadDetails = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds))
      .limit(leadIds.length);
    
    if (leadDetails.length === 0) {
      throw new Error('No valid leads found');
    }
    
    // Send first template email to each lead
    const emailService = EmailServiceFactory.createServiceFromEnv();
    if (!emailService) {
      console.warn('Email service not configured, skipping email sending');
      res.json({
        success: true,
        message: `Campaign triggered for ${leadDetails.length} leads (email service not configured)`,
        data: {
          campaignId,
          leadCount: leadDetails.length,
          emailsSent: 0,
          executionId: `exec-${Date.now()}`
        }
      });
      return;
    }
    let emailsSent = 0;
    const errors: string[] = [];
    
    for (const lead of leadDetails) {
      try {
        // Use the first template if provided
        const template = templates && templates[0] ? templates[0] : {
          subject: 'Your Auto Loan Pre-Approval is Ready',
          body: `Hello ${lead.firstName || lead.email?.split('@')[0] || 'there'},\n\nGreat news! You've been pre-approved for an auto loan with competitive rates.`
        };
        
        const result = await emailService.sendEmail({
          to: lead.email,
          subject: template.subject,
          html: `<div style="font-family: Arial, sans-serif;">${template.body.replace(/\n/g, '<br>')}</div>`,
          text: template.body
        });
        
        if (result.success) {
          emailsSent++;
        } else {
          errors.push(`Failed to send to ${lead.email}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error sending to ${lead.email}: ${error}`);
      }
    }
    
    // Also trigger the campaign execution engine for follow-ups
    try {
      await campaignExecutionEngine.triggerCampaign(campaignId, leadIds);
    } catch (error) {
      console.error('Campaign execution engine error:', error);
    }
    
    res.json({
      success: true,
      message: `Campaign triggered for ${leadDetails.length} leads. ${emailsSent} emails sent.`,
      data: {
        campaignId,
        leadCount: leadDetails.length,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
        executionId: `exec-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Failed to trigger campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_TRIGGER_ERROR',
        message: 'Failed to trigger campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Clone campaign
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Get original campaign with all related data
    const [original] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    
    if (!original) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }
    
    // Create cloned campaign
    const [cloned] = await db
      .insert(campaigns)
      .values({
        ...original,
        id: undefined, // Let DB generate new ID
        name: name || `${original.name} (Copy)`,
        active: false, // Start cloned campaigns as inactive
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Get campaign steps from original
    const originalSteps = await db
      .select()
      .from(campaignSteps)
      .where(eq(campaignSteps.campaignId, id));
    
    // Clone campaign steps
    if (originalSteps.length > 0) {
      const clonedSteps = originalSteps.map(step => ({
        ...step,
        id: undefined,
        campaignId: cloned.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await db.insert(campaignSteps).values(clonedSteps);
    }
    
    res.status(201).json({
      success: true,
      campaign: cloned,
      message: 'Campaign cloned successfully'
    });
  } catch (error) {
    console.error('Error cloning campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_CLONE_ERROR',
        message: 'Failed to clone campaign',
        category: 'database'
      }
    });
  }
});

export default router;