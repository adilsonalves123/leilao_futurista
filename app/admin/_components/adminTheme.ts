/** Design tokens — Levou Command (admin web · neon cockpit) */
export const adminTheme = {
  navy: '#0A192F',
  navyLight: '#1E3A5F',
  navyMuted: '#112240',

  /** Cyber green — instructions.md */
  neon: '#05FF9B',
  neonDim: '#10B981',
  neonGlow: 'rgba(5, 255, 155, 0.06)',

  contentBg: '#0A110E',
  contentBgAlt: '#080C0A',
  surface: 'rgba(12, 22, 18, 0.94)',
  surfaceMuted: 'rgba(10, 18, 14, 0.82)',

  textPrimary: '#ECFDF5',
  textSecondary: '#A7C4B5',
  textMuted: '#6B8F7A',

  sidebarText: '#F9FAFB',
  sidebarTextMuted: '#94A3B8',
  sidebarBorder: 'rgba(255,255,255,0.08)',

  border: 'rgba(5, 255, 155, 0.07)',
  borderStrong: 'rgba(5, 255, 155, 0.14)',

  accent: '#05FF9B',
  accentHover: '#34D399',
  gold: '#FBBF24',
  goldSoft: 'rgba(251, 191, 36, 0.12)',

  live: '#EF4444',
  success: '#05FF9B',
  successSoft: 'rgba(5, 255, 155, 0.06)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.08)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.08)',
  info: '#05FF9B',
  infoSoft: 'rgba(5, 255, 155, 0.05)',

  shadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(5,255,155,0.03)',
  shadowMd: '0 8px 32px rgba(0,0,0,0.45)',
} as const;

/** Fundo com brilho neon — web only (sutil) */
export const adminContentBgWeb = {
  backgroundColor: adminTheme.contentBg,
  backgroundImage:
    'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(5,255,155,0.045) 0%, transparent 48%), linear-gradient(180deg, #0A110E 0%, #080C0A 100%)',
} as const;

/** @deprecated Use adminTheme — mantido para imports legados */
export const adminC = {
  accent: adminTheme.neon,
  accentBright: adminTheme.neon,
  bg: adminTheme.contentBg,
  surface: adminTheme.surface,
  sidebar: adminTheme.navy,
  textPrimary: adminTheme.textPrimary,
  textSecondary: adminTheme.textSecondary,
  textMuted: adminTheme.textMuted,
  border: adminTheme.border,
  borderStrong: adminTheme.borderStrong,
  danger: adminTheme.danger,
  success: adminTheme.success,
  warning: adminTheme.gold,
  purpleSoft: adminTheme.infoSoft,
  blue: adminTheme.neonDim,
};
