import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FeedbackService {
  private notifications: Map<string, Notification[]> = new Map();
  private connections: Map<string, any> = new Map();

  /**
   * Register a WebSocket connection for a user
   */
  registerConnection(userId: string, ws: any): void {
    this.connections.set(userId, ws);
    logger.info('User WebSocket connection registered', { userId });
  }

  /**
   * Unregister a WebSocket connection for a user
   */
  unregisterConnection(userId: string): void {
    this.connections.delete(userId);
    logger.info('User WebSocket connection unregistered', { userId });
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string
  ): Promise<string> {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(notification);

    // Send via WebSocket if connected
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      } catch (error) {
        logger.error('Failed to send WebSocket notification', { 
          userId, 
          error: (error as Error).message 
        });
      }
    }

    logger.info('Notification sent', { 
      userId, 
      notificationId: notification.id,
      type,
      title 
    });

    return notification.id;
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notifications.get(userId) || [];
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    notification.updatedAt = new Date();

    logger.info('Notification marked as read', { userId, notificationId });
    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    let markedCount = 0;
    userNotifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.updatedAt = new Date();
        markedCount++;
      }
    });

    logger.info('All notifications marked as read', { userId, count: markedCount });
    return markedCount;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index === -1) return false;

    userNotifications.splice(index, 1);

    logger.info('Notification deleted', { userId, notificationId });
    return true;
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    const count = userNotifications.length;
    this.notifications.delete(userId);

    logger.info('All notifications cleared', { userId, count });
    return count;
  }

  /**
   * Send system-wide notification
   */
  async sendSystemNotification(
    type: Notification['type'],
    title: string,
    message: string
  ): Promise<void> {
    const connectedUsers = Array.from(this.connections.keys());
    
    await Promise.all(
      connectedUsers.map(userId => 
        this.sendNotification(userId, type, title, message)
      )
    );

    logger.info('System notification sent', { 
      userCount: connectedUsers.length,
      type,
      title 
    });
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    totalNotifications: number;
    unreadNotifications: number;
    connectedUsers: number;
  }> {
    const totalUsers = this.notifications.size;
    const connectedUsers = this.connections.size;
    
    let totalNotifications = 0;
    let unreadNotifications = 0;
    
    this.notifications.forEach(userNotifications => {
      totalNotifications += userNotifications.length;
      unreadNotifications += userNotifications.filter(n => !n.read).length;
    });

    return {
      totalUsers,
      totalNotifications,
      unreadNotifications,
      connectedUsers
    };
  }
}

export const feedbackService = new FeedbackService();