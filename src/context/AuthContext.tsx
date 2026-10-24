import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types/index.js';
import { api, getStoredToken, setStoredToken } from '../services/api.js';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      }
    } catch {
      // Token expired or invalid
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<string> => {
    const res = await api.login(identifier, password);
    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.redirectUrl;
    }
    throw new Error('Authentication failed');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
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
