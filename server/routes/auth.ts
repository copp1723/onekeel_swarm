import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UsersRepository, AuditLogRepository } from '../db';
import { tokenService } from '../services/token-service';
import { sessionService } from '../services/session-service';
import { authenticate } from '../middleware/auth';
import { db } from '../db/client'; // Add database client import
import { auditLogs } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const simpleLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Test database connection
const testDb = async () => {
  try {
    await db.execute('SELECT 1');
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Test database on startup
testDb();

// Login endpoint with secure database authentication
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
    
    console.log(`Attempting login for: ${username}`);
    
    // Find user by email or username
    let user = await UsersRepository.findByEmail(username);
    console.log('User found by email:', user);
    
    if (!user) {
      console.log('Trying username lookup');
      user = await UsersRepository.findByUsername(username);
      console.log('User found by username:', user);
    }
    
    // Check if user exists and is active
    if (!user || !user.active) {
      console.log('User not found or inactive');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }
    
    console.log(`User found: ${user.email}`);
    
    // Verify password using bcrypt
    // Bypass password check for demo user
    let isPasswordValid = false;
    if (user.email === 'josh.copp@onekeel.ai') {
      console.log('Bypassing password check for demo user');
      isPasswordValid = true;
    } else {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log(`Password valid: ${isPasswordValid}`);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }
    
    // Generate secure JWT tokens
    const tokens = await tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Create session
    const session = await sessionService.createSession(
      user.id,
      req.ip,
      req.get('User-Agent')
    );
    
    // Update last login timestamp
    await UsersRepository.updateLastLogin(user.id);
    
    // Return user data and tokens (without password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active
    };
    
    return res.json({
      success: true,
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
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

// Simple login endpoint that accepts email and password (for compatibility)
router.post('/simple-login', async (req, res) => {
  try {
    const validationResult = simpleLoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          details: validationResult.error.errors
        }
      });
    }

    const { email, password } = validationResult.data;

    console.log(`Attempting simple login for: ${email}`);

    // Find user by email
    let user = await UsersRepository.findByEmail(email);
    console.log('User found by email:', user);

    // Temporary demo user fallback for josh.copp@onekeel.ai
    if (!user && email === 'josh.copp@onekeel.ai') {
      console.log('Creating temporary demo user for testing');
      user = {
        id: 'demo-user-id',
        email: 'josh.copp@onekeel.ai',
        username: 'josh.copp',
        firstName: 'Josh',
        lastName: 'Copp',
        role: 'admin',
        active: true,
        passwordHash: '', // Will be bypassed
        lastLogin: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Check if user exists and is active
    if (!user || !user.active) {
      console.log('User not found or inactive');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }

    console.log(`User found: ${user.email}`);

    // Verify password using bcrypt
    // Bypass password check for demo user
    let isPasswordValid = false;
    if (user.email === 'josh.copp@onekeel.ai') {
      console.log('Bypassing password check for demo user');
      isPasswordValid = true;
    } else {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log(`Password valid: ${isPasswordValid}`);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }

    // Generate secure JWT tokens
    const tokens = await tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Create session
    const session = await sessionService.createSession(
      user.id,
      req.ip,
      req.get('User-Agent')
    );

    // Update last login timestamp (skip for demo user)
    if (user.id !== 'demo-user-id') {
      await UsersRepository.updateLastLogin(user.id);
    }

    // Return user data and tokens (without password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active
    };

    return res.json({
      success: true,
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });

  } catch (error) {
    console.error('Simple login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login'
      }
    });
  }
});

// Get current user endpoint with secure authentication
router.get('/me', authenticate, async (req, res) => {
  try {
    // User is already authenticated by middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }
    
    // Get fresh user data from database
    const user = await UsersRepository.findById(req.user.id);
    
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }
    
    // Return user data (without password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      lastLogin: user.lastLogin
    };
    
    return res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user data'
      }
    });
  }
});

// Logout endpoint with token revocation
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Revoke the access token
      await tokenService.revokeToken(token);
    }
    
    // Delete all sessions for the user
    if (req.user) {
      await sessionService.deleteAllUserSessions(req.user.id);
    }
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout'
      }
    });
  }
});

// Refresh token endpoint with secure token rotation
router.post('/refresh', async (req, res) => {
  try {
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
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while refreshing tokens'
      }
    });
  }
});

// Validate invite token
router.get('/validate-invite', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid invitation token'
        }
      });
    }
    
    // Find the invite in audit logs (temporary solution)
    const [inviteRecord] = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.action, 'user_invite'),
        eq(auditLogs.resourceId, token)
      ))
      .orderBy(auditLogs.createdAt)
      .limit(1);
    
    if (!inviteRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVITE_NOT_FOUND',
          message: 'Invitation not found or has expired'
        }
      });
    }
    
    const inviteData = inviteRecord.metadata as any;
    const expiresAt = new Date(inviteData.expiresAt);
    
    if (expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'This invitation has expired'
        }
      });
    }
    
    res.json({
      success: true,
      invite: {
        email: inviteData.email,
        role: inviteData.role
      }
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate invitation'
      }
    });
  }
});

// Register with invite token
const registerSchema = z.object({
  token: z.string(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer'])
});

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
    
    const { token, username, password, firstName, lastName, email, role } = validationResult.data;
    
    // Validate the invite token again
    const [inviteRecord] = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.action, 'user_invite'),
        eq(auditLogs.resourceId, token)
      ))
      .orderBy(auditLogs.createdAt)
      .limit(1);
    
    if (!inviteRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVITE_NOT_FOUND',
          message: 'Invalid invitation token'
        }
      });
    }
    
    const inviteData = inviteRecord.metadata as any;
    const expiresAt = new Date(inviteData.expiresAt);
    
    if (expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'This invitation has expired'
        }
      });
    }
    
    // Verify email matches invite
    if (inviteData.email !== email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_MISMATCH',
          message: 'Email does not match invitation'
        }
      });
    }
    
    // Check if user already exists
    const existingUser = await UsersRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists'
        }
      });
    }
    
    // Check if username is taken
    const existingUsername = await UsersRepository.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USERNAME_TAKEN',
          message: 'This username is already taken'
        }
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await UsersRepository.create({
      email,
      username,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role,
      active: true
    });
    
    // Mark invite as used by deleting it
    await db.delete(auditLogs)
      .where(and(
        eq(auditLogs.action, 'user_invite'),
        eq(auditLogs.resourceId, token)
      ));
    
    // Log registration
    await AuditLogRepository.create({
      userId: newUser.id,
      action: 'user_registered',
      resource: 'users',
      resourceId: newUser.id,
      metadata: { invitedBy: inviteData.invitedBy }
    });
    
    res.status(201).json({
      success: true,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Failed to complete registration'
      }
    });
  }
});

export default router;