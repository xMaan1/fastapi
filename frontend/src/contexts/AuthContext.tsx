'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials } from '@/src/models/auth';
import { apiService } from '@/src/services/ApiService';
import { SessionManager } from '@/src/services/SessionManager';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  role: string;
  joined_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Debug user state changes
  useEffect(() => {
    console.log('AuthContext - User state changed:', { user, isAuthenticated: !!user });
  }, [user]);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const sessionManager = new SessionManager();
        const session = sessionManager.getSession();
        
        if (session && session.token && session.user) {
          console.log('AuthContext - Initializing auth with session:', session.user);
          setUser(session.user);
          
          // Load tenants from localStorage (no API call)
          const storedTenants = apiService.getUserTenants();
          if (storedTenants.length > 0) {
            setTenants(storedTenants);
            
            // Get current tenant from localStorage
            const currentTenant = apiService.getCurrentTenant();
            if (currentTenant) {
              setCurrentTenant(currentTenant);
            } else {
              // Fallback to first tenant if no current tenant is set
              setCurrentTenant(storedTenants[0]);
              apiService.setTenantId(storedTenants[0].id);
            }
          }
        } else {
          console.log('AuthContext - No session found, setting user to null');
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext - Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      console.log('AuthContext - Login attempt with credentials:', credentials);
      setLoading(true);
      const response = await apiService.login(credentials);
      
      console.log('AuthContext - Login response:', response);
      
      if (response.success && response.user) {
        console.log('AuthContext - Login successful, setting user:', response.user);
        setUser(response.user);
        
        // Tenants are already fetched and stored during apiService.login()
        // Just load them from localStorage
        const storedTenants = apiService.getUserTenants();
        console.log('AuthContext - Stored tenants:', storedTenants);
        if (storedTenants.length > 0) {
          setTenants(storedTenants);
          
          // Current tenant is already set during login, just get it
          const currentTenant = apiService.getCurrentTenant();
          console.log('AuthContext - Current tenant:', currentTenant);
          if (currentTenant) {
            setCurrentTenant(currentTenant);
          }
        }
        
        console.log('AuthContext - Login completed successfully');
        return true;
      }
      console.log('AuthContext - Login failed - no success or user in response');
      return false;
    } catch (error) {
      console.error('AuthContext - Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('AuthContext - Logout error:', error);
    } finally {
      const sessionManager = new SessionManager();
      setUser(null);
      setTenants([]);
      setCurrentTenant(null);
      sessionManager.clearSession();
      apiService.setTenantId(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    try {
      // This now uses localStorage, no API call
      const tenant = await apiService.switchTenant(tenantId);
      setCurrentTenant(tenant);
      return true;
    } catch (error) {
      console.error('AuthContext - Failed to switch tenant:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    tenants,
    currentTenant,
    login,
    logout,
    switchTenant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 