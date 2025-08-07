import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment variable for API base URL, with proper fallbacks
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : '');

console.log('[AuthContext] API_BASE_URL:', API_BASE_URL);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Computed property for authentication status
  const isAuthenticated = !!user;

  // Configure axios defaults
  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('[AuthContext] Found token, verifying with /api/auth/me');
      // Verify token is still valid
      axios.get('/api/auth/me')
        .then(response => {
          console.log('[AuthContext] Token valid, user:', response.data.user);
          setUser(response.data.user);
        })
        .catch((error) => {
          console.error('[AuthContext] Token validation failed:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.log('[AuthContext] No token found');
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      console.log('[AuthContext] Attempting login for:', username);
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      });

      const { token, user } = response.data;
      console.log('[AuthContext] Login successful, user:', user);

      localStorage.setItem('token', token);
      // Also set as accessToken for backward compatibility
      localStorage.setItem('accessToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return true; // Login successful
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      console.error('[AuthContext] Login failed:', errorMessage, err);
      setError(errorMessage);
      return false; // Login failed
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('[AuthContext] Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken'); // Remove both for compatibility
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};