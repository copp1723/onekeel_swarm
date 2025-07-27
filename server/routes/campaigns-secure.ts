import { Router } from 'express';
import { db } from '../db/client';
import { campaigns, leads, leadCampaignEnrollments, communications } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimit } from 'express-rate-limit';
import { withTransaction } from '../utils/db-transaction';
import { logger } from '../utils/logger';
import { 
  createCampaignSchema, 
  updateCampaignSchema, 
  triggerCampaignSchema,
  validateCsvRow
} from '../validators/campaign-validators';
import { EmailServiceFactory } from '../services/email/factory';
import { emailConversationManager } from '../services/email-conversation-manager';

const router = Router();

// Apply authentication to ALL routes
router.use(authenticate);

// Rate limiters
const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many campaigns created'
});

const triggerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 3,
  message: 'Too many campaign triggers'
});

// Create campaign with transaction support
router.post('/', campaignLimiter, validateRequest({ body: createCampaignSchema }), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await withTransaction(async (tx) => {
      // Create campaign
      const [campaign] = await tx
        .insert(campaigns)
        .values({
          id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...req.body,
          createdBy: userId,
          updatedBy: userId
        })
        .returning();

      // Create leads from CSV if provided
      if (req.body.csvContacts && req.body.csvContacts.length > 0) {
        const validLeads = [];
        
        for (const contact of req.body.csvContacts) {
          const validation = validateCsvRow(contact);
          if (validation.success) {
            validLeads.push({
              id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: validation.data.email,
              name: validation.data.firstName || 'Unknown',
              phone: validation.data.phone,
              source: 'csv_import',
              campaignId: campaign.id,
              createdBy: userId,
              metadata: contact
            });
          }
        }

        if (validLeads.length > 0) {
          // Batch insert leads
          const BATCH_SIZE = 100;
          for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
            const batch = validLeads.slice(i, i + BATCH_SIZE);
            await tx.insert(leads).values(batch);
          }

          // Enroll leads in campaign
          const enrollments = validLeads.map(lead => ({
            leadId: lead.id,
            campaignId: campaign.id,
            status: 'active',
            enrolledBy: userId
          }));
          
          await tx.insert(leadCampaignEnrollments).values(enrollments);
        }
      }

      return { campaign, leadCount: req.body.csvContacts?.length || 0 };
    });

    res.status(201).json({
      success: true,
      campaign: result.campaign,
      leadCount: result.leadCount
    });

  } catch (error) {
    logger.error('Campaign creation failed', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to create campaign',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Trigger campaign with security checks
router.post('/trigger', triggerLimiter, validateRequest({ body: triggerCampaignSchema }), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { campaignId, leadIds, templates } = req.body;

    // Verify campaign ownership
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.createdBy !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!campaign.active) {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    // Verify lead ownership
    const validLeads = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds))
      .limit(leadIds.length);

    const ownedLeads = validLeads.filter(lead => 
      lead.createdBy === userId || req.user?.role === 'admin'
    );

    if (ownedLeads.length === 0) {
      return res.status(403).json({ error: 'No authorized leads found' });
    }

    // Return success immediately
    res.json({
      success: true,
      message: 'Campaign trigger initiated',
      jobId: `job_${Date.now()}`,
      leadCount: ownedLeads.length
    });

    // Process emails asynchronously
    setImmediate(async () => {
      try {
        const emailService = EmailServiceFactory.createServiceFromEnv();
        if (!emailService) {
          logger.warn('Email service not configured');
          return;
        }
        const results = [];

        // Use the first template or default
        const template = templates?.[0] || {
          subject: campaign.name,
          body: campaign.settings?.templates?.[0]?.body || 'Default template'
        };

        // Send emails with rate limiting
        for (const lead of ownedLeads) {
          try {
            // Rate limit: 10 emails per second
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await emailService.sendEmail({
              to: lead.email,
              subject: template.subject,
              html: template.body,
              text: template.body.replace(/<[^>]*>/g, ''),
              metadata: {
                campaignId,
                leadId: lead.id,
                triggeredBy: userId
              }
            });

            // Record communication
            if (result.success) {
              await db.insert(communications).values({
                id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                leadId: lead.id,
                conversationId: `conv_${lead.id}`,
                direction: 'outbound',
                channel: 'email',
                content: template.body,
                status: 'sent',
                metadata: {
                  campaignId,
                  messageId: result.messageId,
                  subject: template.subject
                }
              });
            }

            results.push({ leadId: lead.id, success: result.success });
          } catch (error) {
            logger.error('Failed to send email', { error, leadId: lead.id });
            results.push({ leadId: lead.id, success: false, error: error.message });
          }
        }

        // Store job results
        logger.info('Campaign execution completed', { 
          jobId: `job_${Date.now()}`, 
          results 
        });

      } catch (error) {
        logger.error('Campaign execution failed', { error });
      }
    });

  } catch (error) {
    logger.error('Campaign trigger failed', { error });
    res.status(500).json({
      error: 'Failed to trigger campaign'
    });
  }
});

// Get campaigns with authorization
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    let query = db.select().from(campaigns);
    
    // Non-admins can only see their own campaigns
    if (!isAdmin) {
      query = query.where(eq(campaigns.createdBy, userId));
    }

    const results = await query.execute();

    // Filter sensitive data
    const sanitized = results.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      status: campaign.status,
      active: campaign.active,
      createdAt: campaign.createdAt,
      // Hide sensitive settings unless owner
      settings: campaign.createdBy === userId || isAdmin ? campaign.settings : undefined
    }));

    res.json({
      success: true,
      campaigns: sanitized
    });

  } catch (error) {
    logger.error('Failed to fetch campaigns', { error });
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

export default router;