import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['overlord', 'email', 'sms', 'chat']),
  role: z.string().min(1).max(255),
  endGoal: z.string().min(1),
  instructions: z.object({
    dos: z.array(z.string()).min(1),
    donts: z.array(z.string()).min(1)
  }),
  domainExpertise: z.array(z.string()).optional(),
  personality: z.string().min(1),
  tone: z.string().min(1),
  responseLength: z.enum(['short', 'medium', 'long']).optional(),
  apiModel: z.string().optional(),
  temperature: z.number().min(0).max(100).optional(),
  maxTokens: z.number().min(50).max(4000).optional(),
  metadata: z.record(z.any()).optional()
});

const updateAgentSchema = createAgentSchema.partial().extend({
  active: z.boolean().optional()
});

const agentDecisionSchema = z.object({
  leadId: z.string(),
  agentType: z.string(),
  decision: z.string(),
  reasoning: z.string().optional(),
  context: z.record(z.any()).optional()
});

// Get all agent configurations
router.get('/', async (req, res) => {
  try {
    const { type, active, search, personality, tone, limit, offset } = req.query;
    
    // Mock agent data
    const agents = [
      {
        id: 'agent-1',
        name: 'Email Specialist',
        type: 'email',
        role: 'Lead Engagement Specialist',
        endGoal: 'Convert leads to qualified prospects through personalized email outreach',
        instructions: {
          dos: [
            'Personalize emails based on lead information',
            'Follow up within 24 hours of initial contact',
            'Provide value in every interaction',
            'Use clear call-to-actions'
          ],
          donts: [
            'Use aggressive sales tactics',
            'Send more than 3 follow-ups without response',
            'Make unrealistic promises',
            'Ignore lead preferences'
          ]
        },
        domainExpertise: ['Email Marketing', 'Lead Nurturing', 'Auto Loans'],
        personality: 'professional',
        tone: 'friendly',
        responseLength: 'medium',
        apiModel: 'gpt-4',
        temperature: 70,
        maxTokens: 500,
        active: true,
        performance: {
          conversations: 150,
          successfulOutcomes: 45,
          averageResponseTime: 5.2,
          satisfactionScore: 4.3
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'agent-2',
        name: 'SMS Outreach Agent',
        type: 'sms',
        role: 'Mobile Engagement Specialist',
        endGoal: 'Engage leads through concise, timely SMS communications',
        instructions: {
          dos: [
            'Keep messages under 160 characters',
            'Include clear opt-out instructions',
            'Use conversational tone',
            'Respond quickly to inbound messages'
          ],
          donts: [
            'Send messages outside business hours',
            'Use complex language or jargon',
            'Send too many messages in sequence',
            'Ignore compliance requirements'
          ]
        },
        domainExpertise: ['SMS Marketing', 'Mobile Communication', 'Compliance'],
        personality: 'casual',
        tone: 'conversational',
        responseLength: 'short',
        apiModel: 'gpt-3.5-turbo',
        temperature: 60,
        maxTokens: 150,
        active: type !== 'email',
        performance: {
          conversations: 200,
          successfulOutcomes: 75,
          averageResponseTime: 2.1,
          satisfactionScore: 4.1
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'agent-3',
        name: 'Chat Support Agent',
        type: 'chat',
        role: 'Real-time Customer Support',
        endGoal: 'Provide immediate assistance and guide leads through the qualification process',
        instructions: {
          dos: [
            'Respond immediately to chat messages',
            'Ask qualifying questions naturally',
            'Provide helpful resources',
            'Escalate complex issues appropriately'
          ],
          donts: [
            'Keep leads waiting',
            'Use scripted responses excessively',
            'Promise what you cannot deliver',
            'End conversations abruptly'
          ]
        },
        domainExpertise: ['Live Chat', 'Customer Service', 'Lead Qualification'],
        personality: 'helpful',
        tone: 'supportive',
        responseLength: 'medium',
        apiModel: 'gpt-4',
        temperature: 75,
        maxTokens: 300,
        active: type !== 'email' && type !== 'sms',
        performance: {
          conversations: 300,
          successfulOutcomes: 120,
          averageResponseTime: 1.5,
          satisfactionScore: 4.5
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'agent-4',
        name: 'Overlord Agent',
        type: 'overlord',
        role: 'Master Coordinator',
        endGoal: 'Orchestrate multi-channel campaigns and optimize lead engagement across all touchpoints',
        instructions: {
          dos: [
            'Monitor all channel performance',
            'Coordinate between agents',
            'Optimize timing and messaging',
            'Track lead journey progression'
          ],
          donts: [
            'Override agent specializations without reason',
            'Create conflicting messages across channels',
            'Ignore lead preferences',
            'Make decisions without data'
          ]
        },
        domainExpertise: ['Campaign Management', 'Multi-channel Coordination', 'Analytics'],
        personality: 'analytical',
        tone: 'strategic',
        responseLength: 'long',
        apiModel: 'gpt-4',
        temperature: 80,
        maxTokens: 1000,
        active: type !== 'email' && type !== 'sms' && type !== 'chat',
        performance: {
          conversations: 50,
          successfulOutcomes: 35,
          averageResponseTime: 3.0,
          satisfactionScore: 4.7
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Apply filters
    let filteredAgents = agents;
    if (type) {
      filteredAgents = filteredAgents.filter(agent => agent.type === type);
    }
    if (active === 'true') {
      filteredAgents = filteredAgents.filter(agent => agent.active);
    } else if (active === 'false') {
      filteredAgents = filteredAgents.filter(agent => !agent.active);
    }
    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredAgents = filteredAgents.filter(agent => 
        agent.name.toLowerCase().includes(searchLower) ||
        agent.role.toLowerCase().includes(searchLower) ||
        agent.type.toLowerCase().includes(searchLower)
      );
    }
    if (personality) {
      filteredAgents = filteredAgents.filter(agent => agent.personality === personality);
    }
    if (tone) {
      filteredAgents = filteredAgents.filter(agent => agent.tone === tone);
    }

    // Apply pagination
    let paginatedAgents = filteredAgents;
    if (limit || offset) {
      const start = parseInt(offset as string) || 0;
      const end = start + (parseInt(limit as string) || filteredAgents.length);
      paginatedAgents = filteredAgents.slice(start, end);
    }

    res.json({
      success: true,
      agents: paginatedAgents,
      total: filteredAgents.length,
      offset: parseInt(offset as string) || 0,
      limit: parseInt(limit as string) || filteredAgents.length
    });
  } catch (error) {
    console.error('Error fetching agent configurations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_FETCH_ERROR',
        message: 'Failed to fetch agent configurations',
        category: 'database'
      }
    });
  }
});

// Get agents by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['overlord', 'email', 'sms', 'chat'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid agent type',
          validTypes
        }
      });
    }

    // Mock filtered agents by type
    const agentsByType = {
      email: [
        {
          id: 'agent-1',
          name: 'Email Specialist',
          type: 'email',
          role: 'Lead Engagement Specialist',
          active: true,
          capabilities: { email: true, sms: false, chat: false }
        }
      ],
      sms: [
        {
          id: 'agent-2',
          name: 'SMS Outreach Agent',
          type: 'sms',
          role: 'Mobile Engagement Specialist',
          active: true,
          capabilities: { email: false, sms: true, chat: false }
        }
      ],
      chat: [
        {
          id: 'agent-3',
          name: 'Chat Support Agent',
          type: 'chat',
          role: 'Real-time Customer Support',
          active: true,
          capabilities: { email: false, sms: false, chat: true }
        }
      ],
      overlord: [
        {
          id: 'agent-4',
          name: 'Overlord Agent',
          type: 'overlord',
          role: 'Master Coordinator',
          active: true,
          capabilities: { email: true, sms: true, chat: true }
        }
      ]
    };

    res.json({
      success: true,
      agents: agentsByType[type as keyof typeof agentsByType] || []
    });
  } catch (error) {
    console.error('Error fetching agents by type:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_TYPE_FETCH_ERROR',
        message: 'Failed to fetch agents by type',
        category: 'database'
      }
    });
  }
});

