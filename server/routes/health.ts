import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redis } from '../services/redis';
import { getEnvironmentConfig } from '../config';
import { serviceMonitor } from '../utils/service-health/service-monitor';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    agents: HealthStatus;
    external: HealthStatus;
    memory: HealthStatus;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

// Database health check
async function checkDatabase(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      details: { query: 'SELECT 1' }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

// Redis health check
async function checkRedis(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    if (!redis) {
      return { status: 'healthy', details: { message: 'Redis not configured' } };
    }
    
    await redis.ping();
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      details: { command: 'PING' }
    };
  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis connection failed'
    };
  }
}

// Agent health check
async function checkAgents(): Promise<HealthStatus> {
  try {
    const agentConfigs = await db.execute(sql`
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN enabled = true THEN 1 END) as active_agents,
        COUNT(CASE WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_activity
      FROM agent_configurations
    `);

    const result = agentConfigs[0] as any;
    
    return {
      status: result.active_agents > 0 ? 'healthy' : 'degraded',
      details: {
        totalAgents: result.total_agents,
        activeAgents: result.active_agents,
        recentActivity: result.recent_activity
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Failed to check agent status'
    };
  }
}

// External services health check - enhanced with service monitor
async function checkExternalServices(): Promise<HealthStatus> {
  try {
    const serviceHealth = await serviceMonitor.checkAllServices();

    // Convert service monitor format to existing health status format
    const overallStatus = serviceHealth.status === 'healthy' ? 'healthy' :
                         serviceHealth.status === 'degraded' ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      responseTime: serviceHealth.performance.averageResponseTime,
      details: {
        services: serviceHealth.services,
        summary: serviceHealth.summary,
        recommendations: serviceHealth.recommendations
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Failed to check external services',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Memory health check
function checkMemory(): HealthStatus {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (usagePercent > 90) {
    status = 'unhealthy';
  } else if (usagePercent > 75) {
    status = 'degraded';
  }
  
  return {
    status,
    details: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      usagePercent: `${usagePercent}%`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    }
  };
}

// Main health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const [database, redis, agents, external, memory] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkAgents(),
      checkExternalServices(),
      Promise.resolve(checkMemory())
    ]);

    const checks = {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy', error: 'Check failed' },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: 'Check failed' },
      agents: agents.status === 'fulfilled' ? agents.value : { status: 'unhealthy', error: 'Check failed' },
      external: external.status === 'fulfilled' ? external.value : { status: 'unhealthy', error: 'Check failed' },
      memory: memory.status === 'fulfilled' ? memory.value : { status: 'unhealthy', error: 'Check failed' }
    };

    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const healthResponse: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthResponse);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Simple ping endpoint for load balancers
router.get('/health/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Detailed health check for debugging
router.get('/health/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const detailed = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkAgents(),
      checkExternalServices(),
      Promise.resolve(checkMemory())
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      },
      checks: detailed
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Detailed health check failed'
    });
  }
});

// Service-specific health checks endpoint
router.get('/health/services', async (req, res) => {
  try {
    const serviceHealth = await serviceMonitor.checkAllServices();

    const statusCode = serviceHealth.status === 'healthy' ? 200 :
                      serviceHealth.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(serviceHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service health check failed'
    });
  }
});

// Individual service health check endpoint
router.get('/health/services/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const serviceHealth = await serviceMonitor.checkService(serviceName);

    if (!serviceHealth) {
      return res.status(404).json({
        error: 'Service not found',
        availableServices: serviceMonitor.getServiceNames()
      });
    }

    const statusCode = serviceHealth.status === 'healthy' ? 200 :
                      serviceHealth.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(serviceHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service health check failed'
    });
  }
});

export default router;
