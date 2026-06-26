export type ListingCategory =
  | 'produtos_gerais'
  | 'veiculos'
  | 'imoveis'
  | 'eletronicos'
  | 'colecionaveis'
  | 'outros';

export const LISTING_CATEGORIES: { id: ListingCategory; emoji: string; label: string }[] = [
  { id: 'produtos_gerais', emoji: '📦', label: 'Produtos Gerais' },
  { id: 'veiculos', emoji: '🚗', label: 'Veículos' },
  { id: 'imoveis', emoji: '🏢', label: 'Imóveis' },
  { id: 'eletronicos', emoji: '⚡', label: 'Eletrônicos' },
  { id: 'colecionaveis', emoji: '🎨', label: 'Colecionáveis' },
  { id: 'outros', emoji: '🎸', label: 'Outros' },
];

export const AUCTION_DURATIONS = ['1 hora', '6 horas', '24 horas', '3 dias', '7 dias'] as const;

export type AuctionDuration = (typeof AUCTION_DURATIONS)[number];

const DURATION_MS: Record<AuctionDuration, number> = {
  '1 hora': 60 * 60 * 1000,
  '6 horas': 6 * 60 * 60 * 1000,
  '24 horas': 24 * 60 * 60 * 1000,
  '3 dias': 3 * 24 * 60 * 60 * 1000,
  '7 dias': 7 * 24 * 60 * 60 * 1000,
};

export function labelCategoria(category: ListingCategory | null | undefined): string {
  if (!category) return 'Não informada';
  return LISTING_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function calcularEndsAtAPartirDe(
  duration: AuctionDuration,
  base: Date = new Date(),
): string {
  return new Date(base.getTime() + DURATION_MS[duration]).toISOString();
}

export function inferirDuracaoPorEndsAt(endsAt: string | null, startsAt: string | null): AuctionDuration {
  if (!endsAt) return '24 horas';
  const end = new Date(endsAt).getTime();
  const start = startsAt ? new Date(startsAt).getTime() : end - DURATION_MS['24 horas'];
  const diff = Math.max(end - start, 0);

  const ordenado = [...AUCTION_DURATIONS].sort(
    (a, b) => DURATION_MS[b] - DURATION_MS[a],
  ) as AuctionDuration[];

  for (const d of ordenado) {
    if (diff >= DURATION_MS[d] * 0.85) return d;
  }
  return '1 hora';
}

export function parsePriceInput(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) ? 0 : val;
}

export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

export function centavosParaInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
