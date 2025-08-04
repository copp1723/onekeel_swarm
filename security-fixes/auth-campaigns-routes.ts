// Authentication Fix for campaigns.ts routes

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Apply authentication to ALL routes
router.use(authenticate);

// Apply rate limiting to prevent abuse
router.use(apiRateLimit);

// Protected routes with proper authorization

// View campaigns - any authenticated user
router.get('/', async (req, res) => {
  // Existing code...
});

// Get specific campaign - check ownership or admin/manager role
router.get('/:id', authorize('agent', 'manager', 'admin'), async (req, res) => {
  // Add ownership check
  const campaign = await getCampaignWithOwnership(req.params.id, req.user.id);
  if (!campaign && req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Rest of existing code...
});

// Create campaign - agents and above
router.post(
  '/',
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: createCampaignSchema }),
  async (req, res) => {
    // Add user ID to campaign data
    const campaignData = {
      ...req.body,
      createdBy: req.user.id,
      organizationId: req.user.organizationId, // Add multi-tenancy support
    };
    // Rest of existing code...
  }
);

// Update campaign - check ownership or admin
router.put(
  '/:id',
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: updateCampaignSchema }),
  async (req, res) => {
    // Verify ownership before update
    const campaign = await getCampaignWithOwnership(req.params.id, req.user.id);
    if (!campaign && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Rest of existing code...
  }
);

// Delete campaign - admin only
router.delete('/:id', authorize('admin'), async (req, res) => {
  // Existing code...
});

// Trigger campaign execution - strict validation and ownership check
router.post(
  '/execution/trigger',
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: triggerCampaignSchema }),
  async (req, res) => {
    const { campaignId } = req.body;

    // Verify campaign ownership
    const campaign = await getCampaignWithOwnership(campaignId, req.user.id);
    if (!campaign && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res
        .status(403)
        .json({ error: 'Access denied to trigger this campaign' });
    }

    // Add audit log
    await logCampaignAction({
      campaignId,
      userId: req.user.id,
      action: 'trigger',
      timestamp: new Date(),
      ip: req.ip,
    });

    // Rest of existing code...
  }
);

// Helper function to check campaign ownership
async function getCampaignWithOwnership(campaignId: string, userId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.createdBy, userId)))
    .limit(1);
  return campaign;
}
