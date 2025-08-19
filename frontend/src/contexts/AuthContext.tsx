"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, LoginCredentials } from "@/src/models/auth";
import { apiService } from "@/src/services/ApiService";
import { SessionManager } from "@/src/services/SessionManager";

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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const sessionManager = new SessionManager();
        
        // Check if session exists and is valid
        if (sessionManager.isSessionValid() && !sessionManager.isTokenExpired()) {
          const session = sessionManager.getSession();
          
          if (session && session.token && session.user) {
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
            // Session exists but data is corrupted, clear it
            sessionManager.clearSession();
            setUser(null);
          }
        } else {
          // No valid session, clear any corrupted data
          sessionManager.clearSession();
          setUser(null);
        }
      } catch (error) {
        console.error("AuthContext - Auth initialization error:", error);
        // Clear session on error
        const sessionManager = new SessionManager();
        sessionManager.clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiService.login(credentials);

      if (response.success && response.user) {
        setUser(response.user);

        // Tenants are already fetched and stored during apiService.login()
        // Just load them from localStorage
        const storedTenants = apiService.getUserTenants();
        if (storedTenants.length > 0) {
          setTenants(storedTenants);

          // Current tenant is already set during login, just get it
          const currentTenant = apiService.getCurrentTenant();
          if (currentTenant) {
            setCurrentTenant(currentTenant);
          }
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("AuthContext - Login failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("AuthContext - Logout error:", error);
    } finally {
      const sessionManager = new SessionManager();
      setUser(null);
      setTenants([]);
      setCurrentTenant(null);
      sessionManager.clearSession();
      apiService.setTenantId(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
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
      console.error("AuthContext - Failed to switch tenant:", error);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
