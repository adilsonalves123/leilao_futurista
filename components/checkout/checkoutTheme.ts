import { lightColors } from '@/src/theme/lightTokens';

export const checkoutC = {
  bg: lightColors.background,
  accent: '#7C3AED',
  accentBright: '#8B5CF6',
  accentSoft: '#FAF5FF',
  accentBorder: '#EDE9FE',
  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  gold: '#B45309',
  goldSoft: '#FFFBEB',
  goldBorder: '#FDE68A',
  text: lightColors.textPrimary,
  textSecondary: lightColors.textSecondary,
  textMuted: lightColors.textMuted,
  card: 'rgba(255, 255, 255, 0.88)',
  cardBorder: 'rgba(255, 255, 255, 0.98)',
  shadow: lightColors.cardShadow,
  divider: lightColors.divider,
  inputBg: lightColors.inputBg,
  inputBorder: lightColors.inputBorder,
} as const;
