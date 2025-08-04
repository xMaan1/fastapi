'use client';

import { useState, useEffect } from 'react';
import { User, LoginCredentials } from '@/src/models/auth';
import { apiService } from '@/src/services/ApiService';
import { SessionManager } from '@/src/services/SessionManager';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initializeAuth = async () => {
      try {
        const sessionManager = new SessionManager();
        const session = sessionManager.getSession();
        
        if (session && session.token && session.user) {
          // For now, just use the stored user data without API validation
          // to avoid SSR issues. We can validate on protected routes.
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [mounted]);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
        // Session is already stored in apiService.login()
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const sessionManager = new SessionManager();
    setUser(null);
    sessionManager.clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;

  return {
    user,
    login,
    logout,
    loading,
    isAuthenticated,
  };
}