import { Router } from 'express';
import { z } from 'zod';
import { UsersRepository } from '../db';
import { isAuthenticated, generateToken, verifyPassword } from '../middleware/simple-auth';
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

// CSRF token endpoint
router.get('/csrf', async (req: AuthenticatedRequest, res: TypedResponse<{ csrfToken: string }>) => {
  // The CSRF middleware will have already set the token in the response header
  // This endpoint just provides a way for the client to explicitly request a token
  const csrfToken = req.csrfToken || '';
  
  return res.json(
    ApiResponseBuilder.success({ csrfToken }, 'CSRF token generated')
  );
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
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json(
        ApiResponseBuilder.authError('Invalid username or password')
      );
    }
    
    // Generate simple JWT token
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
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
      accessToken: accessToken,
      expiresIn: 86400 // 24 hours in seconds
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

// Get current user endpoint with simplified authentication
router.get('/me', isAuthenticated, async (req: AuthenticatedRequest, res: TypedResponse) => {
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

// Simple logout endpoint
router.post('/logout', isAuthenticated, async (req: AuthenticatedRequest, res: TypedResponse) => {
  try {
    // In a simple system, logout is handled client-side by removing the token
    // Server doesn't need to track token revocation for short-lived tokens
    
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

// Note: Refresh tokens removed in simplified system
// Clients should re-authenticate when tokens expire

export default router;