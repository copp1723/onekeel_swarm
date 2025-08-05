import { db, sessions, UsersRepository } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { tokenService } from './token-service';

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
}

export class SessionService {
  /**
   * Create a new session for a user
   */
  static async createSession(
    userId: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<SessionData | null> {
    try {
      // Generate a secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Create session in database
      const [session] = await db.insert(sessions).values({
        userId,
        token: sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
        createdAt: new Date(),
        lastAccessedAt: new Date()
      }).returning();
      
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }
  
  /**
   * Find session by token
   */
  static async findByToken(token: string): Promise<SessionData | null> {
    try {
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.token, token),
          sql`${sessions.expiresAt} > NOW()`
        ))
        .limit(1);
      
      return session || null;
    } catch (error) {
      console.error('Failed to find session:', error);
      return null;
    }
  }
  
  /**
   * Update session last accessed time
   */
  static async updateLastAccessed(sessionId: string): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ lastAccessedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }
  
  /**
   * Validate session and return user data
   */
  static async validateSession(token: string): Promise<{
    user: any;
    session: SessionData;
  } | null> {
    try {
      const session = await this.findByToken(token);
      if (!session) {
        return null;
      }
      
      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.deleteSession(session.id);
        return null;
      }
      
      // Get user data
      const user = await UsersRepository.findById(session.userId);
      if (!user || !user.active) {
        await this.deleteSession(session.id);
        return null;
      }
      
      // Update last accessed time
      await this.updateLastAccessed(session.id);
      
      return { user, session };
    } catch (error) {
      console.error('Failed to validate session:', error);
      return null;
    }
  }
  
  /**
   * Delete a specific session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }
  
  /**
   * Delete all sessions for a user
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    } catch (error) {
      console.error('Failed to delete user sessions:', error);
    }
  }
  
  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await db.delete(sessions).where(sql`${sessions.expiresAt} < NOW()`);
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }
  
  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessions = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          sql`${sessions.expiresAt} > NOW()`
        ))
        .orderBy(sessions.lastAccessedAt);
      
      return userSessions;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const sessionService = SessionService;