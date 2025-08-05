export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  category: "welcome" | "followup" | "reminder" | "approval" | "custom";
}

export interface CampaignConfig {
  id: string;
  name: string;
  description: string;
  templates: EmailTemplate[];
  triggerConditions: {
    leadStatus?: string[];
    daysSinceLastContact?: number;
    vehicleInterest?: string[];
    creditScore?: string;
  };
}

class EmailTemplateManager {
  private templates: Map<string, EmailTemplate> = new Map();
  private campaigns: Map<string, CampaignConfig> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultCampaigns();
  }

  private initializeDefaultTemplates() {
    const templates: EmailTemplate[] = [
      {
        id: "welcome_onekeel",
        name: "Welcome - OneKeel Platform",
        category: "welcome",
        subject: "Welcome to OneKeel, {{firstName}}!",
        variables: ["firstName", "teamName"],
        html: this.getWelcomeOneKeelTemplate(),
        text: this.getWelcomeOneKeelTextTemplate(),
      },
      {
        id: "followup_24h",
        name: "Follow-up - 24 Hours",
        category: "followup",
        subject: "{{firstName}}, let's get your team organized",
        variables: ["firstName", "teamName"],
        html: this.getFollowup24hTemplate(),
        text: this.getFollowup24hTextTemplate(),
      },
      {
        id: "followup_3day",
        name: "Follow-up - 3 Days",
        category: "followup",
        subject: "{{firstName}}, your team is waiting",
        variables: ["firstName", "teamName"],
        html: this.getFollowup3DayTemplate(),
        text: this.getFollowup3DayTextTemplate(),
      },
      {
        id: "reminder_weekly",
        name: "Weekly Reminder",
        category: "reminder",
        subject: "Weekly update: {{teamName}} progress",
        variables: ["firstName", "teamName", "progressMetrics"],
        html: this.getWeeklyReminderTemplate(),
        text: this.getWeeklyReminderTextTemplate(),
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private initializeDefaultCampaigns() {
    const campaigns: CampaignConfig[] = [
      {
        id: "onboarding_sequence",
        name: "User Onboarding Sequence",
        description: "Automated onboarding sequence for new users",
        templates: [
          this.templates.get("welcome_onekeel")!,
          this.templates.get("followup_24h")!,
          this.templates.get("followup_3day")!,
        ],
        triggerConditions: {
          leadStatus: ["new", "registered"],
        },
      },
      {
        id: "team_engagement",
        name: "Team Engagement Campaign",
        description: "Keep teams engaged with regular updates",
        templates: [this.templates.get("reminder_weekly")!],
        triggerConditions: {
          daysSinceLastContact: 7,
        },
      },
    ];

    campaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign);
    });
  }

  // Template creation and management methods
  createTemplate(template: Omit<EmailTemplate, "id">): EmailTemplate {
    const id = `custom_${Date.now()}`;
    const newTemplate: EmailTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<EmailTemplate>): EmailTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = { ...template, ...updates, id };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  getTemplate(id: string): EmailTemplate | null {
    return this.templates.get(id) || null;
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: EmailTemplate["category"]): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  // Campaign management methods
  createCampaign(campaign: Omit<CampaignConfig, "id">): CampaignConfig {
    const id = `campaign_${Date.now()}`;
    const newCampaign: CampaignConfig = { ...campaign, id };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  getCampaign(id: string): CampaignConfig | null {
    return this.campaigns.get(id) || null;
  }

  getAllCampaigns(): CampaignConfig[] {
    return Array.from(this.campaigns.values());
  }

  // Template rendering with variable substitution
  renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): { subject: string; html: string; text: string } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const renderString = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    return {
      subject: renderString(template.subject),
      html: renderString(template.html),
      text: renderString(template.text),
    };
  }

  // Default template content methods
  private getWelcomeOneKeelTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to OneKeel</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Your Team Coordination Platform</p>
        </div>
        
        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi {{firstName}}!</h2>
          
          <p style="color: #374151; line-height: 1.6;">Welcome to OneKeel! We're excited to help you and your team {{teamName}} stay organized and productive.</p>
          
          <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">Getting Started</h3>
            <ul style="color: #1f2937; margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Set up your team workspace</li>
              <li style="margin: 8px 0;">Invite team members</li>
              <li style="margin: 8px 0;">Create your first project</li>
              <li style="margin: 8px 0;">Explore collaboration tools</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://onekeel.com/dashboard" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Get Started
            </a>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">If you have any questions, feel free to reach out to our support team. We're here to help!</p>
        </div>
      </div>
    `;
  }

  private getWelcomeOneKeelTextTemplate(): string {
    return `
