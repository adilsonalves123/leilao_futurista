/** Layout web — usuários (notebook / desktop) */
export const WEB_LAYOUT = {
  /** Largura máxima do app no notebook */
  maxContentWidth: 1120,
  /** A partir daqui: sidebar + sem tab bar inferior */
  wideBreakpoint: 900,
  /** Celular no browser — frame estreito opcional */
  narrowMaxWidth: 520,
  /** KYC com selfie ao vivo: bloqueado no desktop/notebook */
  kycDesktopMinWidth: 768,
} as const;

export const WEB_GRADIENT_BG = '#E8ECF8';
