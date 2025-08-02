// FIX 5: Input Validation & Mass Assignment Prevention
// File: Enhanced validation middleware and schemas

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import {
  sanitizeObjectStrings,
  sanitizeString,
  sanitizeHtml,
  sanitizeMetadata,
} from '../../shared/validation/sanitization-utils';

// Enhanced validation middleware with mass assignment protection
export function validateRequest(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schema.body) {
        const validated = await schema.body.parseAsync(req.body);
        // Replace body with validated data to prevent mass assignment
        req.body = validated;
      }

      // Validate query
      if (schema.query) {
        const validated = await schema.query.parseAsync(req.query);
        req.query = validated as any;
      }

      // Validate params
      if (schema.params) {
        const validated = await schema.params.parseAsync(req.params);
        req.params = validated as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            // Only show details in development
            details:
              process.env.NODE_ENV === 'development' ? error.errors : undefined,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Request validation failed',
        },
      });
    }
  };
}

// Secure schemas with strict validation

// User creation schema - prevents mass assignment of sensitive fields
export const createUserSchema = z
  .object({
    email: z.string().email().toLowerCase().max(255),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, hyphens and underscores'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
    firstName: z
      .string()
      .min(1)
      .max(100)
      .transform(val => sanitizeString(val, 100)),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .transform(val => sanitizeString(val, 100)),
    // Explicitly exclude fields that should not be set by users
  })
  .strict(); // .strict() prevents any extra fields

// User update schema - only allows specific fields to be updated
export const updateUserSchema = z
  .object({
    firstName: z
      .string()
      .min(1)
      .max(100)
      .transform(val => sanitizeString(val, 100))
      .optional(),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .transform(val => sanitizeString(val, 100))
      .optional(),
    email: z.string().email().toLowerCase().max(255).optional(),
    // Explicitly exclude sensitive fields
    // NO: role, passwordHash, active, id, createdAt, updatedAt
  })
  .strict();

// Lead creation with sanitization
export const createLeadSchema = z
  .object({
    firstName: z
      .string()
      .max(100)
      .transform(val => sanitizeString(val, 100))
      .optional(),
    lastName: z
      .string()
      .max(100)
      .transform(val => sanitizeString(val, 100))
      .optional(),
    email: z.string().email().toLowerCase().max(255),
    phone: z
      .string()
      .regex(/^[+\d\s()-]+$/, 'Invalid phone format')
      .max(20)
      .optional(),
    source: z
      .enum(['website', 'api', 'import', 'campaign', 'manual'])
      .default('api'),
    status: z
      .enum(['new', 'contacted', 'qualified', 'converted', 'rejected'])
      .default('new'),
    qualificationScore: z.number().int().min(0).max(100).optional(),
    assignedChannel: z.enum(['email', 'sms', 'chat']).optional(),
    creditScore: z.number().int().min(300).max(850).optional(),
    income: z.number().int().min(0).max(10000000).optional(),
    employer: z
      .string()
      .max(255)
      .transform(val => sanitizeString(val, 255))
      .optional(),
    jobTitle: z
      .string()
      .max(255)
      .transform(val => sanitizeString(val, 255))
      .optional(),
    notes: z
      .string()
      .max(5000)
      .transform(val => sanitizeString(val, 5000))
      .optional(),
    metadata: z
      .record(z.any())
      .optional()
      .transform(val => {
        // Sanitize all string values in metadata
        if (!val) return {};
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(val)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      }),
  })
  .strict();

// Campaign creation with XSS prevention
export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .transform(val => sanitizeString(val, 255)),
    description: z
      .string()
      .max(1000)
      .transform(val => sanitizeString(val, 1000))
      .optional(),
    type: z.enum(['drip', 'blast', 'trigger']).default('drip'),
    targetCriteria: z.record(z.any()).optional(),
    settings: z.record(z.any()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict();

// Email template with strict HTML sanitization
export const emailTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .transform(val => sanitizeString(val, 255)),
    subject: z
      .string()
      .min(1)
      .max(200)
      .transform(val => sanitizeString(val, 200)),
    body: z
      .string()
      .min(1)
      .max(50000)
      .transform(val => {
        // Allow only safe HTML tags for emails
        return sanitizeHtml(val);
      }),
    variables: z.array(z.string()).optional(),
  })
  .strict();

// Query parameter validation schemas
export const paginationSchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(val => Math.max(0, parseInt(val)))
    .optional(),
  sort: z
    .enum(['createdAt', 'updatedAt', 'name', 'email', 'status'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// Search schema with injection prevention
export const searchSchema = z.object({
  search: z
    .string()
    .max(100)
    .transform(val => {
      // Remove potential SQL injection characters
      return val.replace(/[';\\]/g, '').trim();
    })
    .optional(),
  ...paginationSchema.shape,
});

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid filename'),
  mimetype: z.enum([
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
});

// Middleware to strip undefined/null values and prevent prototype pollution
export function sanitizeRequestBody(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body === 'object') {
    // Remove prototype pollution attempts
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
    // Remove undefined and null values
    req.body = JSON.parse(JSON.stringify(req.body));
    // Recursively sanitize all string fields
    req.body = sanitizeObjectStrings(req.body);
  }
  next();
}

// CSV injection prevention for exports
export function sanitizeForCSV(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Check if value starts with dangerous characters
  if (/^[=+\-@]/.test(str)) {
    // Prepend with single quote to neutralize formula
    return `'${str}`;
  }

  // Escape quotes
  return str.replace(/"/g, '""');
}

// Example usage in routes:
/*
router.post('/users', 
  requireAuth, 
  authorize('admin'),
  sanitizeRequestBody,
  validateRequest({ body: createUserSchema }), 
  async (req, res) => {
    // req.body now only contains validated fields
    // No risk of mass assignment
  }
);
*/

export default {
  validateRequest,
  sanitizeRequestBody,
  sanitizeForCSV,
  schemas: {
    createUserSchema,
    updateUserSchema,
    createLeadSchema,
    createCampaignSchema,
    emailTemplateSchema,
    paginationSchema,
    searchSchema,
    fileUploadSchema,
  },
};
