import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { campaigns, leadCampaignEnrollments, leads } from '../db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import { campaignExecutor } from '../services/campaign-executor';

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
          conversionRate: 8.7,
        },
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
          conversionRate: 11.2,
        },
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
          conversionRate: 4.2,
        },
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
          conversionRate: 9.8,
        },
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
          conversionRate: 7.4,
        },
      },
    ];

    res.json({
      success: true,
      campaigns: campaigns.slice(0, Number(limit)),
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign metrics',
    });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const {
      active,
      type,
      search,
      limit = 50,
      offset = 0,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

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
      conditions.push(ilike(campaigns.name, searchPattern));
    }

    // Execute query - select only the most basic columns
    const query = db
      .select({
        id: campaigns.id,
        name: campaigns.name,
      })
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
          completedLeads: sql<number>`count(*) filter (where completed = true)::int`,
        })
        .from(leadCampaignEnrollments)
        .where(
          sql`campaign_id = ANY(${sql.raw(`ARRAY[${campaignIds.map(id => `'${id}'`).join(',')}]::text[]`)})`
        )
        .groupBy(leadCampaignEnrollments.campaignId);
    }

    // Merge stats with campaigns
    const campaignsWithStats = campaignList.map(campaign => {
      const stats = enrollmentStats.find(s => s.campaignId === campaign.id) || {
        totalLeads: 0,
        activeLeads: 0,
        completedLeads: 0,
      };

      return {
        ...campaign,
        stats: {
          totalLeads: stats.totalLeads,
          activeLeads: stats.activeLeads,
          completedLeads: stats.completedLeads,
          conversionRate:
            stats.totalLeads > 0
              ? ((stats.completedLeads / stats.totalLeads) * 100).toFixed(1)
              : 0,
        },
      };
    });

    res.json({
      success: true,
      campaigns: campaignsWithStats,
      total: count,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_FETCH_ERROR',
        message: 'Failed to fetch campaigns',
        category: 'database',
      },
    });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [campaign] = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
      })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Get enrollment stats
    const stats = await db
      .select({
        totalLeads: sql<number>`count(*)::int`,
        activeLeads: sql<number>`count(*) filter (where status = 'active')::int`,
        completedLeads: sql<number>`count(*) filter (where completed = true)::int`,
      })
      .from(leadCampaignEnrollments)
      .where(eq(leadCampaignEnrollments.campaignId, id));

    res.json({
      success: true,
      campaign: {
        ...campaign,
        stats: stats[0] || { totalLeads: 0, activeLeads: 0, completedLeads: 0 },
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_FETCH_ERROR',
        message: 'Failed to fetch campaign',
        category: 'database',
      },
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
  endDate: z.string().datetime().optional(),
});

router.post(
  '/',
  validateRequest({ body: createCampaignSchema }),
  async (req, res) => {
    try {
      const campaignData = req.body;

      // Create campaign data without description for now (schema mismatch)
      const { description, ...campaignDataWithoutDesc } = campaignData;

      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          name: campaignData.name,
          type: campaignData.type || 'drip',
          targetCriteria: campaignData.targetCriteria || {},
          settings: campaignData.settings || {},
          startDate: campaignData.startDate
            ? new Date(campaignData.startDate)
            : null,
          endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create leads from audience data if provided
      if (
        campaignData.audience &&
        campaignData.audience.contacts &&
        Array.isArray(campaignData.audience.contacts)
      ) {
        const contacts = campaignData.audience.contacts;

        for (const contact of contacts) {
          if (contact.email) {
            try {
              // Create or find existing lead
              const [lead] = await db
                .insert(leads)
                .values({
                  email: contact.email,
                  firstName: contact.firstName || contact['First Name'] || '',
                  lastName: contact.lastName || contact['Last Name'] || '',
                  customData: contact,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: leads.email,
                  set: {
                    firstName: contact.firstName || contact['First Name'] || '',
                    lastName: contact.lastName || contact['Last Name'] || '',
                    customData: contact,
                    updatedAt: new Date(),
                  },
                })
                .returning();

              // Enroll lead in campaign
              await db
                .insert(leadCampaignEnrollments)
                .values({
                  leadId: lead.id,
                  campaignId: newCampaign.id,
                  status: 'active',
                  enrolledAt: new Date(),
                })
                .onConflictDoNothing();
            } catch (leadError) {
              console.error(
                `Error creating lead for ${contact.email}:`,
                leadError
              );
              // Continue with other contacts
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        campaign: newCampaign,
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_CREATE_ERROR',
          message: 'Failed to create campaign',
          category: 'database',
        },
      });
    }
  }
);

// Update campaign
const updateCampaignSchema = createCampaignSchema.partial();

router.put(
  '/:id',
  validateRequest({ body: updateCampaignSchema }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updatedCampaign) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Campaign not found',
          },
        });
      }

      res.json({
        success: true,
        campaign: updatedCampaign,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_UPDATE_ERROR',
          message: 'Failed to update campaign',
          category: 'database',
        },
      });
    }
  }
);

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
          message: 'Campaign not found',
        },
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_DELETE_ERROR',
        message: 'Failed to delete campaign',
        category: 'database',
      },
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
          message: 'Campaign not found',
        },
      });
    }

    // Toggle status
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        active: !campaign.active,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    res.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Error toggling campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_TOGGLE_ERROR',
        message: 'Failed to toggle campaign status',
        category: 'database',
      },
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
          message: 'leadIds must be a non-empty array',
        },
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
          message: 'Campaign not found',
        },
      });
    }

    // Enroll leads
    const enrollments = leadIds.map(leadId => ({
      leadId,
      campaignId: id,
      status: 'active' as const,
      currentStep: 0,
      completed: false,
      enrolledAt: new Date(),
    }));

    await db
      .insert(leadCampaignEnrollments)
      .values(enrollments)
      .onConflictDoNothing();

    res.json({
      success: true,
      message: `${leadIds.length} leads assigned to campaign`,
    });
  } catch (error) {
    console.error('Error assigning leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_ASSIGN_ERROR',
        message: 'Failed to assign leads to campaign',
        category: 'database',
      },
    });
  }
});

// Launch campaign - start sending emails
router.post('/:id/launch', async (req, res) => {
  try {
    const campaignId = req.params.id;

    // Validate campaign exists
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    if (!campaign.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Launch campaign
    const result = await campaignExecutor.launchCampaign(campaignId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'LAUNCH_FAILED',
          message: result.message,
        },
      });
    }
  } catch (error) {
    console.error('Error launching campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LAUNCH_ERROR',
        message: 'Failed to launch campaign',
        category: 'server',
      },
    });
  }
});

// Get campaign execution status
router.get('/:id/status', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const status = campaignExecutor.getCampaignStatus(campaignId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting campaign status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get campaign status',
        category: 'server',
      },
    });
  }
});

// Stop campaign
router.post('/:id/stop', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const result = await campaignExecutor.stopCampaign(campaignId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'STOP_FAILED',
          message: result.message,
        },
      });
    }
  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STOP_ERROR',
        message: 'Failed to stop campaign',
        category: 'server',
      },
    });
  }
});

// Toggle campaign active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const campaignId = req.params.id;

    // Get current campaign
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    if (!campaign.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Toggle active status
    const newActiveStatus = !campaign[0].active;
    await db
      .update(campaigns)
      .set({ active: newActiveStatus, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    res.json({
      success: true,
      data: { active: newActiveStatus },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error toggling campaign status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOGGLE_ERROR',
        message: 'Failed to toggle campaign status',
        category: 'database',
      },
    });
  }
});

export default router;
