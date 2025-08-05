import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { apiClient } from '../utils/api-client';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Validate token with server
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await apiClient.get('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize login function to prevent unnecessary re-renders
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[LOGIN DEBUG] Sending login request:', { username, password: '***' });

      const response = await apiClient.post('/api/auth/login', { username, password });

      console.log('[LOGIN DEBUG] Response status:', response.status);

      const data = await response.json();
      console.log('[LOGIN DEBUG] Response body:', data);

      if (response.ok && data.success) {
        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Set user
        setUser(data.user);
        setIsLoading(false);

        // Clear service worker cache and reload to ensure fresh content
        if ('serviceWorker' in navigator && 'caches' in window) {
          try {
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            // Unregister service worker
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));

            console.log('Cleared service worker cache and registrations');
          } catch (error) {
            console.warn('Failed to clear service worker cache:', error);
          }
        }

        // Force hard reload to bypass cache
        setTimeout(() => {
          window.location.reload();
        }, 100);
        
        return true;
      } else {
        // Handle error properly - extract message from nested error object
        let errorMessage = 'Login failed';
        if (data.error?.message) {
          errorMessage = data.error.message;
        } else if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error occurred');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Memoize logout function to prevent unnecessary re-renders
  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consuming components
  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error
  }), [user, isLoading, login, logout, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 