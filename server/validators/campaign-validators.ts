import { z } from 'zod';

// Sanitize string to prevent XSS and injection
const sanitizedString = (maxLength: number = 1000) => z.string().max(maxLength).transform(val => 
  val.trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
);

// Email validation with additional checks
const emailSchema = z.string()
  .email()
  .max(255)
  .refine(email => !email.includes('\n') && !email.includes('\r'), {
    message: 'Email cannot contain line breaks'
  });

// Settings schema with strict validation
export const campaignSettingsSchema = z.object({
  goals: z.array(sanitizedString()).min(1).max(10),
  qualificationCriteria: z.object({
    minScore: z.number().min(0).max(100),
    requiredFields: z.array(z.enum(['email', 'phone', 'name', 'company'])).max(10),
    requiredGoals: z.array(sanitizedString()).max(10)
  }),
  handoverCriteria: z.object({
    qualificationScore: z.number().min(0).max(100),
    conversationLength: z.number().min(1).max(100),
    timeThreshold: z.number().min(1).max(10080), // Max 1 week in minutes
    keywordTriggers: z.array(sanitizedString()).max(50),
    goalCompletionRequired: z.array(sanitizedString()).max(10),
    handoverRecipients: z.array(z.object({
      name: sanitizedString(100),
      email: emailSchema,
      role: z.enum(['sales', 'support', 'manager', 'specialist']),
      priority: z.enum(['high', 'medium', 'low'])
    })).max(10)
  }),
  channelPreferences: z.object({
    primary: z.enum(['email', 'sms', 'chat']),
    fallback: z.array(z.enum(['email', 'sms', 'chat'])).max(3)
  }),
  touchSequence: z.array(z.object({
    templateId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(100),
    delayDays: z.number().min(0).max(365),
    delayHours: z.number().min(0).max(23),
    conditions: z.any().optional()
  })).max(20)
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255).transform(val => 
    val.trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
  ),
  description: sanitizedString(1000).optional(),
  type: z.enum(['standard', 'multi-agent']).optional(),
  settings: campaignSettingsSchema,
  selectedLeads: z.array(z.string().regex(/^lead_[a-zA-Z0-9_]+$/)).max(10000).optional(),
  active: z.boolean().default(true)
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const assignLeadsSchema = z.object({
  leadIds: z.array(z.string().regex(/^lead_[a-zA-Z0-9_]+$/)).min(1).max(1000)
});

export const triggerCampaignSchema = z.object({
  campaignId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(100),
  leadIds: z.array(z.string().regex(/^lead_[a-zA-Z0-9_]+$/)).min(1).max(1000),
  templates: z.array(z.object({
    subject: sanitizedString(200),
    body: sanitizedString(10000)
  })).max(10).optional()
});

// CSV validation schemas
export const csvContactSchema = z.object({
  email: emailSchema,
  firstName: sanitizedString(100).optional(),
  lastName: sanitizedString(100).optional(),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/).max(20).optional(),
  company: sanitizedString(200).optional()
});

export const validateCsvRow = (row: any): z.SafeParseReturnType<any, any> => {
  // Sanitize potential CSV injection
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      // Prevent formula injection
      let cleanValue = value.trim();
      if (/^[=+\-@]/.test(cleanValue)) {
        cleanValue = "'" + cleanValue;
      }
      sanitized[key] = cleanValue;
    } else {
      sanitized[key] = value;
    }
  }
  
  return csvContactSchema.safeParse(sanitized);
};