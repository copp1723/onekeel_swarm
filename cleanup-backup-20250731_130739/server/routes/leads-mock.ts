import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const leadsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  source: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  campaignId: z.string().optional()
});

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  qualificationScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional(),
  campaignId: z.string().optional()
});

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.string().default('manual'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  metadata: z.record(z.any()).optional(),
  campaignId: z.string().optional()
});

const sendMessageSchema = z.object({
  channel: z.enum(['email', 'sms', 'chat']),
  content: z.string().min(1),
  subject: z.string().optional()
});

// Mock leads data
const mockLeads = [
  {
    id: 'lead-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0101',
    status: 'new',
    source: 'website',
    qualificationScore: 75,
    campaignId: 'campaign-1',
    metadata: {
      loanType: 'auto',
      creditScore: 720,
      income: 75000
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0102',
    status: 'contacted',
    source: 'referral',
    qualificationScore: 85,
    campaignId: 'campaign-1',
    metadata: {
      loanType: 'personal',
      creditScore: 780,
      income: 95000
    },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1-555-0103',
    status: 'qualified',
    source: 'advertisement',
    qualificationScore: 95,
    campaignId: 'campaign-2',
    metadata: {
      loanType: 'mortgage',
      creditScore: 810,
      income: 120000
    },
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Get all leads with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const validationResult = leadsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      });
    }

    const { limit, offset, status, source, startDate, endDate, search, campaignId } = validationResult.data;
    
    // Apply filters
    let filteredLeads = [...mockLeads];
    
    if (status) {
      filteredLeads = filteredLeads.filter(lead => lead.status === status);
    }
    
    if (source) {
      filteredLeads = filteredLeads.filter(lead => lead.source === source);
    }
    
    if (campaignId) {
      filteredLeads = filteredLeads.filter(lead => lead.campaignId === campaignId);
    }
    
    // Date filtering
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        if (start && leadDate < start) return false;
        if (end && leadDate > end) return false;
        return true;
      });
    }
    
    // Search filtering
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.firstName?.toLowerCase().includes(searchTerm) ||
        lead.lastName?.toLowerCase().includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm) ||
        lead.phone?.includes(searchTerm) ||
        lead.source?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const total = filteredLeads.length;
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);
    
    res.json({
      success: true,
      leads: paginatedLeads,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEADS_FETCH_ERROR',
        message: 'Failed to fetch leads',
        category: 'database'
      }
    });
  }
});

// Get lead statistics
router.get('/stats', async (req, res) => {
  try {
    const statusCounts = mockLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = mockLeads.length;
    const recentLeads = mockLeads
      .filter(lead => new Date(lead.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;
    
    const stats = {
      total,
      byStatus: statusCounts,
      recent: recentLeads,
      averageScore: Math.round(mockLeads.reduce((sum, lead) => sum + lead.qualificationScore, 0) / total),
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch lead statistics',
        category: 'database'
      }
    });
  }
});

// Get lead statistics summary (alias for compatibility)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = mockLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = mockLeads.length;
    const recentLeads = mockLeads
      .filter(lead => new Date(lead.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    res.json({
      success: true,
      data: {
        total,
        statusCounts,
        recentLeads
      }
    });
  } catch (error) {
    console.error('Failed to fetch lead statistics:', error);
    // Return empty stats on error to prevent crashes
    res.json({
      success: true,
      data: {
        total: 0,
        statusCounts: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
        recentLeads: []
      }
    });
  }
});

// Get single lead by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = mockLeads.find(l => l.id === id);
    
    if (!lead) {
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
      lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_FETCH_ERROR',
        message: 'Failed to fetch lead',
        category: 'database'
      }
    });
  }
});

