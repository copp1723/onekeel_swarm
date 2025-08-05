import { logger } from '../utils/logger';

/**
 * Email Watchdog Service
 * Strict email validation to prevent typos and invalid emails
 * Philosophy: Better to be too strict than send to bad emails
 */
export class EmailWatchdog {
  // Common email provider domains for typo detection
  private readonly commonDomains = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'ymail.com', 'live.com',
    'msn.com', 'me.com', 'mac.com', 'comcast.net', 'verizon.net',
    'att.net', 'sbcglobal.net', 'bellsouth.net', 'cox.net'
  ]);

  // Common typos we see in email domains
  private readonly domainTypos = new Map([
    // Gmail typos
    ['gmial.com', 'gmail.com'],
    ['gmai.com', 'gmail.com'],
    ['gmali.com', 'gmail.com'],
    ['gmil.com', 'gmail.com'],
    ['gmaill.com', 'gmail.com'],
    ['gmail.co', 'gmail.com'],
    ['gmail.con', 'gmail.com'],
    ['gmail.cm', 'gmail.com'],
    ['gmailcom', 'gmail.com'],
    ['gmal.com', 'gmail.com'],
    ['gmeil.com', 'gmail.com'],
    
    // Yahoo typos
    ['yaho.com', 'yahoo.com'],
    ['yahooo.com', 'yahoo.com'],
    ['yahoo.co', 'yahoo.com'],
    ['yahoo.con', 'yahoo.com'],
    ['yaoo.com', 'yahoo.com'],
    ['yhaoo.com', 'yahoo.com'],
    ['yhoo.com', 'yahoo.com'],
    
    // Hotmail typos
    ['hotmial.com', 'hotmail.com'],
    ['hotmai.com', 'hotmail.com'],
    ['hotmil.com', 'hotmail.com'],
    ['hotmal.com', 'hotmail.com'],
    ['hotmaill.com', 'hotmail.com'],
    ['hotmail.co', 'hotmail.com'],
    
    // Outlook typos
    ['outlok.com', 'outlook.com'],
    ['outloo.com', 'outlook.com'],
    ['outlook.co', 'outlook.com'],
    ['outlookcom', 'outlook.com'],
    
    // Common TLD typos
    ['gmail.comm', 'gmail.com'],
    ['yahoo.comm', 'yahoo.com'],
    ['hotmail.comm', 'hotmail.com'],
  ]);

  // Disposable email domains to block
  private readonly disposableDomains = new Set([
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 
    'tempmail.com', 'throwaway.email', 'yopmail.com',
    'maildrop.cc', 'minuteinbox.com', 'sharklasers.com'
  ]);

  // Role-based emails to block (optional, can be toggled)
  private readonly roleEmails = new Set([
    'info', 'admin', 'support', 'sales', 'contact',
    'help', 'hello', 'office', 'team', 'noreply',
    'no-reply', 'donotreply', 'abuse', 'postmaster'
  ]);

  /**
   * Main validation method - strict by default
   */
  async validateEmail(email: string, options?: {
    allowRoleEmails?: boolean;
    allowDisposable?: boolean;
    autoCorrect?: boolean;
  }): Promise<{
    isValid: boolean;
    reason?: string;
    suggestion?: string;
    confidence: 'high' | 'medium' | 'low';
  }> {
    const opts = {
      allowRoleEmails: false,
      allowDisposable: false,
      autoCorrect: true,
      ...options
    };

    // Normalize email
    email = email.toLowerCase().trim();

    // Step 1: Basic format validation
    const formatCheck = this.checkEmailFormat(email);
    if (!formatCheck.isValid) {
      return {
        isValid: false,
        reason: formatCheck.reason,
        confidence: 'high'
      };
    }

    const [localPart, domain] = email.split('@');

    // Step 2: Check for role-based emails
    if (!opts.allowRoleEmails && this.isRoleEmail(localPart)) {
      return {
        isValid: false,
        reason: 'Role-based email addresses are not allowed',
        confidence: 'high'
      };
    }

    // Step 3: Check for disposable domains
    if (!opts.allowDisposable && this.isDisposableDomain(domain)) {
      return {
        isValid: false,
        reason: 'Disposable email addresses are not allowed',
        confidence: 'high'
      };
    }

    // Step 4: Check for common typos
    const typoCheck = this.checkForTypos(domain);
    if (typoCheck.hasTypo) {
      const suggestion = opts.autoCorrect 
        ? `${localPart}@${typoCheck.suggestion}` 
        : undefined;
      
      return {
        isValid: false,
        reason: `Possible typo in domain: ${domain}`,
        suggestion,
        confidence: 'high'
      };
    }

    // Step 5: Additional validation rules
    const additionalChecks = this.performAdditionalChecks(email, localPart, domain);
    if (!additionalChecks.isValid) {
      return {
        isValid: false,
        reason: additionalChecks.reason,
        confidence: additionalChecks.confidence || 'medium'
      };
    }

    // Email passed all checks
    logger.info('Email validated successfully', { email });
    return {
      isValid: true,
      confidence: 'high'
    };
  }

  /**
   * Batch validate emails with summary
   */
  async validateBatch(emails: string[]): Promise<{
    valid: string[];
    invalid: Array<{
      email: string;
      reason: string;
      suggestion?: string;
    }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      typos: number;
      disposable: number;
      roleEmails: number;
    };
  }> {
    const results = {
      valid: [] as string[],
      invalid: [] as Array<{ email: string; reason: string; suggestion?: string }>,
      summary: {
        total: emails.length,
        valid: 0,
        invalid: 0,
        typos: 0,
        disposable: 0,
        roleEmails: 0
      }
    };

    for (const email of emails) {
      const validation = await this.validateEmail(email);
      
      if (validation.isValid) {
        results.valid.push(email);
        results.summary.valid++;
      } else {
        results.invalid.push({
          email,
          reason: validation.reason || 'Invalid email',
          suggestion: validation.suggestion
        });
        results.summary.invalid++;

        // Count specific issues
        if (validation.reason?.includes('typo')) results.summary.typos++;
        if (validation.reason?.includes('Disposable')) results.summary.disposable++;
        if (validation.reason?.includes('Role-based')) results.summary.roleEmails++;
      }
    }

    logger.info('Batch validation completed', results.summary);
    return results;
  }

  /**
   * Check basic email format
   */
  private checkEmailFormat(email: string): { isValid: boolean; reason?: string } {
    // Check for empty or whitespace
    if (!email || email.trim() === '') {
      return { isValid: false, reason: 'Email address is required' };
    }

    // Check length
    if (email.length > 254) {
      return { isValid: false, reason: 'Email address is too long' };
    }

    // Check for @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return { isValid: false, reason: 'Email must contain exactly one @ symbol' };
    }

    // Split and validate parts
    const [localPart, domain] = email.split('@');

    if (!localPart || localPart.length === 0) {
      return { isValid: false, reason: 'Email username cannot be empty' };
    }

    if (!domain || domain.length === 0) {
      return { isValid: false, reason: 'Email domain cannot be empty' };
    }

    // Check for valid characters
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!validEmailRegex.test(email)) {
      return { isValid: false, reason: 'Email contains invalid characters' };
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return { isValid: false, reason: 'Email cannot contain consecutive dots' };
    }

    // Check domain has at least one dot
    if (!domain.includes('.')) {
      return { isValid: false, reason: 'Email domain must contain at least one dot' };
    }

    // Check TLD length
    const tld = domain.split('.').pop() || '';
    if (tld.length < 2) {
      return { isValid: false, reason: 'Email domain extension is too short' };
    }

    return { isValid: true };
  }

  /**
   * Check if email is role-based
   */
  private isRoleEmail(localPart: string): boolean {
    const normalized = localPart.toLowerCase().replace(/[._-]/g, '');
    return this.roleEmails.has(normalized);
  }

  /**
   * Check if domain is disposable
   */
  private isDisposableDomain(domain: string): boolean {
    return this.disposableDomains.has(domain.toLowerCase());
  }

  /**
   * Check for common typos in domain
   */
  private checkForTypos(domain: string): { hasTypo: boolean; suggestion?: string } {
    const normalized = domain.toLowerCase();
    
    // Check exact typo matches
    if (this.domainTypos.has(normalized)) {
      return {
        hasTypo: true,
        suggestion: this.domainTypos.get(normalized)
      };
    }

    // Check for missing dots (e.g., gmailcom)
    for (const commonDomain of this.commonDomains) {
      const noDots = commonDomain.replace(/\./g, '');
      if (normalized === noDots) {
        return {
          hasTypo: true,
          suggestion: commonDomain
        };
      }
    }

    // Check for common TLD typos
    const tldTypos = [
      { pattern: /\.con$/, replacement: '.com' },
      { pattern: /\.cm$/, replacement: '.com' },
      { pattern: /\.co$/, replacement: '.com' },
      { pattern: /\.comm$/, replacement: '.com' },
      { pattern: /\.cmo$/, replacement: '.com' },
      { pattern: /\.ocm$/, replacement: '.com' }
    ];

    for (const { pattern, replacement } of tldTypos) {
      if (pattern.test(normalized)) {
        const suggested = normalized.replace(pattern, replacement);
        // Only suggest if it's a known domain
        const baseDomain = suggested.split('.').slice(-2).join('.');
        if (this.commonDomains.has(baseDomain)) {
          return {
            hasTypo: true,
            suggestion: suggested
          };
        }
      }
    }

    return { hasTypo: false };
  }

  /**
   * Additional validation checks
   */
  private performAdditionalChecks(
    email: string, 
    localPart: string, 
    domain: string
  ): { isValid: boolean; reason?: string; confidence?: 'high' | 'medium' | 'low' } {
    // Check for test emails
    const testPatterns = [
      /^test/i,
      /test$/i,
      /^fake/i,
      /^example/i,
      /^asdf/i,
      /^qwerty/i,
      /^abc123/i,
      /^123456/i
    ];

    for (const pattern of testPatterns) {
      if (pattern.test(localPart)) {
        return {
          isValid: false,
          reason: 'Test or placeholder email detected',
          confidence: 'high'
        };
      }
    }

    // Check for suspicious patterns
    if (localPart.length === 1) {
      return {
        isValid: false,
        reason: 'Single character email addresses are not allowed',
        confidence: 'high'
      };
    }

    // Check for all numbers (likely fake)
    if (/^\d+$/.test(localPart)) {
      return {
        isValid: false,
        reason: 'Email address cannot be all numbers',
        confidence: 'high'
      };
    }

    // Check for repeated characters (e.g., aaaaaa@gmail.com)
    if (/^(.)\1{4,}/.test(localPart)) {
      return {
        isValid: false,
        reason: 'Email contains too many repeated characters',
        confidence: 'medium'
      };
    }

    // Check for profanity or inappropriate content
    const inappropriatePatterns = [
      /fuck/i, /shit/i, /damn/i, /hell/i, /ass/i,
      /penis/i, /vagina/i, /dick/i, /cock/i, /pussy/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(localPart)) {
        return {
          isValid: false,
          reason: 'Inappropriate content detected in email',
          confidence: 'high'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    typosDetected: number;
    disposableBlocked: number;
    roleEmailsBlocked: number;
    totalValidated: number;
  } {
    // In a real implementation, these would be tracked
    return {
      typosDetected: 0,
      disposableBlocked: 0,
      roleEmailsBlocked: 0,
      totalValidated: 0
    };
  }
}

// Export singleton instance
export const emailWatchdog = new EmailWatchdog();