/**
 * CSRF Token Management for Client
 * Automatically includes CSRF tokens in API requests
 */

// Get CSRF token from cookie
export const getCsrfToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Refresh CSRF token by making a GET request
export const refreshCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      // Token will be set in cookie by server
      return getCsrfToken();
    }
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
  }
  return null;
};

// Enhanced fetch that automatically includes CSRF token
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Only add CSRF token for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  if (needsCsrf) {
    let csrfToken = getCsrfToken();
    
    // If no token, try to refresh it
    if (!csrfToken) {
      csrfToken = await refreshCsrfToken();
    }
    
    if (csrfToken) {
      // Add CSRF token to headers
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': csrfToken
      };
    }
  }
  
  // Always include credentials for cookie-based auth
  options.credentials = options.credentials || 'include';
  
  const response = await fetch(url, options);
  
  // If CSRF token is invalid, refresh and retry once
  if (response.status === 403 && needsCsrf) {
    const error = await response.json();
    if (error.error?.code === 'CSRF_VALIDATION_FAILED' || error.error?.code === 'CSRF_TOKEN_EXPIRED') {
      const newToken = await refreshCsrfToken();
      if (newToken) {
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': newToken
        };
        return fetch(url, options);
      }
    }
  }
  
  return response;
};

// Hook for React components
import { useEffect, useState } from 'react';

export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Get initial token
    setCsrfToken(getCsrfToken());
    
    // Refresh token periodically (every 45 minutes)
    const interval = setInterval(async () => {
      const newToken = await refreshCsrfToken();
      if (newToken) {
        setCsrfToken(newToken);
      }
    }, 45 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return csrfToken;
};