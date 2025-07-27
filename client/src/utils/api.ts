import { secureFetch } from './csrf';

/**
 * API Utility with built-in CSRF protection
 * Use this for all API calls instead of raw fetch
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const api = {
  async get<T = any>(url: string, options?: RequestInit): Promise<T> {
    const response = await secureFetch(url, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    return handleResponse<T>(response);
  },
  
  async post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await secureFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    return handleResponse<T>(response);
  },
  
  async put<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await secureFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    return handleResponse<T>(response);
  },
  
  async patch<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await secureFetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    return handleResponse<T>(response);
  },
  
  async delete<T = any>(url: string, options?: RequestInit): Promise<T> {
    const response = await secureFetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    return handleResponse<T>(response);
  }
};

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!response.ok) {
    let error: any;
    
    if (isJson) {
      const data = await response.json();
      error = new ApiError(
        data.error?.message || 'API request failed',
        response.status,
        data.error?.code,
        data.error?.details
      );
    } else {
      const text = await response.text();
      error = new ApiError(text || 'API request failed', response.status);
    }
    
    throw error;
  }
  
  if (isJson) {
    const data: ApiResponse<T> = await response.json();
    
    if (data.success === false && data.error) {
      throw new ApiError(
        data.error.message,
        response.status,
        data.error.code,
        data.error.details
      );
    }
    
    return data.data || data as T;
  }
  
  // Return text for non-JSON responses
  return await response.text() as any;
}

// Auth-specific API calls that include auth tokens
export const authApi = {
  async get<T = any>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    return api.get<T>(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  },
  
  async post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    return api.post<T>(url, data, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  },
  
  async put<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    return api.put<T>(url, data, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  },
  
  async patch<T = any>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    return api.patch<T>(url, data, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  },
  
  async delete<T = any>(url: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('accessToken');
    return api.delete<T>(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  }
};