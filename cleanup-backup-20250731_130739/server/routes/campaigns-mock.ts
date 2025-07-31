import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const campaignSettingsSchema = z.object({
  goals: z.array(z.string()).min(1),
  qualificationCriteria: z.object({
    minScore: z.number().min(0).max(100),
    requiredFields: z.array(z.string()),
    requiredGoals: z.array(z.string())
  }),
  handoverCriteria: z.object({
    qualificationScore: z.number().min(0).max(100),
    conversationLength: z.number().min(1),
    timeThreshold: z.number().min(1),
    keywordTriggers: z.array(z.string()),
    goalCompletionRequired: z.array(z.string()),
    handoverRecipients: z.array(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.string(),
      priority: z.enum(['high', 'medium', 'low'])
    }))
  }),
  channelPreferences: z.object({
    primary: z.enum(['email', 'sms', 'chat']),
    fallback: z.array(z.enum(['email', 'sms', 'chat']))
  }),
  touchSequence: z.array(
    z.object({
      templateId: z.string().min(1),
      delayDays: z.number().min(0),
      delayHours: z.number().min(0).max(23),
      conditions: z.any().optional(),
    })
  ),
  assignedAgents: z.array(z.object({
    agentId: z.string(),
    channels: z.array(z.enum(['email', 'sms', 'chat'])),
    role: z.enum(['primary', 'secondary', 'fallback']),
    capabilities: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      chat: z.boolean()
    })
  })).optional(),
  coordinationStrategy: z.enum(['round_robin', 'priority_based', 'channel_specific']).optional(),
  messageCoordination: z.object({
    allowMultipleAgents: z.boolean(),
    messageGap: z.number().min(1).max(1440),
    handoffEnabled: z.boolean(),
    syncSchedules: z.boolean()
  }).optional()
});

const campaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  settings: campaignSettingsSchema,
  selectedLeads: z.array(z.string()).optional(),
  active: z.boolean().default(true)
});

const updateCampaignSchema = campaignSchema.partial();

