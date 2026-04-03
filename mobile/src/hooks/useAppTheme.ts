import { AppTheme } from '../constants/appTheme';
import { useAppThemeContext } from '../contexts/AppThemeContext';

export function useAppTheme() {
  const { themeMode, setThemeMode, toggleThemeMode, isThemeReady } =
    useAppThemeContext();

  return {
    mode: themeMode,
    colors: AppTheme[themeMode],
    setThemeMode,
    toggleThemeMode,
    isThemeReady,
  };
}