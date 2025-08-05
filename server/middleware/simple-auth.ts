import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from './auth.js';

// Simple alias for our existing auth middleware
export const isAuthenticated = authenticateToken;

// Export the AuthRequest type for use in routes
export type { AuthRequest };