// Get comprehensive lead details
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = mockLeads.find(l => l.id === id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }
    
    // Mock related data
    const conversations = [
      {
        id: 'conv-1',
        leadId: id,
        channel: 'email',
        agentType: 'email',
        status: 'active',
        messages: [
          {
            role: 'agent',
            content: 'Hello! Thank you for your interest in our services.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            role: 'lead',
            content: 'Hi, I\'m interested in getting a loan.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ],
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endedAt: null
      }
    ];
    
    const communications = [
      {
        id: 'comm-1',
        leadId: id,
        channel: 'email',
        direction: 'outbound',
        content: 'Welcome email sent',
        status: 'delivered',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm-2',
        leadId: id,
        channel: 'email',
        direction: 'inbound',
        content: 'Reply received',
        status: 'received',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const decisions = [
      {
        id: 'decision-1',
        leadId: id,
        agentType: 'email',
        decision: 'send_follow_up',
        reasoning: 'Lead showed interest in initial email',
        context: { openRate: 1, responseTime: 3600 },
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
    
    // Calculate engagement metrics
    const engagementMetrics = {
      totalInteractions: communications.length,
      emailsSent: communications.filter(c => c.channel === 'email' && c.direction === 'outbound').length,
      emailsReceived: communications.filter(c => c.channel === 'email' && c.direction === 'inbound').length,
      smsSent: communications.filter(c => c.channel === 'sms' && c.direction === 'outbound').length,
      smsReceived: communications.filter(c => c.channel === 'sms' && c.direction === 'inbound').length,
      chatMessages: conversations.filter(c => c.channel === 'chat').reduce((sum, c) => sum + c.messages.length, 0),
      lastContactDate: communications.length > 0 
        ? communications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null
    };
    
    res.json({
      success: true,
      data: {
        lead,
        conversations,
        communications,
        decisions,
        engagementMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_DETAILS_ERROR',
        message: 'Failed to fetch lead details',
        category: 'database'
      }
    });
  }
});

// Get lead conversation history
router.get('/:id/conversations', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock conversations for the lead
    const conversations = [
      {
        id: 'conv-1',
        leadId: id,
        channel: 'email',
        agentType: 'email',
        status: 'active',
        messages: [
          {
            role: 'agent',
            content: 'Hello! Thank you for your interest in our services.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            role: 'lead',
            content: 'Hi, I\'m interested in getting a loan.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ],
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endedAt: null,
        messageCount: 2,
        duration: null
      }
    ];
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATIONS_ERROR',
        message: 'Failed to fetch conversations',
        category: 'database'
      }
    });
  }
});

// Get lead timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock timeline events
    const timeline = [
      {
        type: 'communication',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        channel: 'email',
        direction: 'outbound',
        status: 'delivered',
        content: 'Welcome email sent...'
      },
      {
        type: 'communication',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        channel: 'email',
        direction: 'inbound',
        status: 'received',
        content: 'Reply received...'
      },
      {
        type: 'decision',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        agent: 'email',
        decision: 'send_follow_up',
        reasoning: 'Lead showed interest in initial email'
      },
      {
        type: 'conversation',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        channel: 'email',
        status: 'active',
        messageCount: 2
      }
    ];
    
    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TIMELINE_ERROR',
        message: 'Failed to fetch timeline',
        category: 'database'
      }
    });
  }
});

// Create new lead
router.post('/', async (req, res) => {
  try {
    const validationResult = createLeadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid lead data',
          details: validationResult.error.errors
        }
      });
    }

    const leadData = validationResult.data;
    const newLead = {
      id: `lead-${Date.now()}`,
      ...leadData,
      qualificationScore: 50, // Default score
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, this would be saved to the database
    mockLeads.push(newLead);

    res.status(201).json({
      success: true,
      lead: newLead,
      message: 'Lead created successfully'
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

// Update lead information
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = updateLeadSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: validationResult.error.errors
        }
      });
    }

    const leadIndex = mockLeads.findIndex(l => l.id === id);
    if (leadIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    // Update the lead
    const updates = validationResult.data;
    const updatedLead = {
      ...mockLeads[leadIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    mockLeads[leadIndex] = updatedLead;

    res.json({
      success: true,
      lead: updatedLead,
      message: 'Lead updated successfully'
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
    const leadIndex = mockLeads.findIndex(l => l.id === id);
    
    if (leadIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    mockLeads.splice(leadIndex, 1);

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

// Send manual message to lead
router.post('/:id/send-message', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = sendMessageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid message data',
          details: validationResult.error.errors
        }
      });
    }

    const lead = mockLeads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    const { channel, content, subject } = validationResult.data;
    
    // Mock message sending
    const messageResult = {
      id: `msg-${Date.now()}`,
      channel,
      content,
      subject,
      to: channel === 'email' ? lead.email : lead.phone,
      status: 'sent',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: messageResult,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MESSAGE_SEND_ERROR',
        message: 'Failed to send message',
        category: 'processing'
      }
    });
  }
});

export default router;