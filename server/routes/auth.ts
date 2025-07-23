import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: validationResult.error.errors
        }
      });
    }

    const { username, password } = validationResult.data;
    
    // Hardcoded admin login for immediate access
    if (username === 'admin@onekeel.com' && password === 'password123') {
      const result = {
        user: {
          id: 'admin-1',
          email: 'admin@onekeel.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          active: true
        },
        accessToken: 'hardcoded-jwt-token-' + Date.now(),
        refreshToken: 'hardcoded-refresh-token-' + Date.now(),
        expiresIn: 3600
      };

      return res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      });
    }
    
    // Mock additional users
    const mockUsers = [
      {
        username: 'manager@onekeel.com',
        password: 'manager123',
        user: {
          id: 'manager-1',
          email: 'manager@onekeel.com',
          username: 'manager',
          firstName: 'Manager',
          lastName: 'User',
          role: 'manager',
          active: true
        }
      },
      {
        username: 'agent@onekeel.com',
        password: 'agent123',
        user: {
          id: 'agent-1',
          email: 'agent@onekeel.com',
          username: 'agent',
          firstName: 'Agent',
          lastName: 'User',
          role: 'agent',
          active: true
        }
      }
    ];

    const matchedUser = mockUsers.find(u => u.username === username && u.password === password);
    if (matchedUser) {
      return res.json({
        success: true,
        user: matchedUser.user,
        accessToken: `token-${matchedUser.user.id}-${Date.now()}`,
        refreshToken: `refresh-${matchedUser.user.id}-${Date.now()}`,
        expiresIn: 3600
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Login failed',
        category: 'authentication'
      }
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: validationResult.error.errors
        }
      });
    }

    const { email, username, password, firstName, lastName, role } = validationResult.data;
    
    // Mock user creation
    const user = {
      id: `user-${Date.now()}`,
      email,
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'agent',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      user,
      accessToken: `token-${user.id}-${Date.now()}`,
      refreshToken: `refresh-${user.id}-${Date.now()}`,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Registration failed',
        category: 'authentication'
      }
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid refresh token data',
          details: validationResult.error.errors
        }
      });
    }

    const { refreshToken } = validationResult.data;
    
    // Mock token refresh - in real implementation, validate the refresh token
    if (refreshToken.startsWith('refresh-') || refreshToken.startsWith('hardcoded-refresh-token-')) {
      const userId = refreshToken.includes('admin') ? 'admin-1' : `user-${Date.now()}`;
      
      res.json({
        success: true,
        user: {
          id: userId,
          username: 'refreshed-user',
          email: 'user@onekeel.com',
          role: 'agent',
          active: true
        },
        accessToken: `token-${userId}-${Date.now()}`,
        refreshToken: `refresh-${userId}-${Date.now()}`,
        expiresIn: 3600
      });
    } else {
      return res.status(401).json({ 
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'Token refresh failed',
        category: 'authentication'
      }
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    // Mock logout - in real implementation, invalidate the tokens
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Logout failed',
        category: 'authentication'
      }
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Mock current user - in real implementation, get from auth token
    const user = {
      id: 'admin-1',
      email: 'admin@onekeel.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'USER_FETCH_ERROR',
        message: 'Failed to get user',
        category: 'authentication'
      }
    });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password change data',
          details: validationResult.error.errors
        }
      });
    }

    const { currentPassword, newPassword } = validationResult.data;
    
    // Mock password change
    res.json({ 
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: 'Failed to change password',
        category: 'authentication'
      }
    });
  }
});

// Create default admin (development only)
router.post('/create-default-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not allowed in production'
      }
    });
  }
  
  try {
    res.json({ 
      success: true,
      message: 'Default admin created',
      credentials: {
        email: 'admin@onekeel.com',
        username: 'admin',
        password: 'password123' // Only shown in development
      }
    });
  } catch (error) {
    console.error('Create default admin error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'ADMIN_CREATE_ERROR',
        message: 'Failed to create default admin',
        category: 'authentication'
      }
    });
  }
});

export default router;