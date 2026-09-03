export const colors = {
  primary: '#FF006E',
  primaryDark: '#D10058',
  secondary: '#8338EC',
  accent: '#FFBE0B',
  background: '#0A0A0F',
  surface: '#1A1A24',
  surfaceElevated: '#252532',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textDisabled: '#606070',
  success: '#06D6A0',
  error: '#EF476F',
  warning: '#FFD166',
  border: '#2A2A3A',
  live: '#FF0000',
  verified: '#3A86FF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
};

/** Build scaled typography from useResponsive().fs */
export const createResponsiveTypography = (fs: (n: number) => number) => ({
  h1: { fontSize: fs(28), fontWeight: '700' as const, lineHeight: fs(34) },
  h2: { fontSize: fs(22), fontWeight: '700' as const, lineHeight: fs(28) },
  h3: { fontSize: fs(18), fontWeight: '600' as const, lineHeight: fs(24) },
  body: { fontSize: fs(16), fontWeight: '400' as const, lineHeight: fs(22) },
  bodySmall: { fontSize: fs(14), fontWeight: '400' as const, lineHeight: fs(20) },
  caption: { fontSize: fs(12), fontWeight: '400' as const, lineHeight: fs(16) },
  button: { fontSize: fs(16), fontWeight: '600' as const, lineHeight: fs(22) },
});
