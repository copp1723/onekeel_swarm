import { Router } from 'express';
import { SMSService } from '../services/sms-service.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const smsService = new SMSService();

// Check SMS service status
router.get('/status', authenticateToken, (req, res) => {
  const isReady = smsService.isReady();
  res.json({
    configured: isReady,
    provider: 'twilio',
    status: isReady ? 'active' : 'not_configured'
  });
});

// Send SMS
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, body, campaignId, leadId, metadata } = req.body;

    if (!to || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: to and body' 
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
      message: result
    });
  } catch (error) {
    logger.error('Error in SMS send endpoint', error as Error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send bulk SMS
router.post('/send-bulk', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Messages must be a non-empty array' 
      });
    }

    const results = await smsService.sendBulkSMS(messages);

    res.json({
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    logger.error('Error in bulk SMS send endpoint', error as Error);
    res.status(500).json({ 
      error: 'Failed to send bulk SMS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get SMS templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await smsService.getTemplates();
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching SMS templates', error as Error);
    res.status(500).json({ 
      error: 'Failed to fetch templates' 
    });
  }
});

// Render SMS template
router.post('/templates/render', authenticateToken, async (req, res) => {
  try {
    const { templateId, variables } = req.body;

    if (!templateId) {
      return res.status(400).json({ 
        error: 'Template ID is required' 
      });
    }

    const rendered = await smsService.renderTemplate(templateId, variables || {});
    res.json({ rendered });
  } catch (error) {
    logger.error('Error rendering SMS template', error as Error);
    res.status(500).json({ 
      error: 'Failed to render template' 
    });
  }
});

// Webhook for SMS status updates (Twilio callback)
router.post('/webhook/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

    logger.info('SMS status webhook received', {
      sid: MessageSid,
      status: MessageStatus,
      to: To,
      from: From,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage
    });

    // Process the status update (e.g., update database, emit events)
    // This would typically update the SMS record in your database

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing SMS webhook', error as Error);
    res.status(500).send('Error processing webhook');
  }
});

export default router;