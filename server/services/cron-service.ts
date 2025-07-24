import { tokenService } from './token-service';

// Simple cron-like scheduler using setInterval
class CronService {
  private static instance: CronService;
  private intervals: NodeJS.Timeout[] = [];
  
  private constructor() {}
  
  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }
  
  /**
   * Schedule a task to run at a specific interval
   * @param name - Name of the task (for logging)
   * @param intervalMs - Interval in milliseconds
   * @param task - Function to execute
   */
  scheduleTask(name: string, intervalMs: number, task: () => Promise<void>) {
    const interval = setInterval(async () => {
      try {
        console.log(`[Cron] Running task: ${name}`);
        await task();
        console.log(`[Cron] Completed task: ${name}`);
      } catch (error) {
        console.error(`[Cron] Error in task ${name}:`, error);
      }
    }, intervalMs);
    
    this.intervals.push(interval);
    console.log(`[Cron] Scheduled task: ${name} every ${intervalMs}ms`);
  }
  
  /**
   * Clear all scheduled tasks
   */
  clearAllTasks() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('[Cron] All tasks cleared');
  }
}

// Export singleton instance
export const cronService = CronService.getInstance();

// Initialize cron jobs
export const initializeCronJobs = async () => {
  // Clean up expired tokens every hour
  cronService.scheduleTask('cleanup-expired-tokens', 60 * 60 * 1000, async () => {
    const count = await tokenService.cleanupExpiredTokens();
    console.log(`[Token Cleanup] Removed ${count} expired tokens`);
  });
  
  console.log('[Cron] All cron jobs initialized');
};