import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { users, auditLogs } from '../db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { 
      role, 
      active, 
      search,
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (role) {
      conditions.push(eq(users.role, role as any));
    }
    
    if (active !== undefined) {
      conditions.push(eq(users.active, active === 'true'));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.username, searchPattern)
        )
      );
    }

    // Execute query
    const query = db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: users.lastLogin
      })
      .from(users)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    const sortColumn = users[sort as keyof typeof users];
    if (sortColumn) {
      if (order === 'desc') {
        query.orderBy(desc(sortColumn));
      } else {
        query.orderBy(sortColumn);
      }
    }

    const userList = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    res.json({
      success: true,
      users: userList,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USERS_FETCH_ERROR',
        message: 'Failed to fetch users',
        category: 'database'
      }
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: users.lastLogin
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_ERROR',
        message: 'Failed to fetch user',
        category: 'database'
      }
    });
  }
});

// Create user
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).default('viewer'),
  metadata: z.record(z.any()).optional()
});

router.post('/', validateRequest({ body: createUserSchema }), async (req, res) => {
  try {
    const userData = req.body;
    
    // Check for duplicate email or username
    const [existing] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, userData.email),
          eq(users.username, userData.username)
        )
      )
      .limit(1);
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_USER',
          message: existing.email === userData.email 
            ? 'A user with this email already exists'
            : 'A user with this username already exists'
        }
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        passwordHash: hashedPassword,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_CREATE_ERROR',
        message: 'Failed to create user',
        category: 'database'
      }
    });
  }
});

// Update user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

router.put('/:id', validateRequest({ body: updateUserSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if email is being updated and if it's already taken
    if (updates.email) {
      const [existing] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, updates.email),
          sql`id != ${id}`
        ))
        .limit(1);
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists'
          }
        });
      }
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: users.lastLogin
      });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_UPDATE_ERROR',
        message: 'Failed to update user',
        category: 'database'
      }
    });
  }
});

// Toggle user active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Toggle status
    const [updatedUser] = await db
      .update(users)
      .set({
        active: !user.active,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLogin: users.lastLogin
      });

    res.json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_TOGGLE_ERROR',
        message: 'Failed to toggle user status',
        category: 'database'
      }
    });
  }
});

// Update user password
const updatePasswordSchema = z.object({
  currentPassword: z.string().optional(), // Optional for admin reset
  newPassword: z.string().min(8)
});

router.patch('/:id/password', validateRequest({ body: updatePasswordSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const requestingUserId = (req as any).userId; // From auth middleware
    const requestingUserRole = (req as any).userRole; // From auth middleware
    
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check permissions
    if (requestingUserId !== id && requestingUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only change your own password'
        }
      });
    }

    // Verify current password if not admin
    if (requestingUserRole !== 'admin' || requestingUserId === id) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CURRENT_PASSWORD_REQUIRED',
            message: 'Current password is required'
          }
        });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect'
          }
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_UPDATE_ERROR',
        message: 'Failed to update password',
        category: 'database'
      }
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_DELETE_ERROR',
        message: 'Failed to delete user',
        category: 'database'
      }
    });
  }
});

// Get user activity/audit logs
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = '30', limit = 100 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, id),
          sql`created_at >= ${startDate}`
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(Number(limit));

    res.json({
      success: true,
      activity: logs,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIVITY_FETCH_ERROR',
        message: 'Failed to fetch user activity',
        category: 'database'
      }
    });
  }
});

// Get user stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get various stats for the user
    const loginCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, id),
          eq(auditLogs.action, 'login')
        )
      );

    const recentActions = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)::int`
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, id))
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalLogins: loginCount[0]?.count || 0,
        recentActions
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_ERROR',
        message: 'Failed to fetch user statistics',
        category: 'database'
      }
    });
  }
});

export default router;