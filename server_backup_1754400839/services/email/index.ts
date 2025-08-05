// Export all email services and types
export { mailgunService, MailgunService } from "./mailgun";
export type { EmailData, EmailTemplate as MailgunEmailTemplate, EmailResult } from "./mailgun";

export { emailTemplateManager } from "./templates";
export type { EmailTemplate, CampaignConfig } from "./templates";

export { emailScheduler, EmailScheduler } from "./scheduler";
export type { 
  AttemptConfig, 
  CampaignScheduleConfig, 
  ScheduledAttempt, 
  CampaignSchedule 
} from "./scheduler";

// Import for re-export
import { mailgunService } from "./mailgun";
import { emailTemplateManager } from "./templates";
import { emailScheduler } from "./scheduler";

// Re-export the default instances for convenience
export default {
  mailgun: mailgunService,
  templates: emailTemplateManager,
  scheduler: emailScheduler,
};