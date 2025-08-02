import { db } from '../db/client';
import { auditLogs } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { inviteConfig } from '../config/invite-config';

/**
 * Cleanup service for managing invitation lifecycle
 */
export class InviteCleanupService {
  /**
   * Clean up expired invitations older than configured threshold
   */
  async cleanupExpiredInvites(): Promise<{ cleaned: number; errors: number }> {
    console.log('Starting cleanup of expired invitations...');

    let cleaned = 0;
    let errors = 0;

    try {
      // Get all user_invite audit logs
      const invites = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'user_invite'));

      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - inviteConfig.cleanupExpiredAfterDays
      );

      for (const invite of invites) {
        try {
          const changes =
            typeof invite.changes === 'string'
              ? JSON.parse(invite.changes)
              : invite.changes;

          if (!changes || !changes.expiresAt) continue;

          const expiresAt = new Date(changes.expiresAt);
          const isExpired = expiresAt < new Date();
          const isOldEnoughForCleanup = expiresAt < cutoffDate;

          // Only clean up invites that are both expired AND old enough
          if (isExpired && isOldEnoughForCleanup && !changes.used) {
            await db
              .delete(auditLogs)
              .where(
                and(
                  eq(auditLogs.action, 'user_invite'),
                  eq(auditLogs.resourceId, invite.resourceId!)
                )
              );

            cleaned++;
            console.log(`Cleaned up expired invite for ${changes.email}`);
          }
        } catch (error) {
          console.error(`Error processing invite ${invite.id}:`, error);
          errors++;
        }
      }

      console.log(
        `Cleanup completed: ${cleaned} invites cleaned, ${errors} errors`
      );
    } catch (error) {
      console.error('Error during invite cleanup:', error);
      errors++;
    }

    return { cleaned, errors };
  }

  /**
   * Get statistics about invitations
   */
  async getInviteStats(): Promise<{
    total: number;
    pending: number;
    expired: number;
    used: number;
    expiringSoon: number;
  }> {
    const invites = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'user_invite'));

    let pending = 0;
    let expired = 0;
    let used = 0;
    let expiringSoon = 0;

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    for (const invite of invites) {
      try {
        const changes =
          typeof invite.changes === 'string'
            ? JSON.parse(invite.changes)
            : invite.changes;

        if (!changes || !changes.expiresAt) continue;

        const expiresAt = new Date(changes.expiresAt);

        if (changes.used) {
          used++;
        } else if (expiresAt < now) {
          expired++;
        } else {
          pending++;
          if (expiresAt < soonThreshold) {
            expiringSoon++;
          }
        }
      } catch (error) {
        console.error(`Error processing invite stats for ${invite.id}:`, error);
      }
    }

    return {
      total: invites.length,
      pending,
      expired,
      used,
      expiringSoon,
    };
  }

  /**
   * Send reminder emails for expiring invitations
   */
  async sendExpiryReminders(): Promise<{ sent: number; errors: number }> {
    console.log('Checking for invitations expiring soon...');

    let sent = 0;
    let errors = 0;

    try {
      const invites = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'user_invite'));

      const now = new Date();
      const reminderThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      for (const invite of invites) {
        try {
          const changes =
            typeof invite.changes === 'string'
              ? JSON.parse(invite.changes)
              : invite.changes;

          if (!changes || !changes.expiresAt || changes.used) continue;

          const expiresAt = new Date(changes.expiresAt);

          // Send reminder if expiring within 24 hours and hasn't been reminded
          if (
            expiresAt > now &&
            expiresAt < reminderThreshold &&
            !changes.reminderSent
          ) {
            // Mark as reminder sent to avoid duplicates
            const updatedChanges = {
              ...changes,
              reminderSent: true,
              reminderSentAt: new Date().toISOString(),
            };

            await db
              .update(auditLogs)
              .set({ changes: JSON.stringify(updatedChanges) })
              .where(
                and(
                  eq(auditLogs.action, 'user_invite'),
                  eq(auditLogs.resourceId, invite.resourceId!)
                )
              );

            // TODO: Send actual reminder email here
            console.log(
              `Would send reminder to ${changes.email} (expires ${expiresAt.toLocaleString()})`
            );
            sent++;
          }
        } catch (error) {
          console.error(
            `Error processing reminder for invite ${invite.id}:`,
            error
          );
          errors++;
        }
      }

      console.log(
        `Reminder check completed: ${sent} reminders sent, ${errors} errors`
      );
    } catch (error) {
      console.error('Error during reminder processing:', error);
      errors++;
    }

    return { sent, errors };
  }
}

// Export singleton instance
export const inviteCleanupService = new InviteCleanupService();

// Cron-style scheduler function (if needed)
export function scheduleInviteCleanup() {
  // Run cleanup daily at 2 AM
  const runCleanup = async () => {
    console.log('Running scheduled invite cleanup...');
    const result = await inviteCleanupService.cleanupExpiredInvites();
    console.log('Scheduled cleanup result:', result);

    // Also check for expiry reminders
    const reminderResult = await inviteCleanupService.sendExpiryReminders();
    console.log('Reminder check result:', reminderResult);
  };

  // Calculate milliseconds until next 2 AM
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);

  if (next2AM <= now) {
    next2AM.setDate(next2AM.getDate() + 1);
  }

  const msUntil2AM = next2AM.getTime() - now.getTime();

  // Schedule first run
  setTimeout(() => {
    runCleanup();
    // Then run every 24 hours
    setInterval(runCleanup, 24 * 60 * 60 * 1000);
  }, msUntil2AM);

  console.log(
    `Invite cleanup scheduled to run at ${next2AM.toLocaleString()} and then daily`
  );
}
