import { MailgunService, EmailData, EmailResult } from './mailgun';
import { emailWatchdog } from '../email-watchdog';
import { logger } from '../../utils/logger';

/**
 * Enhanced Mailgun service with strict email validation
 * Blocks typos and invalid emails before sending
 */
export class MailgunServiceWithWatchdog extends MailgunService {
  private strictMode: boolean = true;

  constructor() {
    super();
  }

  /**
   * Send email with watchdog validation
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    // Validate email before sending
    const validation = await emailWatchdog.validateEmail(emailData.to, {
      allowRoleEmails: false,
      allowDisposable: false,
      autoCorrect: true
    });

    if (!validation.isValid) {
      logger.warn('Email blocked by watchdog', {
        email: emailData.to,
        reason: validation.reason,
        suggestion: validation.suggestion
      });

      // Return detailed error with suggestion if available
      const errorMessage = validation.suggestion 
        ? `${validation.reason}. Did you mean ${validation.suggestion}?`
        : validation.reason || 'Invalid email address';

      return {
        success: false,
        error: errorMessage,
        suggestion: validation.suggestion
      };
    }

    // Email passed validation, proceed with sending
    logger.info('Email passed watchdog validation', { 
      email: emailData.to,
      confidence: validation.confidence 
    });

    return super.sendEmail(emailData);
  }

  /**
   * Send bulk emails with watchdog validation
   * Returns detailed validation report
   */
  async sendBulkEmails(emails: EmailData[]): Promise<{
    sent: number;
    failed: number;
    blocked: number;
    errors: any[];
    validationReport: {
      typos: Array<{ email: string; suggestion: string }>;
      invalid: Array<{ email: string; reason: string }>;
    };
  }> {
    let sent = 0;
    let failed = 0;
    let blocked = 0;
    const errors: any[] = [];
    const validationReport = {
      typos: [] as Array<{ email: string; suggestion: string }>,
      invalid: [] as Array<{ email: string; reason: string }>
    };

    for (const email of emails) {
      try {
        // Validate first
        const validation = await emailWatchdog.validateEmail(email.to);
        
        if (!validation.isValid) {
          blocked++;
          
          // Track validation issues
          if (validation.suggestion) {
            validationReport.typos.push({
              email: email.to,
              suggestion: validation.suggestion
            });
          } else {
            validationReport.invalid.push({
              email: email.to,
              reason: validation.reason || 'Invalid email'
            });
          }
          
          errors.push({ 
            email: email.to, 
            error: validation.reason,
            suggestion: validation.suggestion,
            type: 'validation'
          });
          
          continue; // Skip sending
        }

        // Send email
        const result = await super.sendEmail(email);
        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push({ 
            email: email.to, 
            error: result.error,
            type: 'send'
          });
        }
        
        // Rate limiting
        await this.delay(100);
      } catch (error) {
        failed++;
        errors.push({ 
          email: email.to, 
          error,
          type: 'exception'
        });
      }
    }

    const report = {
      sent,
      failed,
      blocked,
      errors,
      validationReport
    };

    logger.info('Bulk email validation complete', {
      total: emails.length,
      sent,
      failed,
      blocked,
      typos: validationReport.typos.length,
      invalid: validationReport.invalid.length
    });

    return report;
  }

  /**
   * Pre-validate email list before campaign
   * This allows you to clean the list before attempting to send
   */
  async preValidateCampaignList(
    emails: string[]
  ): Promise<{
    valid: string[];
    invalid: Array<{ email: string; reason: string; suggestion?: string }>;
    summary: {
      total: number;
      valid: number;
      blocked: number;
      typos: number;
      disposable: number;
      roleEmails: number;
    };
  }> {
    logger.info('Pre-validating campaign email list', { count: emails.length });
    
    const validation = await emailWatchdog.validateBatch(emails);
    
    logger.info('Pre-validation complete', validation.summary);
    
    return validation;
  }

  /**
   * Get suggested corrections for a list of emails
   */
  async getSuggestedCorrections(emails: string[]): Promise<Map<string, string>> {
    const suggestions = new Map<string, string>();
    
    for (const email of emails) {
      const validation = await emailWatchdog.validateEmail(email);
      if (!validation.isValid && validation.suggestion) {
        suggestions.set(email, validation.suggestion);
      }
    }
    
    return suggestions;
  }

  /**
   * Toggle strict mode
   */
  setStrictMode(strict: boolean): void {
    this.strictMode = strict;
    logger.info('Email validation strict mode', { enabled: strict });
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      mailgunStatus: super.getStatus(),
      watchdogStats: emailWatchdog.getValidationStats(),
      strictMode: this.strictMode
    };
  }
}

// Export enhanced service
export const mailgunServiceWithWatchdog = new MailgunServiceWithWatchdog();