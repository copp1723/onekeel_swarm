// Export all email services and types
export { mailgunService, MailgunService } from "./mailgun";
export type { EmailData, EmailTemplate as MailgunEmailTemplate, EmailResult } from "./mailgun";

export { emailTemplateManager, EmailTemplateManager } from "./templates";
export type { EmailTemplate, CampaignConfig } from "./templates";

export { emailScheduler, EmailScheduler } from "./scheduler";
export type { 
  AttemptConfig, 
  CampaignScheduleConfig, 
  ScheduledAttempt, 
  CampaignSchedule 
} from "./scheduler";

// Re-export the default instances for convenience
export default {
  mailgun: mailgunService,
  templates: emailTemplateManager,
  scheduler: emailScheduler,
};