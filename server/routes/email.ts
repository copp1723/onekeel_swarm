import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import {
  mailgunService,
  emailTemplateManager,
  emailScheduler,
} from '../services/email';
import emailTemplatesRouter from './email-templates-db';

const router = Router();

// Mount templates sub-router
router.use('/templates', emailTemplatesRouter);

// Email schedule routes
router.get('/schedules', async (req, res) => {
  try {
    const schedules = emailScheduler.getSchedules();
    res.json({
      success: true,
      data: schedules,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching email schedules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_FETCH_ERROR',
        message: 'Failed to fetch email schedules',
        category: 'system',
      },
    });
  }
});

const createScheduleSchema = z.object({
  name: z.string().min(1),
  attempts: z
    .array(
      z.object({
        attemptNumber: z.number().min(1),
        templateId: z.string(),
        delayHours: z.number().min(0),
        delayDays: z.number().min(0),
        skipConditions: z.record(z.any()).optional(),
      })
    )
    .min(1),
});

router.post(
  '/schedules',
  validateRequest({ body: createScheduleSchema }),
  async (req, res) => {
    try {
      const { name, attempts } = req.body;
      const scheduleId = await emailScheduler.createSchedule({
        name,
        attempts,
      });

      res.status(201).json({
        success: true,
        data: { id: scheduleId, name, attempts },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating email schedule:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEDULE_CREATE_ERROR',
          message: 'Failed to create email schedule',
          category: 'system',
        },
      });
    }
  }
);

router.delete('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await emailScheduler.deleteSchedule(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Email schedule not found',
        },
      });
    }

    res.json({
      success: true,
      message: 'Email schedule deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting email schedule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_DELETE_ERROR',
        message: 'Failed to delete email schedule',
        category: 'system',
      },
    });
  }
});

// Send immediate email
const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().optional(),
  variables: z.record(z.any()).optional(),
  from: z.string().email().optional(),
});

router.post(
  '/send',
  validateRequest({ body: sendEmailSchema }),
  async (req, res) => {
    try {
      const emailData = req.body;

      // If templateId is provided, render the template
      if (emailData.templateId) {
        const template = emailTemplateManager.getTemplate(emailData.templateId);
        if (!template) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Email template not found',
            },
          });
        }

        const rendered = emailTemplateManager.renderTemplate(
          emailData.templateId,
          emailData.variables || {}
        );
        emailData.subject = rendered.subject || emailData.subject;
        emailData.html = rendered.html;
        emailData.text = rendered.text;
      }

      const result = await mailgunService.sendEmail(emailData);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send email',
          category: 'external',
        },
      });
    }
  }
);

// Test email endpoint
router.post(
  '/test',
  validateRequest({
    body: z.object({
      to: z.string().email(),
      type: z.enum(['simple', 'template', 'campaign']).default('simple'),
    }),
  }),
  async (req, res) => {
    try {
      const { to, type } = req.body;

      // Check if email service is configured
      if (!mailgunService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'EMAIL_NOT_CONFIGURED',
            message:
              'Email service is not properly configured. Please check MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.',
            details: mailgunService.getStatus(),
          },
        });
      }

      let result;

      switch (type) {
        case 'simple':
          // Send a simple test email
          result = await mailgunService.sendEmail({
            to,
            subject: 'Test Email from OneKeel Swarm',
            html: `
            <h2>Test Email Successfully Sent!</h2>
            <p>This is a test email from your OneKeel Swarm system.</p>
            <p>If you're receiving this, your email configuration is working correctly.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Sent at: ${new Date().toLocaleString()}<br>
              Domain: ${process.env.MAILGUN_DOMAIN || 'Not configured'}
            </p>
          `,
            text: 'Test Email Successfully Sent! This is a test email from your OneKeel Swarm system.',
          });
          break;

        case 'template':
          // Send a test email using a template
          const templateVars = {
            firstName: 'Test',
            lastName: 'User',
            email: to,
            companyName: 'OneKeel Swarm',
          };

          result = await mailgunService.sendEmail({
            to,
            subject: mailgunService.processTemplate(
              'Welcome {{firstName}}!',
              templateVars
            ),
            html: mailgunService.processTemplate(
              `
            <h2>Welcome {{firstName}} {{lastName}}!</h2>
            <p>This is a test template email from {{companyName}}.</p>
            <p>Your email {{email}} has been successfully added to our system.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This demonstrates variable replacement in email templates.
            </p>
          `,
              templateVars
            ),
          });
          break;

        case 'campaign':
          // Send a test campaign-style email
          result = await mailgunService.sendEmail({
            to,
            subject: 'Special Offer Just for You!',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Exclusive Offer Inside!</h1>
              <p>Hi there,</p>
              <p>This is a test of our campaign email system. In a real campaign, this would include:</p>
              <ul>
                <li>Personalized content based on lead data</li>
                <li>Dynamic offers and CTAs</li>
                <li>Tracking pixels for open rates</li>
                <li>Click tracking for engagement metrics</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                  Click Here to Learn More
                </a>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is a test email. In production, this would include unsubscribe links and proper tracking.
              </p>
            </div>
          `,
          });
          break;
      }

      res.json({
        success: true,
        data: {
          result,
          type,
          to,
          timestamp: new Date().toISOString(),
          emailService: mailgunService.getStatus(),
        },
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_EMAIL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to send test email',
          category: 'email',
        },
      });
    }
  }
);

// Email monitoring routes
router.get('/monitoring/rules', async (req, res) => {
  try {
    // This would connect to the email monitor service
    const { emailMonitor } = await import('../services/email-monitor');
    const rules = emailMonitor.getRules();

    res.json({
      success: true,
      data: rules,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching email monitoring rules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MONITOR_FETCH_ERROR',
        message: 'Failed to fetch email monitoring rules',
        category: 'system',
      },
    });
  }
});

// Email execution
router.post('/campaigns/:campaignId/execute', async (req, res) => {
  try {
    const { campaignId } = req.params;
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

    // This would trigger the campaign execution engine
    res.json({
      success: true,
      data: {
        campaignId,
        leadsQueued: leadIds.length,
        status: 'processing',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error executing campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_EXECUTE_ERROR',
        message: 'Failed to execute email campaign',
        category: 'system',
      },
    });
  }
});

// Webhook for email events (opens, clicks, etc.)
router.post('/webhooks/mailgun', async (req, res) => {
  try {
    const event = req.body;

    // Process webhook event
    console.log('Received Mailgun webhook:', event['event-data']?.event);

    // TODO: Update communication records based on event

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook',
        category: 'external',
      },
    });
  }
});

export default router;