Hi {{firstName}},

Welcome to OneKeel! We're excited to help you and your team {{teamName}} stay organized and productive.

Getting Started:
- Set up your team workspace
- Invite team members
- Create your first project
- Explore collaboration tools

Get started: https://onekeel.com/dashboard

If you have any questions, feel free to reach out to our support team. We're here to help!

Best regards,
The OneKeel Team
    `;
  }

  private getFollowup24hTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Ready to organize {{teamName}}?</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Let's get your team set up</p>
        </div>
        
        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi {{firstName}},</h2>
          
          <p style="color: #374151; line-height: 1.6;">We noticed you joined OneKeel yesterday. Have you had a chance to explore your team workspace yet?</p>
          
          <div style="background: #f0fdf4; border: 2px solid #059669; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #065f46;">Quick Setup Checklist</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;">✓ Create your team profile</li>
              <li style="margin: 8px 0;">✓ Invite team members</li>
              <li style="margin: 8px 0;">✓ Set up your first project</li>
              <li style="margin: 8px 0;">✓ Configure notifications</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://onekeel.com/setup" 
               style="background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Complete Setup
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private getFollowup24hTextTemplate(): string {
    return `
Ready to organize {{teamName}}?

Hi {{firstName}},

We noticed you joined OneKeel yesterday. Have you had a chance to explore your team workspace yet?

Quick Setup Checklist:
- Create your team profile
- Invite team members
- Set up your first project
- Configure notifications

Complete setup: https://onekeel.com/setup

Best regards,
The OneKeel Team
    `;
  }

  private getFollowup3DayTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">{{firstName}}, {{teamName}} is waiting!</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Complete your OneKeel setup</p>
        </div>
        
        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Don't let your team down</h2>
          
          <p style="color: #374151; line-height: 1.6;">Your team {{teamName}} is ready to be organized, but your OneKeel workspace is still incomplete.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">What you're missing:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Streamlined team communication</li>
              <li style="margin: 8px 0;">Project tracking and deadlines</li>
              <li style="margin: 8px 0;">Collaborative workspaces</li>
              <li style="margin: 8px 0;">Progress monitoring tools</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://onekeel.com/complete-setup" 
               style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Complete Setup Now
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private getFollowup3DayTextTemplate(): string {
    return `
{{firstName}}, {{teamName}} is waiting!

Don't let your team down

Your team {{teamName}} is ready to be organized, but your OneKeel workspace is still incomplete.

What you're missing:
- Streamlined team communication
- Project tracking and deadlines
- Collaborative workspaces
- Progress monitoring tools

Complete setup: https://onekeel.com/complete-setup

Best regards,
The OneKeel Team
    `;
  }

  private getWeeklyReminderTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Weekly Update: {{teamName}}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Your team's progress this week</p>
        </div>
        
        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi {{firstName}},</h2>
          
          <p style="color: #374151; line-height: 1.6;">Here's your weekly summary for {{teamName}}:</p>
          
          <div style="background: #f3e8ff; border: 1px solid #7c3aed; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #6b21a8;">This Week's Highlights</h3>
            <p style="color: #374151; margin: 0;">{{progressMetrics}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://onekeel.com/dashboard" 
               style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Full Report
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private getWeeklyReminderTextTemplate(): string {
    return `
Weekly Update: {{teamName}}

Hi {{firstName}},

Here's your weekly summary for {{teamName}}:

This Week's Highlights:
{{progressMetrics}}

View full report: https://onekeel.com/dashboard

Best regards,
The OneKeel Team
    `;
  }
}

// Export singleton instance
export const emailTemplateManager = new EmailTemplateManager();
export default emailTemplateManager;