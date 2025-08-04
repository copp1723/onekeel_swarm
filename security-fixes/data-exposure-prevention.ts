// Data Exposure Prevention for Campaign APIs

import { pick, omit } from 'lodash';

// Define sensitive fields that should never be exposed
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'apiKey',
  'apiSecret',
  'refreshToken',
  'sessionToken',
  'creditCard',
  'ssn',
  'internalNotes',
  'systemMetadata',
];

// Fields to expose based on user role
const FIELD_VISIBILITY = {
  viewer: ['id', 'name', 'description', 'status', 'type', 'createdAt'],
  agent: [
    'id',
    'name',
    'description',
    'status',
    'type',
    'createdAt',
    'updatedAt',
    'stats',
    'settings',
  ],
  manager: [
    'id',
    'name',
    'description',
    'status',
    'type',
    'createdAt',
    'updatedAt',
    'stats',
    'settings',
    'createdBy',
    'targetCriteria',
  ],
  admin: '*', // All fields except sensitive ones
};

// Sanitize campaign data based on user role
export function sanitizeCampaignData(campaign: any, userRole: string): any {
  // First, remove all sensitive fields
  let sanitized = omit(campaign, SENSITIVE_FIELDS);

  // Apply role-based field filtering
  if (userRole !== 'admin' && FIELD_VISIBILITY[userRole]) {
    sanitized = pick(sanitized, FIELD_VISIBILITY[userRole]);
  }

  // Sanitize nested objects
  if (sanitized.settings) {
    sanitized.settings = sanitizeSettings(sanitized.settings, userRole);
  }

  if (sanitized.stats) {
    sanitized.stats = sanitizeStats(sanitized.stats, userRole);
  }

  // Remove any remaining sensitive patterns
  sanitized = removeSensitivePatterns(sanitized);

  return sanitized;
}

// Sanitize settings object
function sanitizeSettings(settings: any, userRole: string): any {
  const sanitized = { ...settings };

  // Remove email credentials
  delete sanitized.emailCredentials;
  delete sanitized.smtpPassword;
  delete sanitized.apiKeys;

  // Limit handover recipients visibility
  if (
    sanitized.handoverCriteria?.handoverRecipients &&
    userRole !== 'admin' &&
    userRole !== 'manager'
  ) {
    sanitized.handoverCriteria.handoverRecipients =
      sanitized.handoverCriteria.handoverRecipients.map(() => '***@***.***');
  }

  return sanitized;
}

// Sanitize statistics to prevent information leakage
function sanitizeStats(stats: any, userRole: string): any {
  if (userRole === 'viewer') {
    // Viewers only see basic stats
    return {
      totalLeads: stats.totalLeads || 0,
      status: stats.totalLeads > 0 ? 'active' : 'inactive',
    };
  }

  // Remove any PII from stats
  const sanitized = { ...stats };
  delete sanitized.leadEmails;
  delete sanitized.leadPhones;
  delete sanitized.failedEmails;

  return sanitized;
}

// Remove sensitive patterns from any object
function removeSensitivePatterns(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
    /Bearer\s+[A-Za-z0-9\-._~\+\/]+=*/, // Bearer tokens
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses (in certain contexts)
  ];

  const sanitize = (value: any): any => {
    if (typeof value === 'string') {
      let sanitized = value;
      sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      });
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Skip keys that might contain sensitive data
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('key')
        ) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitize(val);
        }
      }
      return result;
    }
    return value;
  };

  return sanitize(obj);
}

// Sanitize lead data to prevent PII exposure
export function sanitizeLeadData(
  lead: any,
  userRole: string,
  requestingUserId: string
): any {
  const isOwner = lead.assignedTo === requestingUserId;
  const isManager = userRole === 'manager' || userRole === 'admin';

  if (!isOwner && !isManager) {
    // Non-owners and non-managers see minimal data
    return {
      id: lead.id,
      status: lead.status,
      score: lead.score,
      createdAt: lead.createdAt,
    };
  }

  // Owners and managers see more, but still sanitized
  const sanitized = {
    id: lead.id,
    name: lead.name,
    email: maskEmail(lead.email),
    phone: maskPhone(lead.phone),
    status: lead.status,
    score: lead.score,
    source: lead.source,
    assignedTo: lead.assignedTo,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  // Only admins see full email/phone
  if (userRole === 'admin') {
    sanitized.email = lead.email;
    sanitized.phone = lead.phone;
  }

  return sanitized;
}

// Email masking function
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 3) {
    return '***@' + domain;
  }
  return local.substring(0, 3) + '***@' + domain;
}

// Phone masking function
function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length <= 4) return '****';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
}

// Apply sanitization to routes
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await getCampaigns(req.query);

    // Sanitize each campaign based on user role
    const sanitizedCampaigns = campaigns.map(campaign =>
      sanitizeCampaignData(campaign, req.user.role)
    );

    res.json({
      success: true,
      campaigns: sanitizedCampaigns,
      total: campaigns.length,
    });
  } catch (error) {
    // Don't expose internal error details
    logger.error('Campaign fetch error', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch campaigns',
      },
    });
  }
});

// Audit logging for sensitive operations
export function auditLog(action: string, userId: string, details: any) {
  logger.info('Security audit', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent,
    resource: details.resource,
    changes: details.changes,
  });
}

// Error response sanitization
export function sanitizeErrorResponse(
  error: any,
  isDevelopment: boolean = false
): any {
  if (isDevelopment) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
    };
  }

  // Production: generic error messages
  return {
    message: 'An error occurred processing your request',
    code: error.code || 'INTERNAL_ERROR',
    reference: generateErrorReference(), // For support tickets
  };
}

function generateErrorReference(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
