import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { featureFlagService } from '../services/feature-flag-service-wrapper';
import type { FeatureFlagContext } from '../services/feature-flag-service-mock';

const router = Router();

// Validation schemas
const contextSchema = z.object({
  userId: z.string().optional(), // Remove UUID validation to be more flexible
  userRole: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  customProperties: z.record(z.any()).optional()
});

const evaluateSchema = z.object({
  flagKey: z.string().min(1),
  context: contextSchema
});

const getAllFlagsSchema = z.object({
  context: contextSchema
});

const createFlagSchema = z.object({
  key: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).default(0),
  userRoles: z.array(z.enum(['admin', 'manager', 'agent', 'viewer'])).default(['admin']),
  environments: z.array(z.enum(['development', 'staging', 'production'])).default(['development']),
  category: z.enum([
    'agent-tuning', 
    'campaign-advanced', 
    'system-config', 
    'integrations', 
    'ui-progressive', 
    'debugging', 
    'experimental'
  ]).default('experimental'),
  complexity: z.enum(['basic', 'intermediate', 'advanced']).default('basic'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('low')
});

const updateFlagSchema = createFlagSchema.partial().omit({ key: true });

// Middleware to extract user context from request
const extractContext = (req: any): FeatureFlagContext => {
  return {
    userId: req.user?.id,
    userRole: req.user?.role,
    environment: process.env.NODE_ENV as any || 'development'
  };
};

// Public endpoints (for frontend feature flag checks)

// Evaluate a single feature flag
router.post('/evaluate', validateRequest({ body: evaluateSchema }), async (req, res) => {
  try {
    const { flagKey, context } = req.body;
    
    const evaluation = await featureFlagService.evaluateFlag(flagKey, context);
    
    res.json({
      success: true,
      evaluation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error evaluating feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EVALUATION_ERROR',
        message: 'Failed to evaluate feature flag',
        category: 'system'
      }
    });
  }
});

// Get all enabled flags for a context
router.post('/all', validateRequest({ body: getAllFlagsSchema }), async (req, res) => {
  try {
    const { context } = req.body;
    
    const flags = await featureFlagService.getAllFlags(context);
    
    res.json({
      success: true,
      flags,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting all feature flags:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAGS_FETCH_ERROR',
        message: 'Failed to fetch feature flags',
        category: 'system'
      }
    });
  }
});

// Quick check endpoint (just returns boolean)
router.get('/check/:flagKey', async (req, res) => {
  try {
    const { flagKey } = req.params;
    const context = extractContext(req);
    
    const enabled = await featureFlagService.isEnabled(flagKey, context);
    
    res.json({
      success: true,
      enabled,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    res.json({
      success: false,
      enabled: false,
      error: 'Check failed'
    });
  }
});

// Administrative endpoints (require admin role)

// Get all flags (admin only)
router.get('/admin', async (req, res) => {
  try {
    // Check if user is admin
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const flags = await featureFlagService.getFlagsByCategory('all' as any);
    
    res.json({
      success: true,
      flags,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching admin flags:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_FLAGS_ERROR',
        message: 'Failed to fetch admin flags',
        category: 'system'
      }
    });
  }
});

// Create a new feature flag (admin only)
router.post('/admin', validateRequest({ body: createFlagSchema }), async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const flagData = {
      ...req.body,
      createdBy: context.userId,
      lastModifiedBy: context.userId
    };

    const flag = await featureFlagService.createFlag(flagData);
    
    res.status(201).json({
      success: true,
      flag,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAG_CREATE_ERROR',
        message: 'Failed to create feature flag',
        category: 'system'
      }
    });
  }
});

// Update a feature flag (admin only)
router.put('/admin/:flagKey', validateRequest({ body: updateFlagSchema }), async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const { flagKey } = req.params;
    const updates = {
      ...req.body,
      lastModifiedBy: context.userId
    };

    const flag = await featureFlagService.updateFlag(flagKey, updates);
    
    if (!flag) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FLAG_NOT_FOUND',
          message: 'Feature flag not found'
        }
      });
    }

    res.json({
      success: true,
      flag,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAG_UPDATE_ERROR',
        message: 'Failed to update feature flag',
        category: 'system'
      }
    });
  }
});

// Delete a feature flag (admin only)
router.delete('/admin/:flagKey', async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const { flagKey } = req.params;
    const deleted = await featureFlagService.deleteFlag(flagKey);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FLAG_NOT_FOUND',
          message: 'Feature flag not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Feature flag deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAG_DELETE_ERROR',
        message: 'Failed to delete feature flag',
        category: 'system'
      }
    });
  }
});

// Emergency disable endpoint (admin only)
router.post('/admin/:flagKey/disable', async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const { flagKey } = req.params;
    const { reason = 'Emergency disable' } = req.body;
    
    const success = await featureFlagService.disableFlag(flagKey, reason);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FLAG_NOT_FOUND',
          message: 'Feature flag not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Feature flag disabled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error disabling feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAG_DISABLE_ERROR',
        message: 'Failed to disable feature flag',
        category: 'system'
      }
    });
  }
});

// Enable flag with rollout percentage (admin only)
router.post('/admin/:flagKey/enable', async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const { flagKey } = req.params;
    const { rolloutPercentage = 100 } = req.body;
    
    const success = await featureFlagService.enableFlag(flagKey, rolloutPercentage);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FLAG_NOT_FOUND',
          message: 'Feature flag not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Feature flag enabled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enabling feature flag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FLAG_ENABLE_ERROR',
        message: 'Failed to enable feature flag',
        category: 'system'
      }
    });
  }
});

// User override management (admin only)
router.post('/admin/:flagKey/override/:userId', async (req, res) => {
  try {
    const context = extractContext(req);
    if (context.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const { flagKey, userId } = req.params;
    const { enabled, reason, expiresAt } = req.body;
    
    const override = await featureFlagService.setUserOverride(
      flagKey, 
      userId, 
      enabled, 
      reason,
      expiresAt ? new Date(expiresAt) : undefined
    );
    
    res.json({
      success: true,
      override,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error setting user override:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OVERRIDE_ERROR',
        message: 'Failed to set user override',
        category: 'system'
      }
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await featureFlagService.healthCheck();
    
    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Feature flag health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed',
        category: 'system'
      }
    });
  }
});

export default router;