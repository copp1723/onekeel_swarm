import { Router } from 'express';
import { z } from 'zod';
import { tokenService } from '../services/token-service';
import { UsersRepository } from '../db';

const router = Router();

// Check if auth should be skipped
const skipAuth = process.env.SKIP_AUTH === 'true';

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // If SKIP_AUTH is true, auto-login as admin
    if (skipAuth) {
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
        accessToken: 'skip-auth-token-' + Date.now(),
        refreshToken: 'skip-auth-refresh-' + Date.now(),
        expiresIn: 86400 // 24 hours
      };

      return res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      });
    }

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
    
    
    // First try to find user in database
    const user = await UsersRepository.findByEmail(username);
    
    if (user && user.active) {
      // In a real implementation, you would verify the password here
      // For now, we'll assume the password is correct for any non-hardcoded user
      // Generate real tokens
      const tokens = await tokenService.generateTokens(user);
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          active: user.active
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      });
    }
    
    // Hardcoded admin login for immediate access
    if (username === 'admin@onekeel.com' && password === 'password123') {
      // Create a mock user object that matches the User type
      const mockUser = {
        id: 'admin-1',
        email: 'admin@onekeel.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        active: true
      } as any;
      
      // Generate real tokens
      const tokens = await tokenService.generateTokens(mockUser);
      
      return res.json({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          active: mockUser.active
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      });
    }
    // Default: Invalid credentials
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login'
      }
    });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  // If SKIP_AUTH is true, return admin user
  if (skipAuth) {
    return res.json({
      success: true,
      user: {
        id: 'admin-1',
        email: 'admin@onekeel.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        active: true
      }
    });
  }

  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTH',
        message: 'Authorization header required'
      }
    });
  }

  // Mock authentication - in production, verify JWT token here
  return res.json({
    success: true,
    user: {
      id: 'admin-1',
      email: 'admin@onekeel.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true
    }
  });
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await tokenService.revokeToken(token);
  }
  
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  // If SKIP_AUTH is true, always refresh
  if (skipAuth) {
    // Create a mock user for skip auth mode
    const mockUser = {
      id: 'admin-1',
      email: 'admin@onekeel.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true
    } as any;
    
    // Generate real tokens
    const tokens = await tokenService.generateTokens(mockUser);
    
    return res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });
  }
  
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required'
      }
    });
  }
  
  // Use token service to refresh tokens
  const newTokens = await tokenService.refreshTokens(refreshToken);
  
  if (!newTokens) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      }
    });
  }
  
  return res.json({
    success: true,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresIn: newTokens.expiresIn
  });
});

export default router;