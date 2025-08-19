import { User } from "../models/auth/User";

export interface SessionData {
  token: string;
  user: User;
  expiresAt?: number;
}

class SessionManager {
  private readonly TOKEN_KEY = "auth_token";
  private readonly USER_KEY = "user_data";
  private readonly EXPIRES_KEY = "token_expires";

  // Token management
  setToken(token: string, expiresIn?: number): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(this.TOKEN_KEY, token);

    if (expiresIn) {
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem(this.EXPIRES_KEY, expiresAt.toString());
    }
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);

    if (token && expiresAt) {
      const now = Date.now();
      if (now > parseInt(expiresAt)) {
        this.clearSession();
        return null;
      }
    }

    return token;
  }

  removeToken(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_KEY);
  }

  // User data management
  setUser(user: User): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null;

    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parsing user data:", error);
      this.removeUser();
      return null;
    }
  }

  removeUser(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(this.USER_KEY);
  }

  // Session management
  setSession(token: string, user: User, expiresIn?: number): void {
    this.setToken(token, expiresIn);
    this.setUser(user);
  }

  getSession(): SessionData | null {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) return null;

    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);

    return {
      token,
      user,
      expiresAt: expiresAt ? parseInt(expiresAt) : undefined,
    };
  }

  clearSession(): void {
    this.removeToken();
    this.removeUser();
    // Also clear tenant-related data
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentTenantId");
      localStorage.removeItem("userTenants");
    }
  }

  // Session validation
  isSessionValid(): boolean {
    const token = this.getToken();
    const user = this.getUser();

    return !!(token && user);
  }

  isTokenExpired(): boolean {
    if (typeof window === "undefined") return true;

    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (!expiresAt) return false;

    return Date.now() > parseInt(expiresAt);
  }

  // Session refresh
  refreshSession(): boolean {
    if (this.isTokenExpired()) {
      this.clearSession();
      return false;
    }
    return true;
  }

  // Session events
  onSessionExpired(callback: () => void): void {
    if (typeof window === "undefined") return;

    const checkExpiration = () => {
      if (this.isTokenExpired()) {
        this.clearSession();
        callback();
      }
    };

    // Check every minute
    setInterval(checkExpiration, 60000);
  }

  // Utility methods
  getTokenExpirationTime(): Date | null {
    if (typeof window === "undefined") return null;

    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (!expiresAt) return null;

    return new Date(parseInt(expiresAt));
  }

  getTimeUntilExpiration(): number | null {
    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) return null;

    return Math.max(0, expirationTime.getTime() - Date.now());
  }

  // Debug methods
  getSessionInfo(): {
    hasToken: boolean;
    hasUser: boolean;
    isExpired: boolean;
    expiresAt: Date | null;
    timeUntilExpiration: number | null;
  } {
    return {
      hasToken: !!this.getToken(),
      hasUser: !!this.getUser(),
      isExpired: this.isTokenExpired(),
      expiresAt: this.getTokenExpirationTime(),
      timeUntilExpiration: this.getTimeUntilExpiration(),
    };
  }
}

export { SessionManager };
export default SessionManager;
