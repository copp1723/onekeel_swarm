import { Router } from 'express';
import { z } from 'zod';
import { smsService } from '../services/sms-service';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation-helpers';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();

// SMS send schema
const sendSMSSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  body: z.string().min(1, 'Message body is required').max(1600, 'Message too long'),
  campaignId: z.string().optional(),
  leadId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Campaign SMS schema
const sendCampaignSMSSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  variables: z.record(z.any()).default({}),
  campaignMetadata: z.record(z.any()).optional()
});

// Generate SMS content schema
const generateContentSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context: z.object({
    leadName: z.string().optional(),
    previousMessages: z.array(z.string()).optional(),
    campaignGoals: z.array(z.string()).optional(),
    customVariables: z.record(z.any()).optional()
  }).optional()
});

// Process template schema
const processTemplateSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  variables: z.record(z.any()).default({})
});

/**
 * GET /api/sms/status
 * Get SMS service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = smsService.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting SMS status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SMS_STATUS_ERROR',
        message: 'Failed to get SMS service status',
        category: 'system'
      }
    });
  }
});

/**
 * POST /api/sms/send
 * Send a single SMS message
 */
router.post('/send',
  rateLimiters.sms,
  validateRequest(sendSMSSchema),
  async (req, res) => {
  try {
    const { to, body, campaignId, leadId, metadata } = req.body;
    
    // Check if SMS service is configured
    if (!smsService.getStatus().configured) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SMS_SERVICE_UNAVAILABLE',
          message: 'SMS service is not configured. Please check Twilio credentials.',
          category: 'configuration'
        }
      });
    }

    const result = await smsService.sendSMS({
      to,
      body,
      campaignId,
      leadId,
      metadata
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error sending SMS:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SMS_SEND_ERROR',
        message: 'Failed to send SMS',
        category: 'system'
      }
    });
  }
});

/**
 * POST /api/sms/send-campaign
 * Send SMS using a template for campaigns
 */
router.post('/send-campaign',
  rateLimiters.sms,
  validateRequest(sendCampaignSMSSchema),
  async (req, res) => {
  try {
    const { to, templateId, variables, campaignMetadata } = req.body;
    
    // Check if SMS service is configured
    if (!smsService.getStatus().configured) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SMS_SERVICE_UNAVAILABLE',
          message: 'SMS service is not configured. Please check Twilio credentials.',
          category: 'configuration'
        }
      });
    }

    const result = await smsService.sendCampaignSMS(
      to,
      templateId,
      variables,
      campaignMetadata
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error sending campaign SMS:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAMPAIGN_SMS_ERROR',
        message: 'Failed to send campaign SMS',
        category: 'system'
      }
    });
  }
});

/**
 * POST /api/sms/generate-content
 * Generate SMS content using AI
 */
router.post('/generate-content',
  rateLimiters.api,
  validateRequest(generateContentSchema),
  async (req, res) => {
  try {
    const { prompt, context } = req.body;

    const content = await smsService.generateSMSContent(prompt, context || {});

    res.json({
      success: true,
      data: {
        content,
        length: content.length,
        smsCount: Math.ceil(content.length / 160)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating SMS content:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_GENERATION_ERROR',
        message: 'Failed to generate SMS content',
        category: 'system'
      }
    });
  }
});

/**
 * POST /api/sms/process-template
 * Process SMS template with variables
 */
router.post('/process-template',
  validateRequest(processTemplateSchema),
  async (req, res) => {
  try {
    const { template, variables } = req.body;

    const processed = smsService.processTemplate(template, variables);

    res.json({
      success: true,
      data: {
        processed,
        original: template,
        variables,
        length: processed.length,
        smsCount: Math.ceil(processed.length / 160)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing SMS template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_PROCESSING_ERROR',
        message: 'Failed to process SMS template',
        category: 'system'
      }
    });
  }
});

/**
 * POST /api/sms/webhook
 * Handle incoming SMS webhooks from Twilio
 */
router.post('/webhook', async (req, res) => {
  try {
    logger.info('Received SMS webhook', { body: req.body });

    // Validate Twilio webhook (in production, verify signature)
    const { From, To, Body, MessageSid } = req.body;

    if (!From || !To || !Body || !MessageSid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WEBHOOK',
          message: 'Missing required webhook fields',
          category: 'validation'
        }
      });
    }

    await smsService.handleIncomingSMS(req.body);

    // Respond with TwiML (Twilio Markup Language) if needed
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message. We'll get back to you soon!</Message>
</Response>`);

  } catch (error) {
    logger.error('Error processing SMS webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process SMS webhook',
        category: 'system'
      }
    });
  }
});

export default router;
