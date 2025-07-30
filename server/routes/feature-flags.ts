import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const evaluateSchema = {
  body: z.object({
    flagKey: z.string().min(1),
    context: z.object({
      userId: z.string().optional(),
      userRole: z.string().optional(),
      environment: z.string().optional(),
      clientId: z.string().optional()
    }).optional().default({})
  })
};

const getAllSchema = {
  body: z.object({
    context: z.object({
      userId: z.string().optional(),
      userRole: z.string().optional(),
      environment: z.string().optional(),
      clientId: z.string().optional()
    }).optional().default({})
  })
};

// TEMPORARY: Mock feature flag data for alpha testing
const mockFeatureFlags: Record<string, boolean> = {
  'ui.contacts-terminology': true,
  'ui.advanced-analytics': true,
  'ui.bulk-operations': true,
  'ui.agent-templates': true,
  'ui.campaign-wizard': true,
  'ui.lead-scoring': true,
  'ui.email-templates': true,
  'ui.sms-campaigns': true,
  'ui.reporting': true,
  'ui.branding': true,
  'ui.new-navigation': true,
  'ui.enhanced-dashboard': true
};

// Evaluate a feature flag
router.post('/evaluate', validateRequest(evaluateSchema), async (req, res) => {
  try {
    const { flagKey, context } = req.body;
    
    // TEMPORARY: Return mock data for alpha testing
    const enabled = mockFeatureFlags[flagKey] ?? false;
    
    console.log(`[FEATURE FLAG] ${flagKey}: ${enabled} (mock data)`);
    
    res.json({
      success: true,
      evaluation: {
        flagKey,
        enabled,
        context,
        timestamp: new Date().toISOString(),
        source: 'mock'
      }
    });
  } catch (error) {
    console.error('Error evaluating feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate feature flag',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all flags for a context
router.post('/all', validateRequest(getAllSchema), async (req, res) => {
  try {
    const { context } = req.body;
    
    // TEMPORARY: Return mock data for alpha testing
    console.log('[FEATURE FLAGS] Returning all mock flags for alpha testing');
    
    res.json({
      success: true,
      flags: mockFeatureFlags,
      context,
      timestamp: new Date().toISOString(),
      source: 'mock'
    });
  } catch (error) {
    console.error('Error getting all feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin endpoints
router.get('/admin', async (req, res) => {
  try {
    // Return all flags with admin metadata
    const adminFlags = Object.entries(mockFeatureFlags).map(([key, enabled]) => ({
      id: key,
      key,
      name: key.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Feature flag for ${key}`,
      enabled,
      category: key.split('.')[0] || 'general',
      rolloutPercentage: enabled ? 100 : 0,
      environments: ['development', 'staging', 'production'],
      userRoles: ['admin', 'manager', 'agent', 'viewer'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock'
    }));
    
    res.json({
      success: true,
      flags: adminFlags
    });
  } catch (error) {
    console.error('Error getting admin feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin feature flags',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/admin', async (req, res) => {
  try {
    const { key, name, description, enabled = false, category = 'general' } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Flag key is required'
      });
    }
    
    // Add to mock flags
    mockFeatureFlags[key] = enabled;
    
    const newFlag = {
      id: key,
      key,
      name: name || key.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: description || `Feature flag for ${key}`,
      enabled,
      category,
      rolloutPercentage: enabled ? 100 : 0,
      environments: ['development', 'staging', 'production'],
      userRoles: ['admin', 'manager', 'agent', 'viewer'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock'
    };
    
    res.json({
      success: true,
      flag: newFlag
    });
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create feature flag',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.put('/admin/:flagKey', async (req, res) => {
  try {
    const { flagKey } = req.params;
    const { enabled, name, description, rolloutPercentage } = req.body;
    
    if (!(flagKey in mockFeatureFlags)) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found'
      });
    }
    
    // Update mock flag
    if (typeof enabled === 'boolean') {
      mockFeatureFlags[flagKey] = enabled;
    }
    
    const updatedFlag = {
      id: flagKey,
      key: flagKey,
      name: name || flagKey.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: description || `Feature flag for ${flagKey}`,
      enabled: mockFeatureFlags[flagKey],
      category: flagKey.split('.')[0] || 'general',
      rolloutPercentage: rolloutPercentage || (mockFeatureFlags[flagKey] ? 100 : 0),
      environments: ['development', 'staging', 'production'],
      userRoles: ['admin', 'manager', 'agent', 'viewer'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock'
    };
    
    res.json({
      success: true,
      flag: updatedFlag
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/admin/:flagKey', async (req, res) => {
  try {
    const { flagKey } = req.params;
    
    if (!(flagKey in mockFeatureFlags)) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found'
      });
    }
    
    delete mockFeatureFlags[flagKey];
    
    res.json({
      success: true,
      message: `Feature flag ${flagKey} deleted`
    });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feature flag',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // TEMPORARY: Return mock health data for alpha testing
    res.json({
      success: true,
      health: {
        status: 'healthy',
        flagsCount: Object.keys(mockFeatureFlags).length,
        cacheSize: 0,
        source: 'mock'
      }
    });
  } catch (error) {
    console.error('Error checking feature flag health:', error);
    res.status(500).json({
      success: false,
      error: 'Feature flag health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