// Get single agent configuration
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock agent lookup
    const agent = {
      id,
      name: 'Sample Agent',
      type: 'email',
      role: 'Sample Role',
      endGoal: 'Sample goal',
      instructions: {
        dos: ['Be helpful'],
        donts: ['Be pushy']
      },
      domainExpertise: ['Email Marketing'],
      personality: 'professional',
      tone: 'friendly',
      responseLength: 'medium',
      apiModel: 'gpt-4',
      temperature: 70,
      maxTokens: 500,
      active: true,
      performance: {
        conversations: 100,
        successfulOutcomes: 30,
        averageResponseTime: 4.5,
        satisfactionScore: 4.2
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching agent configuration:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_FETCH_ERROR',
        message: 'Failed to fetch agent configuration',
        category: 'database'
      }
    });
  }
});

// Create agent configuration
router.post('/', async (req, res) => {
  try {
    const validationResult = createAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid agent data',
          details: validationResult.error.errors
        }
      });
    }

    const agent = {
      id: `agent-${Date.now()}`,
      ...validationResult.data,
      active: true,
      performance: {
        conversations: 0,
        successfulOutcomes: 0,
        averageResponseTime: 0,
        satisfactionScore: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error creating agent configuration:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_CREATE_ERROR',
        message: 'Failed to create agent configuration',
        category: 'database'
      }
    });
  }
});