const triggerCampaignSchema = z.object({
  campaignId: z.string().min(1),
  leadIds: z.array(z.string()).min(1),
  templateSequence: z.array(z.string()).optional()
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { active, limit, offset, type } = req.query;
    
    // Mock campaign data
    const campaigns = [
      {
        id: 'campaign-1',
        name: 'Auto Loan Outreach',
        description: 'Primary campaign for auto loan leads',
        type: type === 'multi-agent' ? 'multi-agent' : 'standard',
        status: 'active',
        settings: {
          goals: ['Convert leads to applications'],
          qualificationCriteria: {
            minScore: 60,
            requiredFields: ['email', 'phone'],
            requiredGoals: ['interested']
          },
          handoverCriteria: {
            qualificationScore: 80,
            conversationLength: 5,
            timeThreshold: 30,
            keywordTriggers: ['ready', 'apply', 'interested'],
            goalCompletionRequired: ['qualified'],
            handoverRecipients: [
              {
                name: 'Sales Team',
                email: 'sales@company.com',
                role: 'Sales Representative',
                priority: 'high'
              }
            ]
          },
          channelPreferences: {
            primary: 'email',
            fallback: ['sms', 'chat']
          },
          touchSequence: [
            { templateId: 'template-1', delayDays: 0, delayHours: 0 },
            { templateId: 'template-2', delayDays: 1, delayHours: 0 },
            { templateId: 'template-1', delayDays: 3, delayHours: 0 }
          ],
          ...(type === 'multi-agent' && {
            assignedAgents: [
              {
                agentId: 'agent-1',
                channels: ['email'],
                role: 'primary',
                capabilities: { email: true, sms: false, chat: false }
              },
              {
                agentId: 'agent-2',
                channels: ['sms'],
                role: 'secondary',
                capabilities: { email: false, sms: true, chat: false }
              }
            ],
            coordinationStrategy: 'channel_specific',
            messageCoordination: {
              allowMultipleAgents: true,
              messageGap: 60,
              handoffEnabled: true,
              syncSchedules: true
            }
          })
        },
        stats: {
          totalLeads: 150,
          emailsSent: 450,
          opensCount: 180,
          clicksCount: 45,
          repliesCount: 12,
          conversionsCount: 8
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'campaign-2',
        name: 'Credit Repair Follow-up',
        description: 'Follow-up campaign for credit repair leads',
        type: 'standard',
        status: active === 'true' ? 'active' : 'draft',
        settings: {
          goals: ['Educate about credit repair'],
          qualificationCriteria: {
            minScore: 50,
            requiredFields: ['email'],
            requiredGoals: ['interested']
          },
          handoverCriteria: {
            qualificationScore: 70,
            conversationLength: 3,
            timeThreshold: 60,
            keywordTriggers: ['help', 'assistance'],
            goalCompletionRequired: ['educated'],
            handoverRecipients: []
          },
          channelPreferences: {
            primary: 'email',
            fallback: ['sms']
          },
          touchSequence: []
        },
        stats: {
          totalLeads: 75,
          emailsSent: 150,
          opensCount: 60,
          clicksCount: 15,
          repliesCount: 5,
          conversionsCount: 2
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    let filteredCampaigns = campaigns;
    if (active === 'true') {
      filteredCampaigns = campaigns.filter(c => c.status === 'active');
    }
    if (type) {
      filteredCampaigns = filteredCampaigns.filter(c => c.type === type);
    }

    // Apply pagination
    let paginatedCampaigns = filteredCampaigns;
    if (limit || offset) {
      const start = parseInt(offset as string) || 0;
      const end = start + (parseInt(limit as string) || filteredCampaigns.length);
      paginatedCampaigns = filteredCampaigns.slice(start, end);
    }

    res.json({
      success: true,
      campaigns: paginatedCampaigns,
      total: filteredCampaigns.length,
      offset: parseInt(offset as string) || 0,
      limit: parseInt(limit as string) || filteredCampaigns.length
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

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock campaign lookup
    const campaign = {
      id,
      name: 'Sample Campaign',
      description: 'Sample campaign description',
      type: 'standard',
      status: 'active',
      settings: {
        goals: ['Convert leads'],
        qualificationCriteria: {
          minScore: 60,
          requiredFields: ['email'],
          requiredGoals: ['interested']
        },
        handoverCriteria: {
          qualificationScore: 80,
          conversationLength: 5,
          timeThreshold: 30,
          keywordTriggers: ['ready'],
          goalCompletionRequired: ['qualified'],
          handoverRecipients: []
        },
        channelPreferences: {
          primary: 'email',
          fallback: ['sms']
        },
        touchSequence: []
      },
      stats: {
        totalLeads: 100,
        emailsSent: 200,
        opensCount: 80,
        clicksCount: 20,
        repliesCount: 5,
        conversionsCount: 3
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      campaign,
      stats: campaign.stats
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
router.post('/', async (req, res) => {
  try {
    const validationResult = campaignSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid campaign data',
          details: validationResult.error.errors
        }
      });
    }

    const { name, description, settings, active } = validationResult.data;
    
    const campaign = {
      id: `campaign-${Date.now()}`,
      name,
      description,
      type: settings.assignedAgents ? 'multi-agent' : 'standard',
      status: active ? 'active' : 'draft',
      settings,
      stats: {
        totalLeads: 0,
        emailsSent: 0,
        opensCount: 0,
        clicksCount: 0,
        repliesCount: 0,
        conversionsCount: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      campaign
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = updateCampaignSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid campaign data',
          details: validationResult.error.errors
        }
      });
    }

    const updates = validationResult.data;
    const campaign = {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      campaign
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

// Toggle campaign active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = {
      id,
      name: 'Sample Campaign',
      active: true, // Mock toggle logic
      status: 'active',
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      campaign,
      message: `Campaign ${campaign.active ? 'activated' : 'deactivated'} successfully`
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

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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

// Clone campaign
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New campaign name is required'
        }
      });
    }

    const cloned = {
      id: `campaign-${Date.now()}`,
      name,
      description: 'Cloned campaign',
      type: 'standard',
      status: 'draft',
      settings: {
        goals: ['Convert leads'],
        qualificationCriteria: {
          minScore: 60,
          requiredFields: ['email'],
          requiredGoals: ['interested']
        },
        handoverCriteria: {
          qualificationScore: 80,
          conversationLength: 5,
          timeThreshold: 30,
          keywordTriggers: ['ready'],
          goalCompletionRequired: ['qualified'],
          handoverRecipients: []
        },
        channelPreferences: {
          primary: 'email',
          fallback: ['sms']
        },
        touchSequence: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

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

// Get campaign statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = {
      campaignId: id,
      totalLeads: 150,
      emailsSent: 450,
      opensCount: 180,
      clicksCount: 45,
      repliesCount: 12,
      conversionsCount: 8,
      openRate: 0.4,
      clickRate: 0.25,
      replyRate: 0.067,
      conversionRate: 0.053,
      topPerformingTemplates: [
        { templateId: '1', name: 'Welcome Series', openRate: 0.45 },
        { templateId: '2', name: 'Follow-up', openRate: 0.38 }
      ],
      engagement: {
        byDay: Array.from({ length: 7 }, (_, i) => ({
          day: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          opens: Math.floor(Math.random() * 30) + 10,
          clicks: Math.floor(Math.random() * 15) + 5
        }))
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_ERROR',
        message: 'Failed to fetch campaign statistics',
        category: 'database'
      }
    });
  }
});

// Campaign execution endpoints
router.post('/execution/trigger', async (req, res) => {
  try {
    const validationResult = triggerCampaignSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid trigger data',
          details: validationResult.error.errors
        }
      });
    }

    const { campaignId, leadIds, templateSequence } = validationResult.data;

    res.json({
      success: true,
      message: `Campaign triggered for ${leadIds.length} leads`,
      data: {
        campaignId,
        leadCount: leadIds.length,
        templateCount: templateSequence?.length || 'default',
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
        category: 'processing'
      }
    });
  }
});

