import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UsersRepository } from '../db';
import { tokenService } from '../services/token-service';
import { sessionService } from '../services/session-service';
import { authenticate } from '../middleware/auth';
import { 
  ApiResponseBuilder, 
  AuthenticatedRequest, 
  TypedResponse, 
  LoginRequest, 
  LoginResponse 
} from '../../shared/types/api';
import { safeCastToUser } from '../../shared/types/database';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// Login endpoint with secure database authentication
router.post('/login', async (req: AuthenticatedRequest, res: TypedResponse<LoginResponse>) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(
        ApiResponseBuilder.validationError('Invalid login data', validationResult.error.errors)
      );
    }

    const { username, password } = validationResult.data;
    
    // Find user by email or username
    let user = await UsersRepository.findByEmail(username);
    if (!user) {
      user = await UsersRepository.findByUsername(username);
    }
    
    // Check if user exists and is active
    if (!user || !user.active) {
      return res.status(401).json(
        ApiResponseBuilder.authError('Invalid username or password')
      );
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json(
        ApiResponseBuilder.authError('Invalid username or password')
      );
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

// Get current user endpoint with secure authentication
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: TypedResponse) => {
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
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: TypedResponse) => {
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
router.post('/refresh', async (req: AuthenticatedRequest, res: TypedResponse) => {
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

export default router;