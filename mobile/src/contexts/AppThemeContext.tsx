import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  isThemeReady: boolean;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'sentinela_theme_mode';

export function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    async function loadThemePreference() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeModeState(storedTheme);
        }
      } catch (error) {
        console.error('Erro ao carregar tema salvo:', error);
      } finally {
        setIsThemeReady(true);
      }
    }

    loadThemePreference();
  }, []);

  async function setThemeMode(mode: ThemeMode) {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  }

  async function toggleThemeMode() {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      toggleThemeMode,
      isThemeReady,
    }),
    [themeMode, isThemeReady]
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppThemeContext() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppThemeContext must be used within AppThemeProvider');
  }

  return context;
}