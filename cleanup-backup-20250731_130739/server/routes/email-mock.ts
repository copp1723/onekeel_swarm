import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const templateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  content: z.string().min(1),
  plainText: z.string().optional(),
  category: z.enum(['initial_contact', 'follow_up', 'nurture', 'custom']),
  variables: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

const scheduleEmailSchema = z.object({
  to: z.string().email(),
  templateId: z.string(),
  variables: z.record(z.string()).optional(),
  scheduledFor: z.string().datetime().optional()
});

const triggerRuleSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  conditions: z.object({
    from: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    hasAttachment: z.boolean().optional()
  }),
  actions: z.object({
    createLead: z.boolean().default(true),
    assignCampaign: z.string().optional(),
    addTags: z.array(z.string()).optional(),
    setSource: z.string().optional(),
    setPriority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
  })
});

// Email Templates
router.get('/templates', async (req, res) => {
  try {
    const { category, active, search } = req.query;
    
    // Mock templates for now - replace with actual DB queries
    const templates = [
      {
        id: 'template-1',
        name: 'Welcome Email',
        subject: 'Welcome to Complete Car Loans',
        content: 'Thank you for your interest in our auto loan services.',
        category: 'initial_contact',
        active: true,
        variables: ['firstName', 'lastName'],
        performance: { sent: 0, opened: 0, clicked: 0, replied: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'template-2',
        name: 'Follow Up',
        subject: 'Following up on your loan application',
        content: 'We wanted to follow up on your recent inquiry about {{loanType}}.',
        category: 'follow_up',
        active: true,
        variables: ['firstName', 'loanType'],
        performance: { sent: 5, opened: 2, clicked: 1, replied: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_FETCH_ERROR',
        message: 'Failed to fetch email templates',
        category: 'database'
      }
    });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const validationResult = templateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid template data',
          details: validationResult.error.errors
        }
      });
    }

    const template = {
      id: `template-${Date.now()}`,
      ...validationResult.data,
      active: true,
      performance: { sent: 0, opened: 0, clicked: 0, replied: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_CREATE_ERROR',
        message: 'Failed to create email template',
        category: 'database'
      }
    });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { id, ...updates },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_UPDATE_ERROR',
        message: 'Failed to update email template',
        category: 'database'
      }
    });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_DELETE_ERROR',
        message: 'Failed to delete email template',
        category: 'database'
      }
    });
  }
});

// Template preview with variable replacement
router.post('/templates/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;
    
    // Mock template lookup
    const template = {
      id,
      name: 'Sample Template',
      subject: 'Hello {{firstName}}!',
      content: 'Dear {{firstName}} {{lastName}}, welcome to our service!',
      variables: ['firstName', 'lastName']
    };

    // Simple variable replacement
    const replaceVariables = (text: string, vars: Record<string, string>) => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] || match);
    };

    const preview = {
      subject: replaceVariables(template.subject, variables || {}),
      content: replaceVariables(template.content, variables || {}),
      originalSubject: template.subject,
      originalContent: template.content,
      variables: template.variables,
      replacedVariables: variables || {}
    };

    res.json({
      success: true,
      data: preview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating template preview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_PREVIEW_ERROR',
        message: 'Failed to generate template preview',
        category: 'processing'
      }
    });
  }
});

// Email Scheduling
router.post('/schedule', async (req, res) => {
  try {
    const validationResult = scheduleEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid schedule data',
          details: validationResult.error.errors
        }
      });
    }

    const { to, templateId, variables, scheduledFor } = validationResult.data;
    const executionId = `exec-${Date.now()}`;

    res.json({
      success: true,
      data: {
        executionId,
        to,
        templateId,
        variables,
        scheduledFor: scheduledFor || new Date().toISOString(),
        status: 'scheduled'
      },
      message: 'Email scheduled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling email:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_SCHEDULE_ERROR',
        message: 'Failed to schedule email',
        category: 'processing'
      }
    });
  }
});

router.get('/schedules', async (req, res) => {
  try {
    const schedules = [
      {
        id: 'schedule-1',
        name: 'Standard 5-Email Sequence',
        description: 'Balanced follow-up sequence over 2 weeks',
        attempts: [
          { delayDays: 0, delayHours: 0, templateId: 'template-1' },
          { delayDays: 1, delayHours: 0, templateId: 'template-2' },
          { delayDays: 3, delayHours: 0, templateId: 'template-1' },
          { delayDays: 7, delayHours: 0, templateId: 'template-2' },
          { delayDays: 14, delayHours: 0, templateId: 'template-1' }
        ],
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: schedules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_FETCH_ERROR',
        message: 'Failed to fetch schedules',
        category: 'database'
      }
    });
  }
});

// Email Monitor/Trigger Rules
router.get('/monitor/rules', async (req, res) => {
  try {
    const rules = [
      {
        id: 'rule-1',
        name: 'Auto Loan Inquiry',
        enabled: true,
        conditions: {
          subject: 'loan inquiry',
          from: ['leads@website.com']
        },
        actions: {
          createLead: true,
          assignCampaign: 'campaign-1',
          addTags: ['auto-loan', 'website-lead'],
          setPriority: 'high'
        }
      }
    ];

    res.json({
      success: true,
      data: rules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching email trigger rules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RULES_FETCH_ERROR',
        message: 'Failed to fetch trigger rules',
        category: 'database'
      }
    });
  }
});

router.post('/monitor/rules', async (req, res) => {
  try {
    const validationResult = triggerRuleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid rule data',
          details: validationResult.error.errors
        }
      });
    }

    const rule = {
      id: `rule-${Date.now()}`,
      ...validationResult.data,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating email trigger rule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RULE_CREATE_ERROR',
        message: 'Failed to create trigger rule',
        category: 'database'
      }
    });
  }
});

// Monitor status
router.get('/monitor/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        running: true,
        totalRules: 3,
        activeRules: 2,
        config: {
          host: process.env.IMAP_HOST || 'imap.example.com',
          user: process.env.IMAP_USER || 'user@example.com',
          port: process.env.IMAP_PORT || '993'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting monitor status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get monitor status',
        category: 'system'
      }
    });
  }
});

// Webhook endpoints for email replies
router.post('/webhooks/inbound', async (req, res) => {
  try {
    const { sender, subject, content } = req.body;
    
    if (!sender || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload'
      });
    }

    // Process the inbound email
    const processed = {
      id: `msg-${Date.now()}`,
      from: sender,
      subject,
      content: content || '',
      processedAt: new Date().toISOString(),
      action: 'lead_updated'
    };

    res.json({
      success: true,
      data: processed,
      message: 'Email processed successfully'
    });
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process email webhook'
    });
  }
});

// Send immediate email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text, templateId, variables } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: to, subject, html'
        }
      });
    }

    const jobId = `job-${Date.now()}`;

    res.json({
      success: true,
      data: {
        jobId,
        to,
        subject,
        status: 'queued',
        scheduledFor: new Date().toISOString()
      },
      message: 'Email queued for sending',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_SEND_ERROR',
        message: 'Failed to send email',
        category: 'processing'
      }
    });
  }
});

export default router;