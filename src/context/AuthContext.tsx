import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthUser, UserRole } from '../types/index.js';
import {
  PRODUCTION_API_ORIGIN,
  buildApiUrl,
  configureApiInterceptor,
  getStoredToken,
  sanitizeEnvApiOrigin,
  setApiBaseOrigin,
  setInterceptorAuthToken,
  setStoredToken,
} from '../lib/api.js';
import { api } from '../services/api.js';

export function resolveAuthApiBaseUrl(hostname?: string, envBaseUrl?: string): string {
  const effectiveHost =
    hostname !== undefined ? hostname : typeof window !== 'undefined' ? window.location.hostname : '';
  const effectiveEnv =
    arguments.length >= 2 ? envBaseUrl : (import.meta.env.VITE_API_BASE_URL as string | undefined);

  const cleanHost = effectiveHost.trim().toLowerCase();
  const isVercelDeployment = cleanHost === 'vercel.app' || cleanHost.endsWith('.vercel.app');

  // When running on Vercel, use an empty base ('') so requests resolve to relative '/api/...' paths
  if (isVercelDeployment) {
    return '';
  }

  const validEnvOrigin = sanitizeEnvApiOrigin(effectiveEnv);
  if (validEnvOrigin) {
    return validEnvOrigin;
  }

  const isLocalOrPreviewServer =
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.endsWith('.run.app');

  if (isLocalOrPreviewServer) {
    return '';
  }

  // On non-Vercel static hosts (e.g. GitHub Pages), target the full deployed production URL
  return PRODUCTION_API_ORIGIN;
}

const initialApiBaseUrl = resolveAuthApiBaseUrl();
setApiBaseOrigin(initialApiBaseUrl);

export const AUTH_LOGIN_ENDPOINT = buildApiUrl('/api/auth/login', initialApiBaseUrl);

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  apiBaseUrl: string;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<string>;
  demoLogin: (role: UserRole) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiBaseUrl] = useState<string>(() => {
    const resolved = resolveAuthApiBaseUrl();
    setApiBaseOrigin(resolved);
    return resolved;
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const initialToken = getStoredToken();
    setInterceptorAuthToken(initialToken);
    return initialToken;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tokenRef = useRef<string | null>(token);

  const syncTokenState = (nextToken: string | null) => {
    tokenRef.current = nextToken;
    setInterceptorAuthToken(nextToken);
    setStoredToken(nextToken);
    setToken(nextToken);
  };

  // Register AuthContext token provider and global 401 Unauthorized handler with src/lib/api.ts
  useEffect(() => {
    setApiBaseOrigin(apiBaseUrl);
    const unregister = configureApiInterceptor({
      getToken: () => tokenRef.current ?? getStoredToken(),
      onUnauthorized: () => {
        tokenRef.current = null;
        setToken(null);
        setUser(null);
      },
    });
    return unregister;
  }, [apiBaseUrl]);

  const fetchCurrentUser = async () => {
    const currentToken = tokenRef.current ?? getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setApiBaseOrigin(apiBaseUrl);
      setInterceptorAuthToken(currentToken);
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        syncTokenState(null);
        setUser(null);
      }
    } catch {
      // Token expired or invalid (401 already handled by interceptor)
      syncTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setApiBaseOrigin(apiBaseUrl);
    fetchCurrentUser();
  }, [apiBaseUrl]);

  const login = async (identifier: string, password: string): Promise<string> => {
    setApiBaseOrigin(apiBaseUrl);
    const res = await api.login(identifier, password);
    if (res.success && res.token && res.user) {
      syncTokenState(res.token);
      setUser(res.user);
      return res.redirectUrl;
    }
    throw new Error('Authentication failed');
  };

  const demoLogin = async (role: UserRole): Promise<string> => {
    setApiBaseOrigin(apiBaseUrl);
    const res = await api.demoLogin(role);
    if (res.success && res.token && res.user) {
      syncTokenState(res.token);
      setUser(res.user);
      return res.redirectUrl;
    }
    throw new Error('Demo authentication failed');
  };

  const logout = async () => {
    try {
      setApiBaseOrigin(apiBaseUrl);
      await api.logout();
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      syncTokenState(null);
      setUser(null);
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      window.location.href = `${basePath}/login`;
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, apiBaseUrl, isLoading, login, demoLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
