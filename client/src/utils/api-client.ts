/**
 * Simple API client for making authenticated requests
 */

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    category?: string;
  };
}

class ApiClient {
  private baseURL: string;

  constructor() {
    // Support production deployment with environment variable
    const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envBase) {
      // For production, use the full URL
      this.baseURL = envBase.endsWith('/api') ? envBase : `${envBase}/api`;
      console.log('[ApiClient] Using production API:', this.baseURL);
    } else {
      // For development, use proxy
      this.baseURL = '/api';
      console.log('[ApiClient] Using development proxy: /api');
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization token if available - use 'token' to match AuthContext
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
      console.log('[ApiClient] Token found, adding Authorization header');
    } else {
      console.warn('[ApiClient] No token found in localStorage');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      console.log(`[ApiClient] ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[ApiClient] Failed to parse JSON response:', parseError);
        data = { error: { message: 'Invalid JSON response from server' } };
      }

      if (!response.ok) {
        console.error(`[ApiClient] Request failed: ${response.status} ${response.statusText}`, data);
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      console.log('[ApiClient] Request successful:', data);
      return {
        success: true,
        data: data.campaign || data.campaigns || data.agents || data.agent || data,
      };
    } catch (error) {
      console.error('[ApiClient] Network error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
