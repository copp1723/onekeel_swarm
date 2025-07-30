import { Router } from 'express';
import { ServiceManager } from '../services/service-manager';
import { serviceOrchestrator } from '../utils/service-orchestrator';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const serviceManager = new ServiceManager();

// GET /api/services/config - Get all service configurations
router.get('/config', requireAuth, async (req, res) => {
  try {
    const configs = await serviceManager.getAllServiceConfigs();
    res.json({
      success: true,
      data: configs,
      message: 'Service configurations retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve service configurations', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_RETRIEVE_ERROR',
        message: 'Failed to retrieve service configurations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// PUT /api/services/config/:service - Update service configuration
router.put('/config/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const configData = req.body;
    
    // Validate service name
    if (!['mailgun', 'twilio', 'openrouter'].includes(service)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: 'Invalid service name. Must be one of: mailgun, twilio, openrouter'
        }
      });
    }
    
    const updatedConfig = await serviceManager.updateServiceConfig(service, configData);
    
    res.json({
      success: true,
      data: updatedConfig,
      message: `Configuration for ${service} updated successfully`
    });
  } catch (error) {
    logger.error('Failed to update service configuration', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_UPDATE_ERROR',
        message: 'Failed to update service configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// POST /api/services/test/:service - Test service connection
router.post('/test/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    
    // Validate service name
    if (!['mailgun', 'twilio', 'openrouter'].includes(service)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: 'Invalid service name. Must be one of: mailgun, twilio, openrouter'
        }
      });
    }
    
    const testResult = await serviceManager.testServiceConnection(service);
    
    const statusCode = testResult.status === 'healthy' ? 200 : 
                      testResult.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: testResult.status !== 'unhealthy',
      data: testResult,
      message: `Service test for ${service} completed`
    });
  } catch (error) {
    logger.error('Failed to test service connection', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_TEST_ERROR',
        message: 'Failed to test service connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/services/health/:service - Get service health status
router.get('/health/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    
    // Validate service name
    if (!['mailgun', 'twilio', 'openrouter'].includes(service)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: 'Invalid service name. Must be one of: mailgun, twilio, openrouter'
        }
      });
    }
    
    const healthStatus = await serviceManager.getServiceHealth(service);
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthStatus.status !== 'unhealthy',
      data: healthStatus,
      message: `Health status for ${service} retrieved`
    });
  } catch (error) {
    logger.error('Failed to retrieve service health status', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_STATUS_ERROR',
        message: 'Failed to retrieve service health status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/services/metrics - Get service metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const serviceManager = new ServiceManager();
    const metrics = await serviceManager.getServiceMetrics();
    
    res.json({
      success: true,
      data: metrics,
      message: 'Service metrics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve service metrics', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_RETRIEVE_ERROR',
        message: 'Failed to retrieve service metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/services/metrics/:service - Get metrics for a specific service
router.get('/metrics/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    
    // Validate service name
    if (!['mailgun', 'twilio', 'openrouter'].includes(service)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: 'Invalid service name. Must be one of: mailgun, twilio, openrouter'
        }
      });
    }
    
    const serviceManager = new ServiceManager();
    const metrics = await serviceManager.getServiceMetricsForService(service);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Service ${service} not found`
        }
      });
    }
    
    res.json({
      success: true,
      data: metrics,
      message: `Metrics for ${service} retrieved successfully`
    });
  } catch (error) {
    logger.error('Failed to retrieve service metrics', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_RETRIEVE_ERROR',
        message: 'Failed to retrieve service metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;