// Enhanced Validation Schemas for Campaign Routes

import { z } from 'zod';

// Custom validators
const safeString = (maxLength: number) => z.string()
  .trim()
  .min(1)
  .max(maxLength)
  .regex(/^[^<>'"`;]*$/, 'Invalid characters detected'); // Basic XSS prevention

const safeHtml = z.string().transform((val) => {
  // Sanitize HTML content
  return DOMPurify.sanitize(val, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
});

// Enhanced campaign creation schema
export const createCampaignSchema = z.object({
  name: safeString(255).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Campaign name contains invalid characters'),
  description: safeString(1000).optional(),
  type: z.enum(['drip', 'blast', 'trigger']),
  targetCriteria: z.object({
    // Validate all criteria fields
    minScore: z.number().min(0).max(100).optional(),
    tags: z.array(safeString(50)).max(20).optional(),
    segment: safeString(100).optional()
  }).optional(),
  settings: z.object({
    goals: z.array(safeString(500)).min(1).max(10),
    qualificationCriteria: z.object({
      minScore: z.number().min(0).max(100),
      requiredFields: z.array(z.enum(['email', 'phone', 'name', 'company'])).min(1),
      requiredGoals: z.array(safeString(100)).max(10)
    }),
    handoverCriteria: z.object({
      qualificationScore: z.number().min(0).max(100),
      conversationLength: z.number().min(1).max(100),
      timeThreshold: z.number().min(0).max(1440), // max 24 hours in minutes
      keywordTriggers: z.array(safeString(50)).max(50),
      goalCompletionRequired: z.array(safeString(100)).max(10),
      handoverRecipients: z.array(z.string().email()).max(10)
    }),
    channelPreferences: z.object({
      primary: z.enum(['email', 'sms', 'voice']),
      fallback: z.array(z.enum(['email', 'sms', 'voice'])).max(2)
    }),
    touchSequence: z.array(z.object({
      templateId: safeString(100),
      delayDays: z.number().min(0).max(365),
      delayHours: z.number().min(0).max(24)
    })).max(20) // Limit sequence length
  }).optional(),
  selectedLeads: z.array(z.string().uuid()).max(10000), // Limit batch size
  active: z.boolean(),
  startDate: z.string().datetime().optional().refine((date) => {
    if (!date) return true;
    const start = new Date(date);
    const now = new Date();
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1);
    return start >= now && start <= maxFuture;
  }, 'Start date must be in the future and within 1 year'),
  endDate: z.string().datetime().optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, 'End date must be after start date');

// Campaign trigger validation with strict limits
export const triggerCampaignSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format'),
  leadIds: z.array(z.string().uuid()).min(1).max(1000, 'Maximum 1000 leads per trigger'),
  templates: z.array(z.object({
    subject: safeString(200).regex(/^[^<>]*$/, 'Invalid characters in subject'),
    body: safeHtml.max(50000) // 50KB limit
  })).max(10).optional(),
  scheduledTime: z.string().datetime().optional().refine((date) => {
    if (!date) return true;
    const scheduled = new Date(date);
    const now = new Date();
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 30); // Max 30 days in future
    return scheduled >= now && scheduled <= maxFuture;
  }, 'Scheduled time must be within 30 days')
});

// Lead assignment validation
export const assignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(5000, 'Maximum 5000 leads per assignment'),
  overwrite: z.boolean().default(false)
});

// Email template validation
export const emailTemplateSchema = z.object({
  name: safeString(255),
  subject: safeString(998), // RFC 2822 subject line limit
  body: safeHtml.max(100000), // 100KB limit
  variables: z.array(z.object({
    name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
    defaultValue: safeString(1000).optional()
  })).max(50).optional(),
  metadata: z.record(z.string(), z.any()).optional().refine((meta) => {
    // Ensure metadata doesn't contain executable content
    const str = JSON.stringify(meta);
    return !str.includes('<script') && !str.includes('javascript:');
  }, 'Metadata contains potentially dangerous content')
});

// Query parameter validation
export const campaignQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  type: z.enum(['drip', 'blast', 'trigger']).optional(),
  search: safeString(100).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().min(0)).default('0'),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Middleware to sanitize all string inputs
export function sanitizeStrings(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeStrings);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeStrings(value);
    }
    return sanitized;
  }
  return obj;
}

// Apply to routes
router.post('/campaigns',
  authenticate,
  authorize('agent', 'manager', 'admin'),
  validateRequest({ body: createCampaignSchema }),
  (req, res, next) => {
    // Additional sanitization layer
    req.body = sanitizeStrings(req.body);
    next();
  },
  async (req, res) => {
    // Handler code...
  }
);