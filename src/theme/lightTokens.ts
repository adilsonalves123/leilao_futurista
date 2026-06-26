/** Futurista Fluida — tema claro principal do app Levou */
export const lightColors = {
  background: '#F8F9FD',
  screen: '#FAFAFE',
  sphereLilac: 'rgba(196, 181, 253, 0.55)',
  spherePurple: 'rgba(167, 139, 250, 0.45)',
  sphereViolet: 'rgba(139, 92, 246, 0.35)',
  frostGlass: 'rgba(255, 255, 255, 0.72)',
  frostBorder: 'rgba(255, 255, 255, 0.95)',
  cardShadow: 'rgba(124, 58, 237, 0.12)',
  accent: '#7C3AED',
  accentSoft: '#A78BFA',
  accentMuted: '#F4F0FF',
  textPrimary: '#1A1625',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  border: '#F3F4F6',
  borderAccent: '#E9E0FF',
  inputBg: 'rgba(255, 255, 255, 0.85)',
  inputBorder: 'rgba(124, 58, 237, 0.15)',
  inputFocus: '#7C3AED',
  divider: 'rgba(124, 58, 237, 0.12)',
  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  google: '#FFFFFF',
  apple: '#1E1B2E',
  facebook: '#1877F2',
} as const;

/** Alias semântico — preferir em telas novas */
export const appColors = lightColors;

export const appSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const appRadii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const lightEffects = {
  glassBlurPx: 16,
  sphereBlur: 80,
  cardShadow: {
    shadowColor: lightColors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
