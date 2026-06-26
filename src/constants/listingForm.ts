export type ConservationState = 'novo' | 'excelente' | 'bom' | 'marcas_uso';

export const CONSERVATION_OPTIONS: { id: ConservationState; label: string }[] = [
  { id: 'novo', label: 'Novo' },
  { id: 'excelente', label: 'Excelente' },
  { id: 'bom', label: 'Bom' },
  { id: 'marcas_uso', label: 'Marcas de Uso' },
];

export function labelConservationState(state: ConservationState | null | undefined): string {
  const opt = CONSERVATION_OPTIONS.find((o) => o.id === state);
  return opt?.label ?? '—';
}

/** @deprecated Removido — capa IA substituída por dicas de foto no cadastro. */
export const LISTING_AI_OPTIMIZE_PRICE_CENTS = 499;

/** @deprecated Use LISTING_LEGAL_DECLARATION_FULL_TEXT — mantido para imports legados. */
export { LISTING_LEGAL_DECLARATION_FULL_TEXT as OWNERSHIP_DECLARATION_TEXT } from '@/src/constants/listingLegalDeclaration';

export const NF_ELECTRONICS_HINT =
  'Aumente a confiança dos seus lances anexando a NF.';
