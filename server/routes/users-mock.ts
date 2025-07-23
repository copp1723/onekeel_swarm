import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

const userQuerySchema = z.object({
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional()
});

// Mock users data
const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@onekeel.com',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    active: true,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'user-2',
    email: 'manager@onekeel.com',
    username: 'manager',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    active: true,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 'user-3',
    email: 'agent@onekeel.com',
    username: 'agent',
    firstName: 'Agent',
    lastName: 'User',
    role: 'agent',
    active: true,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

// Get all users
router.get('/', async (req, res) => {
  try {
    const validationResult = userQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      });
    }

    const { role, active, search } = validationResult.data;
    
    let filteredUsers = [...mockUsers];
    
    // Apply filters
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    
    if (active !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.active === active);
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.username?.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({ 
      success: true,
      users: filteredUsers 
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
    const user = mockUsers.find(u => u.id === req.params.id);
    
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

// Update user
router.put('/:id', async (req, res) => {
  try {
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user data',
          details: validationResult.error.errors
        }
      });
    }

    const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const updates = validationResult.data;
    const updatedUser = {
      ...mockUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    mockUsers[userIndex] = updatedUser;
    
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
    const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const user = mockUsers[userIndex];
    const updatedUser = {
      ...user,
      active: !user.active,
      updatedAt: new Date().toISOString()
    };
    
    mockUsers[userIndex] = updatedUser;
    
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

// Get user activity/audit logs
router.get('/:id/activity', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    
    // Mock activity data
    const activity = [
      {
        id: 'activity-1',
        action: 'login',
        resource: 'auth',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: 'activity-2',
        action: 'view',
        resource: 'leads',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: 'activity-3',
        action: 'create',
        resource: 'campaign',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      }
    ];
    
    res.json({ 
      success: true,
      activity,
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

// Get user's recent actions
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const { limit = '100' } = req.query;
    
    // Mock audit logs
    const logs = [
      {
        id: 'log-1',
        userId: req.params.id,
        action: 'update',
        resource: 'lead',
        resourceId: 'lead-123',
        changes: { status: 'qualified' },
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1'
      },
      {
        id: 'log-2',
        userId: req.params.id,
        action: 'create',
        resource: 'campaign',
        resourceId: 'campaign-456',
        changes: { name: 'New Campaign' },
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1'
      }
    ];
    
    res.json({ 
      success: true,
      logs: logs.slice(0, parseInt(limit as string))
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'AUDIT_LOGS_ERROR',
        message: 'Failed to fetch audit logs',
        category: 'database'
      }
    });
  }
});

// Cleanup expired sessions
router.post('/cleanup-sessions', async (req, res) => {
  try {
    // Mock cleanup
    const cleaned = Math.floor(Math.random() * 10) + 1;
    
    res.json({ 
      success: true,
      cleaned,
      message: `Cleaned up ${cleaned} expired sessions`
    });
  } catch (error) {
    console.error('Error cleaning sessions:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'SESSION_CLEANUP_ERROR',
        message: 'Failed to cleanup sessions',
        category: 'system'
      }
    });
  }
});

export default router;