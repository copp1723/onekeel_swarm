import { emailTemplateManager } from './templates';
import { mailgunService } from './mailgun';

export interface AttemptConfig {
  attemptNumber: number;
  templateId: string;
  delayHours: number;
  delayDays: number;
  conditions?: {
    skipIfResponded?: boolean;
    skipIfOpened?: boolean;
    maxAttempts?: number;
  };
}

export interface CampaignScheduleConfig {
  name: string;
  description?: string;
  attempts: AttemptConfig[];
  isActive?: boolean;
}

export interface ScheduledAttempt {
  id: string;
  scheduleId: string;
  leadId: string;
  attemptNumber: number;
  templateId: string;
  scheduledFor: Date;
  status: 'scheduled' | 'sent' | 'failed' | 'skipped';
  variables: Record<string, any>;
  sentAt?: Date;
  messageId?: string;
  errorMessage?: string;
}

export interface CampaignSchedule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  attempts: AttemptConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export class EmailScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private schedules: Map<string, CampaignSchedule> = new Map();
  private scheduledAttempts: Map<string, ScheduledAttempt> = new Map();

  constructor() {
    this.startScheduler();
  }

  /**
   * Create a new multi-attempt campaign schedule
   */
  async createSchedule(config: CampaignScheduleConfig): Promise<string> {
    const scheduleId = `schedule_${Date.now()}`;
    const now = new Date();

    const schedule: CampaignSchedule = {
      id: scheduleId,
      name: config.name,
      description: config.description || '',
      isActive: config.isActive ?? true,
      attempts: config.attempts,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(scheduleId, schedule);

    console.log(
      `Multi-attempt schedule "${config.name}" created with ${config.attempts.length} attempts`
    );

    return scheduleId;
  }

  /**
   * Enroll a lead in a multi-attempt campaign
   */
  async enrollLead(
    scheduleId: string,
    leadId: string,
    variables: Record<string, any> = {}
  ): Promise<void> {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule || !schedule.isActive) {
      throw new Error('Campaign schedule not found or inactive');
    }

    const now = new Date();

    // Create scheduled attempts for this lead
    for (const attempt of schedule.attempts) {
      const scheduledFor = new Date(now);
      scheduledFor.setHours(scheduledFor.getHours() + attempt.delayHours);
      scheduledFor.setDate(scheduledFor.getDate() + attempt.delayDays);

      const attemptId = `attempt_${scheduleId}_${leadId}_${attempt.attemptNumber}_${Date.now()}`;

      const scheduledAttempt: ScheduledAttempt = {
        id: attemptId,
        scheduleId,
        leadId,
        attemptNumber: attempt.attemptNumber,
        templateId: attempt.templateId,
        scheduledFor,
        status: 'scheduled',
        variables,
      };

      this.scheduledAttempts.set(attemptId, scheduledAttempt);
    }

    console.log(
      `Lead ${leadId} enrolled in multi-attempt schedule "${schedule.name}"`
    );
  }

  /**
   * Process scheduled email attempts
   */
  async processScheduledAttempts(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // Get all scheduled attempts that are due
      const dueAttempts = Array.from(this.scheduledAttempts.values())
        .filter(
          attempt =>
            attempt.status === 'scheduled' && attempt.scheduledFor <= now
        )
        .slice(0, 50); // Process in batches

      for (const attempt of dueAttempts) {
        try {
          await this.processAttempt(attempt);
        } catch (error) {
          console.error(`Failed to process attempt ${attempt.id}:`, error);

          // Mark attempt as failed
          attempt.status = 'failed';
          attempt.errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.scheduledAttempts.set(attempt.id, attempt);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process individual email attempt
   */
  private async processAttempt(attempt: ScheduledAttempt): Promise<void> {
    // Check if we should skip this attempt based on conditions
    const shouldSkip = await this.shouldSkipAttempt(attempt);
    if (shouldSkip) {
      attempt.status = 'skipped';
      this.scheduledAttempts.set(attempt.id, attempt);
      return;
    }

    // Get template and render email
    const variables = {
      ...attempt.variables,
      firstName: attempt.variables.firstName || '',
      lastName: attempt.variables.lastName || '',
      teamName: attempt.variables.teamName || 'your team',
      ...attempt.variables,
    };

    const rendered = emailTemplateManager.renderTemplate(
      attempt.templateId,
      variables
    );
    if (!rendered) {
      throw new Error(`Template ${attempt.templateId} not found`);
    }

    // Get email from variables
    const email = attempt.variables.email;
    if (!email) {
      throw new Error(`No email found for lead ${attempt.leadId}`);
    }

    // Send email
    const emailResult = await mailgunService.sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    // Update attempt status
    attempt.status = emailResult.success ? 'sent' : 'failed';
    attempt.sentAt = emailResult.success ? new Date() : undefined;
    attempt.messageId = emailResult.messageId || undefined;
    attempt.errorMessage = emailResult.error || undefined;

    this.scheduledAttempts.set(attempt.id, attempt);

    console.log(
      `Multi-attempt email ${emailResult.success ? 'sent' : 'failed'} to ${email} (Attempt ${attempt.attemptNumber})`
    );
  }

  /**
   * Check if attempt should be skipped based on conditions
   */
  private async shouldSkipAttempt(attempt: ScheduledAttempt): Promise<boolean> {
    const schedule = this.schedules.get(attempt.scheduleId);
    if (!schedule) return true;

    const attemptConfig = schedule.attempts.find(
      a => a.attemptNumber === attempt.attemptNumber
    );
    if (!attemptConfig?.conditions) return false;

    // Check max attempts
    if (attemptConfig.conditions.maxAttempts) {
      const sentCount = Array.from(this.scheduledAttempts.values()).filter(
        a => a.leadId === attempt.leadId && a.status === 'sent'
      ).length;

      if (sentCount >= attemptConfig.conditions.maxAttempts) {
        return true;
      }
    }

    // Additional conditions can be added here
    // skipIfResponded, skipIfOpened would require tracking opens/responses

    return false;
  }

  /**
   * Get campaign schedule status
   */
  async getScheduleStatus(scheduleId: string): Promise<any> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Get attempt statistics
    const attempts = Array.from(this.scheduledAttempts.values()).filter(
      a => a.scheduleId === scheduleId
    );

    const stats = {
      total: attempts.length,
      scheduled: attempts.filter(a => a.status === 'scheduled').length,
      sent: attempts.filter(a => a.status === 'sent').length,
      failed: attempts.filter(a => a.status === 'failed').length,
      skipped: attempts.filter(a => a.status === 'skipped').length,
    };

    return {
      schedule,
      stats,
      enrolledLeads: [...new Set(attempts.map(a => a.leadId))].length,
    };
  }

  /**
   * Get upcoming scheduled attempts
   */
  async getUpcomingAttempts(hours: number = 24): Promise<ScheduledAttempt[]> {
    const now = new Date();
    const until = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return Array.from(this.scheduledAttempts.values()).filter(
      attempt =>
        attempt.status === 'scheduled' &&
        attempt.scheduledFor >= now &&
        attempt.scheduledFor <= until
    );
  }

  /**
   * Start the scheduler to process attempts automatically
   */
  private startScheduler(): void {
    // Check for due attempts every 5 minutes
    this.intervalId = setInterval(
      () => {
        this.processScheduledAttempts().catch(console.error);
      },
      5 * 60 * 1000
    );

    console.log('Email scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Email scheduler stopped');
    }
  }

  /**
   * Get all active schedules
   */
  async getActiveSchedules(): Promise<CampaignSchedule[]> {
    return Array.from(this.schedules.values()).filter(s => s.isActive);
  }

  /**
   * Pause/resume a schedule
   */
  async toggleSchedule(scheduleId: string, isActive: boolean): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    schedule.isActive = isActive;
    schedule.updatedAt = new Date();
    this.schedules.set(scheduleId, schedule);

    console.log(`Email schedule ${isActive ? 'activated' : 'paused'}`);
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): CampaignSchedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): CampaignSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    // Remove all scheduled attempts for this schedule
    const attemptsToRemove = Array.from(this.scheduledAttempts.values()).filter(
      a => a.scheduleId === scheduleId
    );

    attemptsToRemove.forEach(attempt => {
      this.scheduledAttempts.delete(attempt.id);
    });

    // Remove the schedule
    this.schedules.delete(scheduleId);

    console.log(`Email schedule "${schedule.name}" deleted`);
    return true;
  }

  /**
   * Get attempts for a specific lead
   */
  getLeadAttempts(leadId: string): ScheduledAttempt[] {
    return Array.from(this.scheduledAttempts.values()).filter(
      a => a.leadId === leadId
    );
  }

  /**
   * Cancel scheduled attempts for a lead
   */
  async cancelLeadAttempts(leadId: string): Promise<number> {
    const attempts = this.getLeadAttempts(leadId);
    let canceledCount = 0;

    attempts.forEach(attempt => {
      if (attempt.status === 'scheduled') {
        attempt.status = 'skipped';
        this.scheduledAttempts.set(attempt.id, attempt);
        canceledCount++;
      }
    });

    console.log(
      `Canceled ${canceledCount} scheduled attempts for lead ${leadId}`
    );
    return canceledCount;
  }
}

// Export singleton instance
export const emailScheduler = new EmailScheduler();
