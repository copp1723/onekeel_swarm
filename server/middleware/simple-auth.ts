import { authenticateToken } from './auth';
import { AuthenticatedRequest } from '../../shared/types/middleware';

// Simple alias for our existing auth middleware
export const isAuthenticated = authenticateToken;

// Export the AuthenticatedRequest type for use in routes
export type { AuthenticatedRequest };
