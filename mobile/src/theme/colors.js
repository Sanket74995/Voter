export const colors = {
  primary: '#0F172A', // Deep obsidian navy
  primaryLight: '#1E293B',
  primaryDark: '#020617',
  accent: '#3B82F6', // Vibrant modern blue
  accentIndigo: '#4F46E5', // Royal indigo
  accentPurple: '#7C3AED',
  accentTeal: '#0D9488',
  accentCyan: '#06B6D4',
  accentHover: '#2563EB',
  background: '#F8FAFC', // Slate soft background
  backgroundDark: '#0B0F19',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  borderLight: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  displayLarge: { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.5 },
  titleLarge: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  titleMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: -0.2 },
  titleSmall: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  labelMedium: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  labelSmall: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  badge: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  mono: { fontFamily: 'monospace', fontSize: 13 },
};

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};
