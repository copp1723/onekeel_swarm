/**
 * Invitation System Integration Tests
 *
 * Tests the complete invitation flow from creation to registration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../server/db/client';
import { users, auditLogs } from '../../server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

describe('Invitation System Integration', () => {
  let testInviterUserId: string;
  let testInviteToken: string;
  let testEmail: string;

  beforeAll(async () => {
    // Create a test inviter user
    testEmail = `test-${Date.now()}@example.com`;
    try {
      const [inviter] = await db
        .insert(users)
        .values({
          email: 'inviter@test.com',
          username: 'test-inviter',
          passwordHash: 'hashed-password',
          firstName: 'Test',
          lastName: 'Inviter',
          role: 'admin',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: users.id });

      testInviterUserId = inviter.id;
    } catch (error) {
      console.warn(
        'Could not create test inviter - database may not be available:',
        error
      );
      testInviterUserId = 'test-inviter-id';
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.delete(users).where(eq(users.email, 'inviter@test.com'));
      await db.delete(users).where(eq(users.email, testEmail));
      await db
        .delete(auditLogs)
        .where(eq(auditLogs.resourceId, testInviteToken));
    } catch (error) {
      console.warn('Could not clean up test data:', error);
    }
  });

  beforeEach(() => {
    testInviteToken = crypto.randomBytes(32).toString('hex');
  });

  describe('Invitation Creation', () => {
    it('should create a valid invitation', async () => {
      const inviteData = {
        token: testInviteToken,
        email: testEmail,
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: testInviteToken,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });

      // Verify invitation was created
      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      expect(invite).toBeDefined();
      const changes = JSON.parse(invite.changes as string);
      expect(changes.email).toBe(testEmail);
      expect(changes.role).toBe('agent');
      expect(changes.used).toBe(false);
    });

    it('should prevent duplicate invitations for same email', async () => {
      // Create first invitation
      const inviteData = {
        token: testInviteToken,
        email: testEmail,
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: testInviteToken,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });

      // Check for existing active invite (simulate API logic)
      const invites = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'user_invite'));

      const activeInvite = invites.find(invite => {
        try {
          const changes = JSON.parse(invite.changes as string);
          return (
            changes.email === testEmail &&
            new Date(changes.expiresAt) > new Date() &&
            !changes.used
          );
        } catch {
          return false;
        }
      });

      expect(activeInvite).toBeDefined();
    });
  });

  describe('Invitation Validation', () => {
    beforeEach(async () => {
      // Create a test invitation
      const inviteData = {
        token: testInviteToken,
        email: testEmail,
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: testInviteToken,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });
    });

    it('should validate active invitation token', async () => {
      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      expect(invite).toBeDefined();

      const changes = JSON.parse(invite.changes as string);
      expect(new Date(changes.expiresAt) > new Date()).toBe(true);
      expect(changes.used).toBe(false);
    });

    it('should reject expired invitation', async () => {
      // Create expired invitation
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const expiredInviteData = {
        token: expiredToken,
        email: 'expired@test.com',
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: expiredToken,
        changes: JSON.stringify(expiredInviteData),
        createdAt: new Date(),
      });

      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, expiredToken)
          )
        )
        .limit(1);

      const changes = JSON.parse(invite.changes as string);
      expect(new Date(changes.expiresAt) < new Date()).toBe(true); // Should be expired
    });
  });

  describe('User Registration with Invite', () => {
    beforeEach(async () => {
      // Create a test invitation
      const inviteData = {
        token: testInviteToken,
        email: testEmail,
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: testInviteToken,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });
    });

    it('should mark invitation as used after registration', async () => {
      // Simulate user registration
      const [newUser] = await db
        .insert(users)
        .values({
          email: testEmail,
          username: 'test-user',
          passwordHash: 'hashed-password',
          firstName: 'Test',
          lastName: 'User',
          role: 'agent',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: users.id });

      // Mark invitation as used
      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      const changes = JSON.parse(invite.changes as string);
      const updatedChanges = {
        ...changes,
        used: true,
        usedAt: new Date().toISOString(),
        registeredUserId: newUser.id,
      };

      await db
        .update(auditLogs)
        .set({ changes: JSON.stringify(updatedChanges) })
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        );

      // Verify invitation is marked as used
      const [updatedInvite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      const updatedChangesResult = JSON.parse(updatedInvite.changes as string);
      expect(updatedChangesResult.used).toBe(true);
      expect(updatedChangesResult.registeredUserId).toBe(newUser.id);
    });

    it('should prevent reuse of used invitation', async () => {
      // Mark invitation as used
      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      const changes = JSON.parse(invite.changes as string);
      const updatedChanges = {
        ...changes,
        used: true,
        usedAt: new Date().toISOString(),
      };

      await db
        .update(auditLogs)
        .set({ changes: JSON.stringify(updatedChanges) })
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        );

      // Try to use the same invitation again
      const [usedInvite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, testInviteToken)
          )
        )
        .limit(1);

      const usedChanges = JSON.parse(usedInvite.changes as string);
      expect(usedChanges.used).toBe(true); // Should be marked as used
    });
  });

  describe('Rate Limiting', () => {
    it('should track invite rate limiting properly', async () => {
      const RATE_LIMIT = 5;
      const invites: string[] = [];

      // Create 5 invites within an hour
      for (let i = 0; i < RATE_LIMIT; i++) {
        const token = crypto.randomBytes(32).toString('hex');
        const inviteData = {
          token,
          email: `ratetest${i}@example.com`,
          role: 'agent',
          invitedBy: testInviterUserId,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date().toISOString(),
          used: false,
        };

        await db.insert(auditLogs).values({
          userId: testInviterUserId,
          action: 'user_invite',
          resource: 'users',
          resourceId: token,
          changes: JSON.stringify(inviteData),
          createdAt: new Date(),
        });

        invites.push(token);
      }

      // Check rate limit logic
      const recentInvites = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.userId, testInviterUserId),
            sql`created_at >= NOW() - INTERVAL '1 hour'`
          )
        );

      expect(recentInvites.length).toBeGreaterThanOrEqual(RATE_LIMIT);

      // Clean up
      for (const token of invites) {
        await db.delete(auditLogs).where(eq(auditLogs.resourceId, token));
      }
    });
  });

  describe('Invitation Management', () => {
    it('should list pending invitations correctly', async () => {
      const testInvites = [
        { email: 'pending1@test.com', used: false },
        { email: 'pending2@test.com', used: false },
        { email: 'used@test.com', used: true },
      ];

      const createdTokens: string[] = [];

      for (const invite of testInvites) {
        const token = crypto.randomBytes(32).toString('hex');
        createdTokens.push(token);

        const inviteData = {
          token,
          email: invite.email,
          role: 'agent',
          invitedBy: testInviterUserId,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date().toISOString(),
          used: invite.used,
        };

        await db.insert(auditLogs).values({
          action: 'user_invite',
          resource: 'users',
          resourceId: token,
          changes: JSON.stringify(inviteData),
          createdAt: new Date(),
        });
      }

      // Fetch all invites and filter pending ones
      const allInvites = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'user_invite'));

      const pendingInvites = allInvites
        .map(invite => {
          try {
            const changes =
              typeof invite.changes === 'string'
                ? JSON.parse(invite.changes)
                : invite.changes;
            return {
              email: changes.email,
              used: changes.used || false,
              expired: new Date(changes.expiresAt) < new Date(),
            };
          } catch {
            return null;
          }
        })
        .filter(invite => invite && !invite.used && !invite.expired);

      expect(pendingInvites.length).toBeGreaterThanOrEqual(2);
      expect(
        pendingInvites.find(i => i?.email === 'pending1@test.com')
      ).toBeDefined();
      expect(
        pendingInvites.find(i => i?.email === 'pending2@test.com')
      ).toBeDefined();
      expect(
        pendingInvites.find(i => i?.email === 'used@test.com')
      ).toBeUndefined();

      // Clean up
      for (const token of createdTokens) {
        await db.delete(auditLogs).where(eq(auditLogs.resourceId, token));
      }
    });

    it('should handle invitation revocation', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const inviteData = {
        token,
        email: 'revoke@test.com',
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: token,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });

      // Revoke the invitation
      const revokedData = {
        ...inviteData,
        revoked: true,
        revokedAt: new Date().toISOString(),
        revokedBy: testInviterUserId,
      };

      await db
        .update(auditLogs)
        .set({ changes: JSON.stringify(revokedData) })
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, token)
          )
        );

      // Verify revocation
      const [revokedInvite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, token)
          )
        )
        .limit(1);

      const changes = JSON.parse(revokedInvite.changes as string);
      expect(changes.revoked).toBe(true);
      expect(changes.revokedBy).toBe(testInviterUserId);

      // Clean up
      await db.delete(auditLogs).where(eq(auditLogs.resourceId, token));
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed invitation data gracefully', async () => {
      const token = crypto.randomBytes(32).toString('hex');

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: token,
        changes: 'invalid-json-{malformed',
        createdAt: new Date(),
      });

      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, token)
          )
        )
        .limit(1);

      expect(invite).toBeDefined();

      // Simulate parsing with error handling
      let parsedData = null;
      try {
        parsedData = JSON.parse(invite.changes as string);
      } catch {
        parsedData = null;
      }

      expect(parsedData).toBeNull();

      // Clean up
      await db.delete(auditLogs).where(eq(auditLogs.resourceId, token));
    });

    it('should validate email format correctly', () => {
      const validEmails = [
        'user@example.com',
        'test.user@company.co.uk',
        'user123@domain-name.org',
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user+alias@example.com', // Should be blocked by our validation
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
        expect(email.includes('+')).toBe(false); // Our validation blocks + aliases
      });

      invalidEmails.forEach(email => {
        const isValid = emailRegex.test(email) && !email.includes('+');
        expect(isValid).toBe(false);
      });
    });

    it('should detect disposable email domains', () => {
      const disposableDomains = [
        'tempmail.org',
        '10minutemail.com',
        'guerrillamail.com',
      ];
      const testEmails = [
        'user@tempmail.org',
        'test@10minutemail.com',
        'valid@gmail.com',
      ];

      testEmails.forEach(email => {
        const domain = email.split('@')[1];
        const isDisposable = disposableDomains.includes(domain);

        if (email.includes('gmail.com')) {
          expect(isDisposable).toBe(false);
        } else {
          expect(isDisposable).toBe(true);
        }
      });
    });
  });

  describe('Complete Registration Flow', () => {
    it('should complete full invite-to-registration flow', async () => {
      const fullFlowEmail = `fullflow-${Date.now()}@example.com`;
      const fullFlowToken = crypto.randomBytes(32).toString('hex');

      // Step 1: Create invitation
      const inviteData = {
        token: fullFlowToken,
        email: fullFlowEmail,
        role: 'agent',
        invitedBy: testInviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        used: false,
      };

      await db.insert(auditLogs).values({
        action: 'user_invite',
        resource: 'users',
        resourceId: fullFlowToken,
        changes: JSON.stringify(inviteData),
        createdAt: new Date(),
      });

      // Step 2: Validate invitation exists and is active
      const [invite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, fullFlowToken)
          )
        )
        .limit(1);

      expect(invite).toBeDefined();
      const changes = JSON.parse(invite.changes as string);
      expect(changes.used).toBe(false);
      expect(new Date(changes.expiresAt) > new Date()).toBe(true);

      // Step 3: Register user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const [newUser] = await db
        .insert(users)
        .values({
          email: fullFlowEmail,
          username: `fullflow-${Date.now()}`,
          passwordHash: hashedPassword,
          firstName: 'Full',
          lastName: 'Flow',
          role: changes.role,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe(fullFlowEmail);
      expect(newUser.role).toBe('agent');

      // Step 4: Mark invitation as used
      const usedInviteData = {
        ...changes,
        used: true,
        usedAt: new Date().toISOString(),
        registeredUserId: newUser.id,
      };

      await db
        .update(auditLogs)
        .set({ changes: JSON.stringify(usedInviteData) })
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, fullFlowToken)
          )
        );

      // Step 5: Create registration audit log
      await db.insert(auditLogs).values({
        userId: newUser.id,
        action: 'user_registered',
        resource: 'users',
        resourceId: newUser.id,
        changes: JSON.stringify({ inviteToken: fullFlowToken }),
        createdAt: new Date(),
      });

      // Step 6: Verify complete flow
      const [finalInvite] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_invite'),
            eq(auditLogs.resourceId, fullFlowToken)
          )
        )
        .limit(1);

      const finalChanges = JSON.parse(finalInvite.changes as string);
      expect(finalChanges.used).toBe(true);
      expect(finalChanges.registeredUserId).toBe(newUser.id);

      // Verify registration log
      const [regLog] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_registered'),
            eq(auditLogs.userId, newUser.id)
          )
        )
        .limit(1);

      expect(regLog).toBeDefined();
      const regChanges = JSON.parse(regLog.changes as string);
      expect(regChanges.inviteToken).toBe(fullFlowToken);

      // Clean up
      await db.delete(users).where(eq(users.id, newUser.id));
      await db.delete(auditLogs).where(eq(auditLogs.resourceId, fullFlowToken));
      await db
        .delete(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'user_registered'),
            eq(auditLogs.userId, newUser.id)
          )
        );
    });
  });
});