router.post('/execution/auto-assign', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Auto-assignment completed',
      data: {
        assignedLeads: 25,
        campaigns: 3
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to auto-assign leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTO_ASSIGN_ERROR',
        message: 'Failed to auto-assign leads',
        category: 'processing'
      }
    });
  }
});

router.get('/execution/stats/:campaignId?', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const stats = {
      total: 100,
      scheduled: 25,
      executing: 5,
      completed: 65,
      failed: 5,
      campaignId: campaignId || 'all'
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get execution stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_STATS_ERROR',
        message: 'Failed to get execution statistics',
        category: 'database'
      }
    });
  }
});

// Multi-agent campaign specific endpoints
router.get('/multi-agent', async (req, res) => {
  try {
    const { active, limit, offset } = req.query;
    
    // Filter for multi-agent campaigns only
    const multiAgentCampaigns = [
      {
        id: 'multi-campaign-1',
        name: 'Multi-Channel Outreach',
        description: 'Campaign with multiple agents across channels',
        type: 'multi-agent',
        status: 'active',
        settings: {
          goals: ['Convert leads via multiple touchpoints'],
          assignedAgents: [
            {
              agentId: 'agent-1',
              channels: ['email'],
              role: 'primary',
              capabilities: { email: true, sms: false, chat: false }
            },
            {
              agentId: 'agent-2', 
              channels: ['sms'],
              role: 'secondary',
              capabilities: { email: false, sms: true, chat: false }
            }
          ],
          coordinationStrategy: 'channel_specific',
          messageCoordination: {
            allowMultipleAgents: true,
            messageGap: 60,
            handoffEnabled: true,
            syncSchedules: true
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    let filteredCampaigns = multiAgentCampaigns;
    if (active === 'true') {
      filteredCampaigns = multiAgentCampaigns.filter(c => c.status === 'active');
    }

    res.json({
      success: true,
      campaigns: filteredCampaigns,
      total: filteredCampaigns.length
    });
  } catch (error) {
    console.error('Error fetching multi-agent campaigns:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MULTI_AGENT_FETCH_ERROR',
        message: 'Failed to fetch multi-agent campaigns',
        category: 'database'
      }
    });
  }
});

router.get('/:id/coordination', async (req, res) => {
  try {
    const { id } = req.params;
    
    const coordination = {
      campaignId: id,
      strategy: 'channel_specific',
      activeAgents: [
        { agentId: 'agent-1', channel: 'email', status: 'active', lastAction: new Date().toISOString() },
        { agentId: 'agent-2', channel: 'sms', status: 'standby', lastAction: null }
      ],
      messageGap: 60,
      syncSchedules: true
    };

    res.json({
      success: true,
      coordination
    });
  } catch (error) {
    console.error('Error fetching coordination status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COORDINATION_ERROR',
        message: 'Failed to fetch coordination status',
        category: 'processing'
      }
    });
  }
});

router.post('/:id/coordinate-lead', async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId, strategy } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Lead ID is required'
        }
      });
    }

    const coordinations = [
      {
        agentId: 'agent-1',
        channel: 'email',
        scheduledFor: new Date().toISOString(),
        action: 'send_welcome_email'
      },
      {
        agentId: 'agent-2',
        channel: 'sms',
        scheduledFor: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        action: 'send_follow_up_sms'
      }
    ];

    res.json({
      success: true,
      coordinations,
      message: `Coordinated ${coordinations.length} agent actions for lead ${leadId}`
    });
  } catch (error) {
    console.error('Error coordinating agents for lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_COORDINATION_ERROR',
        message: 'Failed to coordinate agents for lead',
        category: 'processing'
      }
    });
  }
});

// Get available leads for campaign assignment
router.get('/available-leads', async (req, res) => {
  try {
    const availableLeads = [
      {
        id: 'lead-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        source: 'website',
        createdAt: new Date().toISOString()
      },
      {
        id: 'lead-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        source: 'referral',
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      leads: availableLeads,
      total: availableLeads.length
    });
  } catch (error) {
    console.error('Error fetching available leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEADS_FETCH_ERROR',
        message: 'Failed to fetch available leads',
        category: 'database'
      }
    });
  }
});

export default router;