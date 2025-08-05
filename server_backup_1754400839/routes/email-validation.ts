import { Router, Request, Response } from 'express';
import { emailWatchdog } from '../services/email-watchdog';
import { mailgunServiceWithWatchdog } from '../services/email/mailgun-with-watchdog';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Validate a single email address
 * POST /api/email/validate
 */
router.post('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const validation = await emailWatchdog.validateEmail(email);

    res.json({
      success: validation.isValid,
      email,
      ...validation
    });
  } catch (error) {
    logger.error('Email validation error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate email'
    });
  }
});

/**
 * Validate multiple email addresses
 * POST /api/email/validate-batch
 */
router.post('/validate-batch', authenticate, async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Emails array is required'
      });
    }

    if (emails.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 emails per batch'
      });
    }

    const results = await emailWatchdog.validateBatch(emails);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Batch validation error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate emails'
    });
  }
});

/**
 * Pre-validate campaign email list
 * POST /api/email/pre-validate-campaign
 */
router.post('/pre-validate-campaign', authenticate, async (req: Request, res: Response) => {
  try {
    const { emails, campaignId } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Emails array is required'
      });
    }

    logger.info('Pre-validating campaign emails', {
      campaignId,
      count: emails.length,
      userId: req.user?.id
    });

    const validation = await mailgunServiceWithWatchdog.preValidateCampaignList(emails);

    // Log validation results
    if (validation.summary.blocked > 0) {
      logger.warn('Campaign validation blocked emails', {
        campaignId,
        total: validation.summary.total,
        blocked: validation.summary.blocked,
        typos: validation.summary.typos,
        disposable: validation.summary.disposable,
        roleEmails: validation.summary.roleEmails
      });
    }

    res.json({
      success: true,
      validation,
      message: `${validation.valid.length} of ${emails.length} emails are valid`
    });
  } catch (error) {
    logger.error('Campaign validation error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate campaign emails'
    });
  }
});

/**
 * Get suggested corrections for emails with typos
 * POST /api/email/suggest-corrections
 */
router.post('/suggest-corrections', authenticate, async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Emails array is required'
      });
    }

    const suggestions = await mailgunServiceWithWatchdog.getSuggestedCorrections(emails);
    
    // Convert Map to object for JSON response
    const correctionsObject: Record<string, string> = {};
    suggestions.forEach((suggestion, email) => {
      correctionsObject[email] = suggestion;
    });

    res.json({
      success: true,
      corrections: correctionsObject,
      count: suggestions.size
    });
  } catch (error) {
    logger.error('Suggestion generation error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

/**
 * Test email validation with examples
 * GET /api/email/test-validation
 */
router.get('/test-validation', authenticate, async (req: Request, res: Response) => {
  const testEmails = [
    // Valid emails
    'john.doe@gmail.com',
    'jane@company.com',
    
    // Common typos
    'user@gmial.com',
    'test@yahooo.com',
    'admin@hotmial.com',
    'contact@gmail.co',
    'support@outlok.com',
    
    // Invalid formats
    'notanemail',
    '@gmail.com',
    'user@',
    'user..name@gmail.com',
    
    // Disposable
    'temp@10minutemail.com',
    'test@mailinator.com',
    
    // Role emails
    'info@company.com',
    'support@business.com',
    'admin@site.com',
    
    // Test/fake emails
    'test123@gmail.com',
    'asdf@yahoo.com',
    'aaaaaa@hotmail.com'
  ];

  const results = await emailWatchdog.validateBatch(testEmails);

  res.json({
    success: true,
    testResults: results,
    message: 'Email validation test completed'
  });
});

/**
 * Get validation statistics
 * GET /api/email/validation-stats
 */
router.get('/validation-stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = mailgunServiceWithWatchdog.getValidationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get validation stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

export default router;