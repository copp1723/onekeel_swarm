/**
 * API Client with CSRF Token Support
 * Handles all API requests with automatic CSRF token management
 */

interface ApiOptions extends RequestInit {
  skipCsrf?: boolean;
}

class ApiClient {
  private csrfToken: string | null = null;
  private baseUrl = '';

  /**
   * Get CSRF token from initial page load or API call
   */
  private async getCsrfToken(): Promise<string | null> {
    // If we already have a token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    try {
      // Make a GET request to obtain a CSRF token
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        // Get token from response header
        const token = response.headers.get('X-CSRF-Token');
        if (token) {
          this.csrfToken = token;
          return token;
        }
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }

    return null;
  }

  /**
   * Make an API request with CSRF token
   */
  async request(url: string, options: ApiOptions = {}): Promise<Response> {
    const { skipCsrf = false, headers = {}, ...restOptions } = options;

    // Build headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add authorization token if present
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add CSRF token for state-changing requests (except auth endpoints)
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (!skipCsrf && !isAuthEndpoint && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        requestHeaders['X-CSRF-Token'] = csrfToken;
      }
    }

    // Make the request
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include' // Always include cookies
    });

    // If we get a new CSRF token in response, update it
    const newCsrfToken = response.headers.get('X-CSRF-Token');
    if (newCsrfToken) {
      this.csrfToken = newCsrfToken;
    }

    // Handle CSRF errors without consuming the response body
    if (response.status === 403) {
      // Check if it's a CSRF error by looking at the response headers or trying to clone
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        if (data.code === 'CSRF_TOKEN_EXPIRED' || data.code === 'CSRF_TOKEN_NOT_FOUND' || data.code === 'CSRF_TOKEN_MISSING') {
          // Clear the token and retry once
          this.csrfToken = null;
          const retryToken = await this.getCsrfToken();
          if (retryToken) {
            requestHeaders['X-CSRF-Token'] = retryToken;
            return fetch(url, {
              ...restOptions,
              headers: requestHeaders,
              credentials: 'include'
            });
          }
        }
      } catch (e) {
        // If we can't parse the response, just return it as-is
        console.error('Failed to parse 403 response:', e);
      }
    }

    return response;
  }

  /**
   * Convenience methods
   */
  async get(url: string, options?: Omit<ApiOptions, 'method'>): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async put(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async delete(url: string, options?: Omit<ApiOptions, 'method'>): Promise<Response> {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  async patch(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for backward compatibility with existing fetch calls
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  return apiClient.request(url, options);
}