import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SessionsRepository, UsersRepository } from '../db';
import { User } from '../db/schema';
import { environmentConfig } from '../config';

const JWT_SECRET = process.env.JWT_SECRET || environmentConfig.security.sessionSecret || 'ccl3-jwt-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'ccl3-refresh-secret-change-in-production';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenService {
  private static instance: TokenService;
  
  private constructor() {}
  
  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }
  
  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<GeneratedTokens> {
    // Generate access token (1 hour expiry)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      } as TokenPayload,
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Generate refresh token (7 days expiry)
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tokenId: uuidv4()
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    await SessionsRepository.create(
      user.id,
      refreshToken,
      expiresAt,
      undefined, // IP address will be added by auth middleware
      undefined  // User agent will be added by auth middleware
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  }
  
  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Verify refresh token and generate new tokens
   */
  async refreshTokens(refreshToken: string): Promise<GeneratedTokens | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { userId: string; tokenId: string };
      
      // Check if refresh token exists in database and is not expired
      const session = await SessionsRepository.findByToken(refreshToken);
      if (!session) {
        return null;
      }
      
      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await SessionsRepository.deleteByToken(refreshToken);
        return null;
      }
      
      // Get user
      const user = await UsersRepository.findById(decoded.userId);
      if (!user || !user.active) {
        return null;
      }
      
      // Delete old refresh token
      await SessionsRepository.deleteByToken(refreshToken);
      
      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Revoke a refresh token
   */
  async revokeToken(token: string): Promise<boolean> {
    return await SessionsRepository.deleteByToken(token);
  }
  
  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    return await SessionsRepository.deleteByUserId(userId);
  }
  
  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    return await SessionsRepository.deleteExpired();
  }
}

// Export singleton instance
export const tokenService = TokenService.getInstance();
export default tokenService;