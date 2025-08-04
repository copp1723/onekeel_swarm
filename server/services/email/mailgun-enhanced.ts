import formData from "form-data";
import Mailgun from "mailgun.js";
import { logger } from "../../utils/logger";
import { MailgunService, EmailData, EmailResult } from "./mailgun";

const mailgun = new Mailgun(formData);

export interface ValidationResult {
  isValid: boolean;
  result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
  reason?: string;
  didYouMean?: string;
  isRoleAddress?: boolean;
  isDisposable?: boolean;
  risk?: 'low' | 'medium' | 'high' | 'unknown';
}

export interface SuppressionCheckResult {
  canSend: boolean;
  suppressionType?: 'bounce' | 'complaint' | 'unsubscribe';
  suppressedAt?: Date;
  reason?: string;
}

export class EnhancedMailgunService extends MailgunService {
  private mg: any;
  private validationEnabled: boolean;

  constructor() {
    super();
    this.mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
      public_key: process.env.MAILGUN_PUBLIC_KEY || ""
    });
    this.validationEnabled = !!process.env.MAILGUN_PUBLIC_KEY;
  }

  /**
   * Enhanced email sending with validation and suppression checks
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      // Step 1: Validate email address
      if (this.validationEnabled) {
        const validation = await this.validateEmailAddress(emailData.to);
        
        if (!validation.isValid) {
          logger.warn('Email validation failed', {
            email: emailData.to,
            result: validation.result,
            reason: validation.reason,
            suggestion: validation.didYouMean
          });

          // Return with suggestion if available
          return {
            success: false,
            error: `Invalid email: ${validation.reason || validation.result}`,
            suggestion: validation.didYouMean
          };
        }

        // Warn about risky emails
        if (validation.result === 'risky') {
          logger.warn('Sending to risky email', {
            email: emailData.to,
            risk: validation.risk,
            isDisposable: validation.isDisposable,
            isRole: validation.isRoleAddress
          });
        }
      }

      // Step 2: Check suppression lists
      const suppression = await this.checkSuppressions(emailData.to);
      if (!suppression.canSend) {
        logger.warn('Email is suppressed', {
          email: emailData.to,
          type: suppression.suppressionType,
          reason: suppression.reason,
          suppressedAt: suppression.suppressedAt
        });

        return {
          success: false,
          error: `Email suppressed due to ${suppression.suppressionType}: ${suppression.reason || 'N/A'}`
        };
      }

      // Step 3: Send email with enhanced tracking
      const result = await super.sendEmail({
        ...emailData,
        // Add tracking tags
        'o:tag': ['watchdog', 'validated'],
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes'
      } as any);

      if (result.success) {
        logger.info('Enhanced email sent successfully', {
          to: emailData.to,
          messageId: result.messageId,
          validated: this.validationEnabled
        });
      }

      return result;
    } catch (error) {
      logger.error('Enhanced email send failed', {
        email: emailData.to,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate email using Mailgun's Email Validation API
   */
  async validateEmailAddress(email: string): Promise<ValidationResult> {
    if (!this.validationEnabled) {
      // Fallback to basic validation
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      return {
        isValid,
        result: isValid ? 'unknown' : 'undeliverable',
        reason: isValid ? undefined : 'Invalid email format'
      };
    }

    try {
      const validation = await this.mg.validate.get(email);
      
      return {
        isValid: validation.result === 'deliverable',
        result: validation.result,
        reason: validation.reason,
        didYouMean: validation.did_you_mean,
        isRoleAddress: validation.is_role_address,
        isDisposable: validation.is_disposable_address,
        risk: validation.risk || 'unknown'
      };
    } catch (error) {
      logger.error('Email validation API error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to basic validation
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      return {
        isValid,
        result: 'unknown',
        risk: 'unknown'
      };
    }
  }

  /**
   * Check if email is in suppression lists
   */
  async checkSuppressions(email: string): Promise<SuppressionCheckResult> {
    const domain = process.env.MAILGUN_DOMAIN;
    if (!domain) {
      return { canSend: true };
    }

    try {
      // Check bounces
      const bounces = await this.mg.suppressions.list(domain, 'bounces', {
        limit: 1,
        address: email
      });

      if (bounces.items && bounces.items.length > 0) {
        const bounce = bounces.items[0];
        return {
          canSend: false,
          suppressionType: 'bounce',
          suppressedAt: new Date(bounce.created_at),
          reason: bounce.error || bounce.code
        };
      }

      // Check complaints
      const complaints = await this.mg.suppressions.list(domain, 'complaints', {
        limit: 1,
        address: email
      });

      if (complaints.items && complaints.items.length > 0) {
        const complaint = complaints.items[0];
        return {
          canSend: false,
          suppressionType: 'complaint',
          suppressedAt: new Date(complaint.created_at)
        };
      }

      // Check unsubscribes
      const unsubscribes = await this.mg.suppressions.list(domain, 'unsubscribes', {
        limit: 1,
        address: email
      });

      if (unsubscribes.items && unsubscribes.items.length > 0) {
        const unsubscribe = unsubscribes.items[0];
        return {
          canSend: false,
          suppressionType: 'unsubscribe',
          suppressedAt: new Date(unsubscribe.created_at)
        };
      }

      return { canSend: true };
    } catch (error) {
      logger.error('Suppression check error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // On error, allow sending (fail open)
      return { canSend: true };
    }
  }

  /**
   * Bulk validate email addresses
   */
  async validateBulkEmails(emails: string[]): Promise<{
    valid: string[];
    invalid: string[];
    risky: string[];
    suggestions: Map<string, string>;
  }> {
    const results = {
      valid: [] as string[],
      invalid: [] as string[],
      risky: [] as string[],
      suggestions: new Map<string, string>()
    };

    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (email) => {
          const validation = await this.validateEmailAddress(email);
          
          if (validation.result === 'deliverable') {
            results.valid.push(email);
          } else if (validation.result === 'undeliverable') {
            results.invalid.push(email);
          } else if (validation.result === 'risky') {
            results.risky.push(email);
          }

          if (validation.didYouMean) {
            results.suggestions.set(email, validation.didYouMean);
          }
        })
      );

      // Rate limit between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk validation completed', {
      total: emails.length,
      valid: results.valid.length,
      invalid: results.invalid.length,
      risky: results.risky.length,
      suggestions: results.suggestions.size
    });

    return results;
  }

  /**
   * Get delivery statistics for monitoring
   */
  async getDeliveryStats(hours: number = 24): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    complained: number;
    unsubscribed: number;
  }> {
    const domain = process.env.MAILGUN_DOMAIN;
    if (!domain) {
      return {
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        complained: 0,
        unsubscribed: 0
      };
    }

    try {
      const end = new Date();
      const begin = new Date(end.getTime() - hours * 60 * 60 * 1000);

      const stats = await this.mg.stats.getDomain(domain, {
        event: ['accepted', 'delivered', 'failed', 'opened', 'clicked', 'complained', 'unsubscribed'],
        start: begin.toISOString(),
        end: end.toISOString(),
        resolution: hours <= 24 ? 'hour' : 'day'
      });

      // Aggregate stats
      const totals = {
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        complained: 0,
        unsubscribed: 0
      };

      stats.items.forEach((item: any) => {
        totals.sent += item.accepted?.total || 0;
        totals.delivered += item.delivered?.total || 0;
        totals.failed += item.failed?.total || 0;
        totals.opened += item.opened?.total || 0;
        totals.clicked += item.clicked?.total || 0;
        totals.complained += item.complained?.total || 0;
        totals.unsubscribed += item.unsubscribed?.total || 0;
      });

      return totals;
    } catch (error) {
      logger.error('Failed to get delivery stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        complained: 0,
        unsubscribed: 0
      };
    }
  }

  /**
   * Remove an email from suppression list
   */
  async removeFromSuppression(
    email: string, 
    type: 'bounces' | 'complaints' | 'unsubscribes'
  ): Promise<boolean> {
    const domain = process.env.MAILGUN_DOMAIN;
    if (!domain) {
      return false;
    }

    try {
      await this.mg.suppressions.destroy(domain, type, email);
      logger.info('Removed from suppression', { email, type });
      return true;
    } catch (error) {
      logger.error('Failed to remove from suppression', {
        email,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Export singleton instance
export const enhancedMailgunService = new EnhancedMailgunService();