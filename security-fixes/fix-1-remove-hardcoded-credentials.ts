// FIX 1: Remove Hardcoded Admin Credentials
// File: server/routes/auth.ts

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { tokenService } from '../services/token-service';
import { UsersRepository } from '../db';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Add rate limiting to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced validation schemas with stricter rules
const loginSchema = z.object({
  username: z.string().min(1).max(255).email('Invalid email format'),
  password: z.string().min(8).max(100), // Enforce minimum password length
});

// SECURE Login endpoint - NO HARDCODED CREDENTIALS
router.post('/login', loginLimiter, async (req, res) => {
  try {
    // REMOVED: Skip auth bypass
    // REMOVED: Hardcoded credentials check

    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          // Don't expose detailed validation errors in production
          details:
            process.env.NODE_ENV === 'development'
              ? validationResult.error.errors
              : undefined,
        },
      });
    }

    const { username, password } = validationResult.data;

    // Find user in database
    const user = await UsersRepository.findByEmail(username);

    if (!user || !user.active) {
      // Generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Log failed attempt for security monitoring
      console.warn(`Failed login attempt for user: ${username}`);

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // Generate secure tokens
    const tokens = await tokenService.generateTokens(user);

    // Update last login
    await UsersRepository.updateLastLogin(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        active: user.active,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    console.error('Login error:', error);
    // Don't expose internal errors
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
});

// Remove the /me endpoint that allowed skip auth
router.get('/me', async (req, res) => {
  // REMOVED: Skip auth check

  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTH',
        message: 'Authorization header required',
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = await tokenService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    // Get fresh user data
    const user = await UsersRepository.findById(decoded.userId);

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
        },
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
      },
    });
  }
});

export default router;
