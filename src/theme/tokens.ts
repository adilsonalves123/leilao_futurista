/** Aetherion Auctions design tokens — see instructions.md Pillar 4 */
export const colors = {
  background: '#0A0A0C',
  glass: 'rgba(18, 20, 28, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  neonCyan: '#00F2FE',
  neonPink: '#FF007A',
  cyberGreen: '#05FF9B',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
} as const;

export const fonts = {
  timer: 'Orbitron_700Bold',
  timerRegular: 'Orbitron_400Regular',
  body: 'System',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** HUD / glass effect helpers — Pillar 4 */
export const effects = {
  glassBlurPx: 12,
  hudGlow: 'rgba(0, 242, 254, 0.45)',
  hudGlowSoft: 'rgba(0, 242, 254, 0.12)',
  hudGlowPink: 'rgba(255, 0, 122, 0.25)',
  gridLine: 'rgba(0, 242, 254, 0.06)',
  scanline: 'rgba(0, 242, 254, 0.14)',
  cornerBracket: '#00F2FE',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const auctionStateColors = {
  active: colors.neonCyan,
  ending: colors.neonPink,
  won: colors.cyberGreen,
} as const;

/** Platform commission (10%) */
export const PLATFORM_COMMISSION_RATE = 0.1;

/** Anti-snipe window in seconds */
export const ANTI_SNIPE_SECONDS = 30;
