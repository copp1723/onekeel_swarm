// Environment-based invitation configuration
export const inviteConfig = {
  // Invitation expiry (configurable via environment)
  expiryDays: parseInt(process.env.INVITE_EXPIRY_DAYS || '7', 10),
  
  // Rate limiting
  maxInvitesPerHour: parseInt(process.env.MAX_INVITES_PER_HOUR || '5', 10),
  maxInvitesPerDay: parseInt(process.env.MAX_INVITES_PER_DAY || '20', 10),
  
  // Email settings
  fromEmail: process.env.MAILGUN_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@onekeel.com',
  fromName: process.env.EMAIL_FROM_NAME || 'OneKeel Team',
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5173',
  
  // Security settings
  allowDisposableEmails: process.env.ALLOW_DISPOSABLE_EMAILS === 'true',
  allowEmailAliases: process.env.ALLOW_EMAIL_ALIASES === 'true',
  
  // Blocked domains
  blockedDomains: (process.env.BLOCKED_EMAIL_DOMAINS || 'tempmail.org,10minutemail.com,guerrillamail.com').split(','),
  
  // Auto-cleanup expired invites (days)
  cleanupExpiredAfterDays: parseInt(process.env.CLEANUP_EXPIRED_INVITES_DAYS || '30', 10)
};

// Validation helper
export function validateInviteEmail(email: string): { valid: boolean; error?: string } {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  const domain = email.split('@')[1];
  
  // Check blocked domains
  if (inviteConfig.blockedDomains.includes(domain)) {
    return { valid: false, error: 'Email domain is not allowed' };
  }
  
  // Check disposable emails if not allowed
  if (!inviteConfig.allowDisposableEmails && isDisposableEmail(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }
  
  // Check email aliases if not allowed
  if (!inviteConfig.allowEmailAliases && email.includes('+')) {
    return { valid: false, error: 'Email aliases with + are not allowed' };
  }
  
  return { valid: true };
}

function isDisposableEmail(domain: string): boolean {
  // Common disposable email providers
  const disposableDomains = [
    'tempmail.org', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ];
  
  return disposableDomains.includes(domain.toLowerCase());
}
