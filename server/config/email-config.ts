import { logger } from '../utils/logger';

export interface EmailConfig {
  outbound: {
    enabled: boolean;
    watchdogEnabled: boolean;
    maxEmailsPerHour: number;
    maxEmailsPerDay: number;
    requireApprovalForHighRisk: boolean;
  };
  security: {
    allowedDomains: string[];
    blockedDomains: string[];
    blockedEmails: string[];
    maxAttachmentSize: number;
    sanitizeContent: boolean;
  };
}

class EmailConfigManager {
  private static instance: EmailConfigManager;
  private config: EmailConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  static getInstance(): EmailConfigManager {
    if (!EmailConfigManager.instance) {
      EmailConfigManager.instance = new EmailConfigManager();
    }
    return EmailConfigManager.instance;
  }

  private loadConfiguration(): EmailConfig {
    return {
      outbound: {
        enabled: process.env.OUTBOUND_EMAIL_ENABLED !== 'false',
        watchdogEnabled: process.env.EMAIL_WATCHDOG_ENABLED !== 'false',
        maxEmailsPerHour: Number(process.env.MAX_EMAILS_PER_HOUR) || 100,
        maxEmailsPerDay: Number(process.env.MAX_EMAILS_PER_DAY) || 500,
        requireApprovalForHighRisk: process.env.REQUIRE_APPROVAL_HIGH_RISK === 'true',
      },
      security: {
        allowedDomains: (process.env.EMAIL_ALLOWED_DOMAINS || '').split(',').filter(Boolean),
        blockedDomains: (process.env.EMAIL_BLOCKED_DOMAINS || 'spam.com,tempmail.org').split(',').filter(Boolean),
        blockedEmails: (process.env.EMAIL_BLOCKED_EMAILS || '').split(',').filter(Boolean),
        maxAttachmentSize: Number(process.env.EMAIL_MAX_ATTACHMENT_SIZE) || 10485760, // 10MB
        sanitizeContent: process.env.EMAIL_SANITIZE_CONTENT !== 'false',
      },
    };
  }

  private validateConfiguration(): void {
    const { outbound, security } = this.config;

    if (!outbound.enabled) {
      logger.warn('Outbound email is disabled');
    }

    if (outbound.watchdogEnabled) {
      logger.info('Email watchdog is enabled - outbound emails will be monitored');
    }

    logger.info('Email configuration loaded successfully', {
      outboundEnabled: outbound.enabled,
      watchdogEnabled: outbound.watchdogEnabled,
      maxEmailsPerHour: outbound.maxEmailsPerHour,
      blockedDomains: security.blockedDomains.length,
    });
  }

  getConfig(): EmailConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return this.config.outbound.enabled;
  }

  updateConfig(updates: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
    logger.info('Email configuration updated');
  }
}

export const emailConfig = EmailConfigManager.getInstance();
