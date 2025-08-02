import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { outboundEmailWatchdog, EmailBlockRule } from '../services/outbound-email-watchdog';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const blockRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  priority: z.number().min(1).max(100),
  conditions: z.object({
    blockedDomains: z.array(z.string()).optional(),
    blockedEmails: z.array(z.string().email()).optional(),
    requiresOptIn: z.boolean().optional(),
    forbiddenWords: z.array(z.string()).optional(),
    maxSubjectLength: z.number().positive().optional(),
    maxBodyLength: z.number().positive().optional(),
    requiresApproval: z.boolean().optional(),
    maxEmailsPerHour: z.number().positive().optional(),
    maxEmailsPerDay: z.number().positive().optional(),
    maxEmailsPerRecipient: z.number().positive().optional(),
    allowedHours: z.object({
      start: z.number().min(0).max(23),
      end: z.number().min(0).max(23),
    }).optional(),
    allowedDays: z.array(z.number().min(0).max(6)).optional(),
    campaignTypes: z.array(z.string()).optional(),
    requiresCampaignApproval: z.boolean().optional(),
  }),
  actions: z.object({
    block: z.boolean(),
    quarantine: z.boolean(),
    requireApproval: z.boolean(),
    notifyAdmin: z.boolean(),
    logOnly: z.boolean(),
  }),
});

/**
 * GET /api/email-watchdog/rules
 * Get all email block rules
 */
router.get('/rules', (req, res) => {
  try {
    const rules = outboundEmailWatchdog.getBlockRules();
    
    res.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    logger.error('Error getting email block rules', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get email block rules',
    });
  }
});

/**
 * POST /api/email-watchdog/rules
 * Add or update an email block rule
 */
router.post(
  '/rules',
  validateRequest({ body: blockRuleSchema }),
  (req, res) => {
    try {
      const rule: EmailBlockRule = req.body;
      
      outboundEmailWatchdog.addBlockRule(rule);
      
      logger.info('Email block rule added/updated', {
        ruleId: rule.id,
        name: rule.name,
        userId: req.user?.id,
      });
      
      res.json({
        success: true,
        message: 'Email block rule added/updated successfully',
        data: rule,
      });
    } catch (error) {
      logger.error('Error adding email block rule', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add email block rule',
      });
    }
  }
);

/**
 * DELETE /api/email-watchdog/rules/:ruleId
 * Remove an email block rule
 */
router.delete('/rules/:ruleId', (req, res) => {
  try {
    const { ruleId } = req.params;
    
    outboundEmailWatchdog.removeBlockRule(ruleId);
    
    logger.info('Email block rule removed', {
      ruleId,
      userId: req.user?.id,
    });
    
    res.json({
      success: true,
      message: 'Email block rule removed successfully',
    });
  } catch (error) {
    logger.error('Error removing email block rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to remove email block rule',
    });
  }
});

/**
 * GET /api/email-watchdog/quarantine
 * Get quarantined emails
 */
router.get('/quarantine', (req, res) => {
  try {
    const quarantinedEmails = outboundEmailWatchdog.getQuarantinedEmails();
    
    res.json({
      success: true,
      data: quarantinedEmails,
      count: quarantinedEmails.length,
    });
  } catch (error) {
    logger.error('Error getting quarantined emails', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get quarantined emails',
    });
  }
});

/**
 * GET /api/email-watchdog/pending-approval
 * Get emails pending approval
 */
router.get('/pending-approval', (req, res) => {
  try {
    const pendingEmails = outboundEmailWatchdog.getPendingApprovalEmails();
    
    res.json({
      success: true,
      data: pendingEmails,
      count: pendingEmails.length,
    });
  } catch (error) {
    logger.error('Error getting pending approval emails', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get pending approval emails',
    });
  }
});

/**
 * POST /api/email-watchdog/approve/:emailId
 * Approve a quarantined or pending email
 */
router.post('/approve/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    const approved = await outboundEmailWatchdog.approveEmail(emailId);
    
    if (!approved) {
      return res.status(404).json({
        success: false,
        error: 'Email not found in quarantine or approval queue',
      });
    }
    
    logger.info('Email approved', {
      emailId,
      userId: req.user?.id,
    });
    
    res.json({
      success: true,
      message: 'Email approved successfully',
    });
  } catch (error) {
    logger.error('Error approving email', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to approve email',
    });
  }
});

/**
 * POST /api/email-watchdog/block/:emailId
 * Permanently block an email
 */
router.post('/block/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    const blocked = await outboundEmailWatchdog.blockEmail(emailId);
    
    if (!blocked) {
      return res.status(404).json({
        success: false,
        error: 'Email not found in quarantine or approval queue',
      });
    }
    
    logger.info('Email permanently blocked', {
      emailId,
      userId: req.user?.id,
    });
    
    res.json({
      success: true,
      message: 'Email blocked successfully',
    });
  } catch (error) {
    logger.error('Error blocking email', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to block email',
    });
  }
});

/**
 * POST /api/email-watchdog/test
 * Test email validation without sending
 */
router.post(
  '/test',
  validateRequest({
    body: z.object({
      to: z.string().email(),
      from: z.string().email().optional(),
      subject: z.string(),
      html: z.string(),
      text: z.string().optional(),
    }),
  }),
  async (req, res) => {
    try {
      const emailData = req.body;
      
      const validation = await outboundEmailWatchdog.validateOutboundEmail({
        to: emailData.to,
        from: emailData.from || 'test@example.com',
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || '',
      });
      
      res.json({
        success: true,
        data: validation,
        message: validation.allowed ? 'Email would be sent' : 'Email would be blocked',
      });
    } catch (error) {
      logger.error('Error testing email validation', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to test email validation',
      });
    }
  }
);

export default router;
