// Standardized API Response Types for Type Safety
import type { Request, Response } from 'express';
import type { User } from '../../server/db/schema';

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  category?: 'validation' | 'authentication' | 'authorization' | 'database' | 'network' | 'internal';
}

// Success response wrapper
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  meta?: {
    queryTime?: number;
    total?: number;
    offset?: number;
    limit?: number;
    hasMore?: boolean;
    [key: string]: any;
  };
}

// Error response wrapper
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

// Combined response type
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Express types with user context
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "agent" | "manager" | "admin" | "viewer";
  };
}

// Typed response helper
export interface TypedResponse<T = any> extends Response {
  json: (body: ApiResponse<T>) => this;
}

// Query parameter types
export interface PaginationQuery {
  limit?: string;
  offset?: string;
  page?: string;
}

export interface SortQuery {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery {
  search?: string;
  q?: string;
}

// Lead-specific types
export interface LeadQuery extends PaginationQuery, SortQuery, SearchQuery {
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  source?: string;
  assignedChannel?: 'email' | 'sms' | 'chat';
  includeStats?: 'true' | 'false';
}

// Campaign-specific types
export interface CampaignQuery extends PaginationQuery, SortQuery, SearchQuery {
  type?: 'drip' | 'blast' | 'trigger';
  active?: 'true' | 'false';
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Validation helpers
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

// Response builders for consistent API responses
export class ApiResponseBuilder {
  static success<T>(data?: T, meta?: ApiSuccessResponse['meta']): ApiSuccessResponse<T> {
    return {
      success: true,
      ...(data !== undefined && { data }),
      ...(meta && { meta })
    };
  }

  static error(
    code: string, 
    message: string, 
    details?: any, 
    category?: ApiError['category']
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        ...(category && { category })
      }
    };
  }

  static validationError(message: string, details?: any): ApiErrorResponse {
    return this.error('VALIDATION_ERROR', message, details, 'validation');
  }

  static authError(message: string): ApiErrorResponse {
    return this.error('AUTHENTICATION_ERROR', message, undefined, 'authentication');
  }

  static notFoundError(resource: string): ApiErrorResponse {
    return this.error('NOT_FOUND', `${resource} not found`);
  }

  static internalError(message: string = 'Internal server error'): ApiErrorResponse {
    return this.error('INTERNAL_ERROR', message, undefined, 'internal');
  }

  static databaseError(message: string = 'Database operation failed'): ApiErrorResponse {
    return this.error('DATABASE_ERROR', message, undefined, 'database');
  }
}

// Type guards for runtime validation
export function validatePaginationQuery(query: any): query is PaginationQuery {
  return (
    (!query.limit || typeof query.limit === 'string') &&
    (!query.offset || typeof query.offset === 'string') &&
    (!query.page || typeof query.page === 'string')
  );
}

export function validateSortQuery(query: any): query is SortQuery {
  return (
    (!query.sort || typeof query.sort === 'string') &&
    (!query.order || ['asc', 'desc'].includes(query.order))
  );
}

export function validateLeadStatus(status: any): status is 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' {
  return ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status);
}

export function validateChannel(channel: any): channel is 'email' | 'sms' | 'chat' {
  return ['email', 'sms', 'chat'].includes(channel);
}