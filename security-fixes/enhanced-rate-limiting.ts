// Enhanced Rate Limiting for Campaign Routes

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';

// Different rate limits for different operations
const rateLimits = {
  // Strict limit for campaign creation (prevent spam campaigns)
  createCampaign: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 campaigns per hour
    message: 'Too many campaigns created. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.id || req.ip,
    skip: (req: Request) => req.user?.role === 'admin' // Admins exempt
  }),
  
  // Campaign execution (prevent email bombing)
  triggerCampaign: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Max 3 triggers per 15 min
    message: 'Campaign trigger rate limit exceeded. Please wait before triggering again.',
    keyGenerator: (req: Request) => `trigger_${req.user?.id || req.ip}`,
    handler: (req: Request, res: Response) => {
      // Log potential abuse
      logger.warn('Campaign trigger rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        campaignId: req.body.campaignId
      });
      
      res.status(429).json({
        success: false,
        error: {
          code: 'CAMPAIGN_TRIGGER_RATE_LIMIT',
          message: 'Too many campaign triggers. Please wait 15 minutes.',
          retryAfter: 900 // seconds
        }
      });
    }
  }),
  
  // CSV upload rate limiting (prevent DoS via large file uploads)
  csvUpload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Max 20 CSV uploads per hour
    message: 'Too many CSV uploads. Please try again later.',
    keyGenerator: (req: Request) => req.user?.id || req.ip
  }),
  
  // Email sending rate limit (per campaign)
  emailSending: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 emails per minute per campaign
    keyGenerator: (req: Request) => `email_${req.params.campaignId}_${req.user?.id}`,
    skip: (req: Request) => process.env.NODE_ENV === 'development'
  }),
  
  // API read operations (more permissive)
  readOperations: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 min
    keyGenerator: (req: Request) => req.user?.id || req.ip
  })
};

// Distributed rate limiting with Redis (for production)
function createRedisRateLimit(name: string, windowMs: number, max: number) {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:${name}:`
    }),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false
  });
}

// Dynamic rate limiting based on user behavior
class DynamicRateLimiter {
  private suspiciousActivity = new Map<string, number>();
  
  checkSuspiciousActivity(userId: string, action: string): boolean {
    const key = `${userId}:${action}`;
    const count = this.suspiciousActivity.get(key) || 0;
    
    if (count > 10) {
      // User has hit rate limits multiple times - apply stricter limits
      return true;
    }
    
    return false;
  }
  
  recordRateLimitHit(userId: string, action: string) {
    const key = `${userId}:${action}`;
    const count = this.suspiciousActivity.get(key) || 0;
    this.suspiciousActivity.set(key, count + 1);
    
    // Reset counts every hour
    setTimeout(() => {
      this.suspiciousActivity.delete(key);
    }, 3600000);
  }
}

const dynamicLimiter = new DynamicRateLimiter();

// Apply rate limits to routes
router.post('/campaigns', 
  rateLimits.createCampaign,
  authenticate,
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: createCampaignSchema }),
  async (req, res) => {
    // Check for suspicious activity
    if (dynamicLimiter.checkSuspiciousActivity(req.user.id, 'create_campaign')) {
      return res.status(429).json({
        error: 'Suspicious activity detected. Please contact support.'
      });
    }
    // ... rest of handler
});

router.post('/campaigns/execution/trigger',
  rateLimits.triggerCampaign,
  authenticate,
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: triggerCampaignSchema }),
  async (req, res) => {
    // Additional checks for bulk operations
    const { leadIds } = req.body;
    if (leadIds.length > 1000) {
      return res.status(400).json({
        error: 'Too many leads. Maximum 1000 leads per trigger.'
      });
    }
    // ... rest of handler
});

// Monitoring endpoint for rate limit stats
router.get('/admin/rate-limits', 
  authenticate,
  authorize('admin'),
  async (req, res) => {
    res.json({
      limits: {
        createCampaign: '5 per hour',
        triggerCampaign: '3 per 15 minutes',
        csvUpload: '20 per hour',
        emailSending: '100 per minute per campaign'
      },
      suspiciousUsers: Array.from(dynamicLimiter.suspiciousActivity.entries())
    });
});

export { rateLimits, dynamicLimiter };