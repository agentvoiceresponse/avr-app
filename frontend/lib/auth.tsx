'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getApiUrl, getStoredToken, setStoredToken } from './api';

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

interface TokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  exp?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        setStoredToken(null);
      }
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStoredToken(null);
    router.replace('/login');
  }, [router]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const { message } = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(Array.isArray(message) ? message.join(', ') : message ?? 'Login failed');
      }

      const { access_token: accessToken } = await response.json();
      const decoded = decodeToken(accessToken);
      if (!decoded) {
        throw new Error('Token non valido');
      }
      setStoredToken(accessToken);
      setToken(accessToken);
      setUser(decoded);
      router.replace('/overview');
    },
    [router],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.loading, auth.isAuthenticated, router]);

  return auth;
}