// Update agent configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = updateAgentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid agent data',
          details: validationResult.error.errors
        }
      });
    }

    const agent = {
      id,
      ...validationResult.data,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_UPDATE_ERROR',
        message: 'Failed to update agent configuration',
        category: 'database'
      }
    });
  }
});

// Toggle agent active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = {
      id,
      name: 'Sample Agent',
      active: true, // Mock toggle
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      agent,
      message: `Agent ${agent.active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_TOGGLE_ERROR',
        message: 'Failed to toggle agent status',
        category: 'database'
      }
    });
  }
});

// Delete agent configuration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Agent configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent configuration:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_DELETE_ERROR',
        message: 'Failed to delete agent configuration',
        category: 'database'
      }
    });
  }
});

// Clone agent configuration
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New agent name is required'
        }
      });
    }

    const cloned = {
      id: `agent-${Date.now()}`,
      name,
      type: 'email',
      role: 'Cloned Agent',
      endGoal: 'Sample cloned goal',
      instructions: {
        dos: ['Be helpful'],
        donts: ['Be pushy']
      },
      personality: 'professional',
      tone: 'friendly',
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      agent: cloned,
      message: 'Agent configuration cloned successfully'
    });
  } catch (error) {
    console.error('Error cloning agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_CLONE_ERROR',
        message: 'Failed to clone agent configuration',
        category: 'database'
      }
    });
  }
});

// Get agent performance stats
router.get('/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = {
      agentId: id,
      agentName: 'Sample Agent',
      agentType: 'email',
      performance: {
        conversations: 150,
        successfulOutcomes: 45,
        averageResponseTime: 5.2,
        satisfactionScore: 4.3
      },
      trends: {
        conversationsThisWeek: 25,
        successRateThisWeek: 0.32,
        responseTimeImprovement: -0.5
      }
    };

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PERFORMANCE_FETCH_ERROR',
        message: 'Failed to fetch agent performance',
        category: 'database'
      }
    });
  }
});

// Get top performing agents
router.get('/performance/top', async (req, res) => {
  try {
    const { metric = 'satisfactionScore', limit = '10' } = req.query;
    const validMetrics = ['satisfactionScore', 'conversations', 'successfulOutcomes'];
    
    if (!validMetrics.includes(metric as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_METRIC',
          message: 'Invalid metric',
          validMetrics
        }
      });
    }

    const topAgents = [
      {
        id: 'agent-4',
        name: 'Overlord Agent',
        type: 'overlord',
        satisfactionScore: 4.7,
        conversations: 50,
        successfulOutcomes: 35
      },
      {
        id: 'agent-3',
        name: 'Chat Support Agent',
        type: 'chat',
        satisfactionScore: 4.5,
        conversations: 300,
        successfulOutcomes: 120
      },
      {
        id: 'agent-1',
        name: 'Email Specialist',
        type: 'email',
        satisfactionScore: 4.3,
        conversations: 150,
        successfulOutcomes: 45
      }
    ];

    res.json({
      success: true,
      agents: topAgents.slice(0, parseInt(limit as string)),
      metric
    });
  } catch (error) {
    console.error('Error fetching top performing agents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOP_AGENTS_ERROR',
        message: 'Failed to fetch top performing agents',
        category: 'database'
      }
    });
  }
});

// Generate prompt from agent configuration
router.post('/:id/generate-prompt', async (req, res) => {
  try {
    const { id } = req.params;
    const context = req.body.context || {};
    
    // Mock prompt generation
    const prompt = `You are an AI assistant specialized in ${context.domain || 'customer service'}. 
