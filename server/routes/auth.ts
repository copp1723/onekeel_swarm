import { Router } from 'express';
import { z } from 'zod';

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
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  // If SKIP_AUTH is true, always refresh
  if (skipAuth) {
    return res.json({
      success: true,
      accessToken: 'skip-auth-token-' + Date.now(),
      refreshToken: 'skip-auth-refresh-' + Date.now(),
      expiresIn: 86400
    });
  }

  return res.json({
    success: true,
    accessToken: 'refreshed-token-' + Date.now(),
    refreshToken: 'refreshed-refresh-' + Date.now(),
    expiresIn: 3600
  });
});

export default router;