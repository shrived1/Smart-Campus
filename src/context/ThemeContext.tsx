import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'smartcampus_theme';
export const DEFAULT_THEME: ThemeMode = 'dark';

export interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  isLightMode: boolean;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * Resolves the initial theme mode, strictly defaulting to 'dark' unless the user
 * has explicitly selected and persisted 'light'.
 */
export function resolveInitialTheme(storedValue?: string | null): ThemeMode {
  if (storedValue === 'light') {
    return 'light';
  }
  return DEFAULT_THEME;
}

/**
 * Reads the persisted theme safely from storage (returns 'dark' when unavailable).
 */
export function readStoredTheme(storage?: Pick<Storage, 'getItem'> | null): ThemeMode {
  try {
    const targetStorage =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : null;
    if (!targetStorage) return DEFAULT_THEME;
    return resolveInitialTheme(targetStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Synchronizes the active theme onto <html> (data-theme, classList, and native color-scheme)
 * so Tailwind CSS tokens and browser form controls update atomically.
 */
export function applyThemeToDocument(
  theme: ThemeMode,
  doc: Document | null = typeof document !== 'undefined' ? document : null
): void {
  if (!doc || !doc.documentElement) return;
  const root = doc.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = readStoredTheme();
    applyThemeToDocument(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      // Ignore storage quota / private-mode write failures
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme === 'light' ? 'light' : 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      isLightMode: theme === 'light',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
