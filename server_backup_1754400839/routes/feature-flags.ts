import { Router, Request, Response } from 'express';
import { ApiResponseBuilder } from '../../shared/types/api';

const router = Router();

// Simplified feature flags - per handoff simplification
// Return default values instead of complex database queries
const DEFAULT_FEATURE_FLAGS = {
  'ui.contacts-terminology': true,
  'ui.new-navigation': true,
  'ui.enhanced-dashboard': true,
  'ui.campaign-wizard': true,
  'ui.ai-enhancement': true
};

// Feature flag evaluation endpoint (simplified)
router.get('/evaluate', async (req: Request, res: Response) => {
  try {
    const { flag } = req.query;
    
    if (flag && typeof flag === 'string') {
      // Return specific flag value
      const isEnabled = DEFAULT_FEATURE_FLAGS[flag as keyof typeof DEFAULT_FEATURE_FLAGS] || false;
      
      return res.json(
        ApiResponseBuilder.success({
          flag,
          enabled: isEnabled,
          source: 'default'
        }, 'Feature flag evaluated')
      );
    }
    
    // Return all flags if no specific flag requested
    return res.json(
      ApiResponseBuilder.success({
        flags: DEFAULT_FEATURE_FLAGS,
        source: 'default'
      }, 'All feature flags evaluated')
    );
    
  } catch (error) {
    console.error('Feature flag evaluation error:', error);
    return res.status(500).json(
      ApiResponseBuilder.error('FEATURE_FLAG_ERROR', 'Failed to evaluate feature flags')
    );
  }
});

// Get all feature flags (simplified)
router.get('/', async (req: Request, res: Response) => {
  try {
    return res.json(
      ApiResponseBuilder.success({
        flags: Object.entries(DEFAULT_FEATURE_FLAGS).map(([key, enabled]) => ({
          key,
          name: key.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          enabled,
          description: `Default ${key} feature flag`,
          source: 'default'
        }))
      }, 'Feature flags retrieved')
    );
  } catch (error) {
    console.error('Feature flags retrieval error:', error);
    return res.status(500).json(
      ApiResponseBuilder.error('FEATURE_FLAG_ERROR', 'Failed to retrieve feature flags')
    );
  }
});

export default router;
