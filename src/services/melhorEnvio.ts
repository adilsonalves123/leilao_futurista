import { getSupabase } from '@/src/lib/supabase';
import type {
  MelhorEnvioProductInput,
  MelhorEnvioQuoteOption,
  MelhorEnvioQuoteRequest,
  MelhorEnvioQuoteResult,
} from '@/src/types/melhorEnvio';

const MELHOR_ENVIO_ENABLED = process.env.EXPO_PUBLIC_MELHOR_ENVIO_ENABLED === 'true';

export function isMelhorEnvioEnabled(): boolean {
  return MELHOR_ENVIO_ENABLED;
}

export function normalizeCep(cep: string): string {
  return cep.replace(/\D/g, '').slice(0, 8);
}

export function buildDefaultProduct(input: {
  weightKg: number;
  dimensionsCm?: { height: number; width: number; length: number };
  insuranceValueBrl?: number;
  id?: string;
}): MelhorEnvioProductInput {
  const dims = input.dimensionsCm ?? { height: 15, width: 20, length: 30 };
  return {
    id: input.id ?? 'item',
    width: dims.width,
    height: dims.height,
    length: dims.length,
    weight: input.weightKg,
    insurance_value: input.insuranceValueBrl ?? 100,
    quantity: 1,
  };
}

function parsePriceCents(value: string | number | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function pickBestOption(options: MelhorEnvioQuoteOption[]): MelhorEnvioQuoteOption | null {
  const valid = options.filter((o) => !o.error);
  if (!valid.length) return null;

  return valid.reduce((best, current) => {
    const bestPrice = parsePriceCents(current.custom_price ?? current.price) ?? Infinity;
    const currentBest = parsePriceCents(best.custom_price ?? best.price) ?? Infinity;
    return currentBest < bestPrice ? current : best;
  });
}

export function mapMelhorEnvioResponse(raw: MelhorEnvioQuoteOption[]): MelhorEnvioQuoteResult | null {
  const options = Array.isArray(raw) ? raw : [];
  const best = pickBestOption(options);
  if (!best) return null;

  const priceCents = parsePriceCents(best.custom_price ?? best.price);
  if (priceCents == null) return null;

  return {
    priceCents,
    estimatedDays: best.custom_delivery_time ?? best.delivery_time ?? 0,
    carrier: best.company?.name ?? 'Transportadora',
    serviceName: best.name,
    serviceId: best.id,
    options,
  };
}

export async function quoteMelhorEnvioFreight(
  request: MelhorEnvioQuoteRequest,
): Promise<MelhorEnvioQuoteResult | null> {
  if (!isMelhorEnvioEnabled()) return null;

  const fromCep = normalizeCep(request.fromCep);
  const toCep = normalizeCep(request.toCep);
  if (fromCep.length !== 8 || toCep.length !== 8) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke<MelhorEnvioQuoteOption[]>(
    'melhor-envio-quote',
    {
      body: {
        fromCep,
        toCep,
        products: request.products,
      },
    },
  );

  if (error || !data) {
    console.warn('[melhorEnvio] cotação indisponível:', error?.message ?? 'sem dados');
    return null;
  }

  return mapMelhorEnvioResponse(data);
}
