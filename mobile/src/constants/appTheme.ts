import { Platform } from 'react-native';

export const AppTheme = {
  light: {
    background: '#F7F7F8',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F3F5',
    card: '#FFFFFF',
    cardMuted: '#F3F4F6',

    text: '#111827',
    textMuted: '#6B7280',
    textSoft: '#9CA3AF',

    border: '#E5E7EB',
    borderStrong: '#D1D5DB',

    primary: '#2563EB',
    primarySoft: '#DBEAFE',
    primaryContrast: '#FFFFFF',

    success: '#059669',
    successSoft: '#D1FAE5',

    danger: '#DC2626',
    dangerSoft: '#FEE2E2',

    warning: '#D97706',
    warningSoft: '#FEF3C7',

    info: '#0891B2',
    infoSoft: '#CFFAFE',

    overlay: 'rgba(17, 24, 39, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.08)',

    inputBackground: '#FFFFFF',
    inputBorder: '#E5E7EB',
    inputBorderFocus: '#2563EB',
    inputPlaceholder: '#9CA3AF',

    drawerBackground: '#F7F7F8',
    drawerSurface: '#FFFFFF',
    drawerActiveBg: '#111827',
    drawerActiveText: '#FFFFFF',
    drawerInactiveText: '#6B7280',
  },

  dark: {
    background: '#212121',
    surface: '#2F2F2F',
    surfaceSecondary: '#3A3A3A',
    card: '#2F2F2F',
    cardMuted: '#383838',

    text: '#ECECEC',
    textMuted: '#B4B4B4',
    textSoft: '#8E8E8E',

    border: '#3A3A3A',
    borderStrong: '#4A4A4A',

    primary: '#3B82F6',
    primarySoft: '#23344D',
    primaryContrast: '#FFFFFF',

    success: '#34D399',
    successSoft: '#1F3A33',

    danger: '#F87171',
    dangerSoft: '#4A2626',

    warning: '#F59E0B',
    warningSoft: '#4A3720',

    info: '#22D3EE',
    infoSoft: '#1E3A44',

    overlay: 'rgba(255, 255, 255, 0.06)',
    shadow: 'rgba(0, 0, 0, 0.25)',

    inputBackground: '#2A2A2A',
    inputBorder: '#454545',
    inputBorderFocus: '#60A5FA',
    inputPlaceholder: '#8E8E8E',

    drawerBackground: '#171717',
    drawerSurface: '#202123',
    drawerActiveBg: '#2F2F2F',
    drawerActiveText: '#FFFFFF',
    drawerInactiveText: '#C5C5D2',
  },
} as const;

export type AppThemeMode = keyof typeof AppTheme;
export type AppThemeColors = (typeof AppTheme)[AppThemeMode];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  title: 24,
  hero: 28,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Shadow = {
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export const BottomTabInset = Platform.select({
  ios: 50,
  android: 80,
  default: 0,
}) ?? 0;

export const MaxContentWidth = 800;