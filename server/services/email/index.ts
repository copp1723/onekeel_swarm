// Export all email services and types
export { MailgunService } from "./providers/mailgun";
export type { EmailData, EmailTemplate as MailgunEmailTemplate, EmailResult } from "./types";

export { emailTemplateManager } from "./templates";
export type { EmailTemplate, CampaignConfig } from "./templates";

export { emailScheduler, EmailScheduler } from "./scheduler";
export type { 
  AttemptConfig, 
  CampaignScheduleConfig, 
  ScheduledAttempt, 
  CampaignSchedule 
} from "./scheduler";

// Export new types and factory
export type { EmailService, EmailProviderConfig } from "./types";
export { EmailServiceFactory } from "./factory";

// Import for re-export
import { emailTemplateManager } from "./templates";
import { emailScheduler } from "./scheduler";
import { EmailServiceFactory } from "./factory";

// Create singleton instance using factory
let emailServiceInstance: ReturnType<typeof EmailServiceFactory.createServiceFromEnv> | null = null;

try {
  emailServiceInstance = EmailServiceFactory.createServiceFromEnv();
} catch (error) {
  console.error('Failed to initialize email service:', error);
  emailServiceInstance = null;
}

// Re-export the default instances for convenience
export default {
  service: emailServiceInstance,
  templates: emailTemplateManager,
  scheduler: emailScheduler,
};