Your role is to be professional and helpful while following these guidelines:
- Be conversational and engaging
- Focus on providing value to the customer
- Ask clarifying questions when needed
- Keep responses concise but informative`;

    res.json({
      success: true,
      data: {
        prompt,
        agentId: id,
        agentName: 'Sample Agent',
        temperature: 70,
        maxTokens: 500,
        context
      }
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROMPT_GENERATION_ERROR',
        message: 'Failed to generate prompt',
        category: 'processing'
      }
    });
  }
});

// Get active agent by type
router.get('/active/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['overlord', 'email', 'sms', 'chat'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid agent type',
          validTypes
        }
      });
    }

    // Mock active agent lookup
    const activeAgents = {
      email: {
        id: 'agent-1',
        name: 'Email Specialist',
        type: 'email',
        role: 'Lead Engagement Specialist',
        active: true
      },
      sms: {
        id: 'agent-2',
        name: 'SMS Outreach Agent',
        type: 'sms',
        role: 'Mobile Engagement Specialist',
        active: true
      },
      chat: {
        id: 'agent-3',
        name: 'Chat Support Agent',
        type: 'chat',
        role: 'Real-time Customer Support',
        active: true
      },
      overlord: {
        id: 'agent-4',
        name: 'Overlord Agent',
        type: 'overlord',
        role: 'Master Coordinator',
        active: true
      }
    };

    const agent = activeAgents[type as keyof typeof activeAgents];
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_AGENT',
          message: `No active ${type} agent found`,
          suggestion: 'Please configure and activate an agent of this type'
        }
      });
    }

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching active agent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIVE_AGENT_ERROR',
        message: 'Failed to fetch active agent',
        category: 'database'
      }
    });
  }
});

// Agent Decisions endpoints
router.get('/decisions/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const decisions = [
      {
        id: 'decision-1',
        leadId,
        agentType: 'email',
        decision: 'send_follow_up',
        reasoning: 'Lead opened previous email but did not respond',
        context: { emailOpenRate: 1, lastContactDays: 2 },
        timestamp: new Date().toISOString()
      },
      {
        id: 'decision-2',
        leadId,
        agentType: 'overlord',
        decision: 'escalate_to_human',
        reasoning: 'Lead expressed specific technical questions',
        context: { conversationTurns: 5, technicalQuestions: true },
        timestamp: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      decisions
    });
  } catch (error) {
    console.error('Error fetching decisions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DECISIONS_FETCH_ERROR',
        message: 'Failed to fetch decisions',
        category: 'database'
      }
    });
  }
});

router.get('/decisions/lead/:leadId/timeline', async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const timeline = [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        agentType: 'email',
        decision: 'initial_contact',
        outcome: 'email_sent'
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        agentType: 'email',
        decision: 'track_engagement',
        outcome: 'email_opened'
      },
      {
        timestamp: new Date().toISOString(),
        agentType: 'overlord',
        decision: 'coordinate_follow_up',
        outcome: 'sms_scheduled'
      }
    ];

    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Error fetching decision timeline:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TIMELINE_FETCH_ERROR',
        message: 'Failed to fetch decision timeline',
        category: 'database'
      }
    });
  }
});

router.post('/decisions', async (req, res) => {
  try {
    const validationResult = agentDecisionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid decision data',
          details: validationResult.error.errors
        }
      });
    }

    const { leadId, agentType, decision, reasoning, context } = validationResult.data;
    
    const decisionRecord = {
      id: `decision-${Date.now()}`,
      leadId,
      agentType,
      decision,
      reasoning,
      context,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      decision: decisionRecord
    });
  } catch (error) {
    console.error('Error creating decision:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DECISION_CREATE_ERROR',
        message: 'Failed to create decision',
        category: 'database'
      }
    });
  }
});

router.get('/decisions/stats', async (req, res) => {
  try {
    const stats = {
      totalDecisions: 1250,
      decisionsByType: {
        email: 450,
        sms: 320,
        chat: 280,
        overlord: 200
      },
      decisionsByOutcome: {
        successful: 875,
        pending: 200,
        failed: 175
      },
      averageDecisionTime: 2.3,
      topDecisions: [
        { decision: 'send_follow_up', count: 320 },
        { decision: 'schedule_call', count: 180 },
        { decision: 'escalate_to_human', count: 95 }
      ]
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching decision stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DECISION_STATS_ERROR',
        message: 'Failed to fetch decision stats',
        category: 'database'
      }
    });
  }
});

// Available agents for multi-agent campaigns
router.get('/available', async (req, res) => {
  try {
    const agents = [
      {
        id: 'agent-1',
        name: 'Email Specialist',
        type: 'email',
        active: true,
        capabilities: { email: true, sms: false, chat: false }
      },
      {
        id: 'agent-2',
        name: 'SMS Outreach Agent',
        type: 'sms',
        active: true,
        capabilities: { email: false, sms: true, chat: false }
      },
      {
        id: 'agent-3',
        name: 'Chat Support Agent',
        type: 'chat',
        active: true,
        capabilities: { email: false, sms: false, chat: true }
      },
      {
        id: 'agent-4',
        name: 'Overlord Agent',
        type: 'overlord',
        active: true,
        capabilities: { email: true, sms: true, chat: true }
      }
    ];

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error fetching available agents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AVAILABLE_AGENTS_ERROR',
        message: 'Failed to fetch available agents',
        category: 'database'
      }
    });
  }
});

export default router;