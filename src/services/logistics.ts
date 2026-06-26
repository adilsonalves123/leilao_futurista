import {
  buildDefaultProduct,
  isMelhorEnvioEnabled,
  normalizeCep,
  quoteMelhorEnvioFreight,
} from '@/src/services/melhorEnvio';

export type FreightQuote = {
  cep: string;
  priceCents: number;
  estimatedDays: number;
  carrier?: string;
  serviceName?: string;
  serviceId?: number;
  source: 'melhor_envio' | 'placeholder';
};

export type FreightQuoteRequest = {
  fromCep: string;
  toCep: string;
  weightKg: number;
  dimensionsCm?: { height: number; width: number; length: number };
  insuranceValueBrl?: number;
};

function placeholderQuote(cep: string, weightKg: number): FreightQuote {
  const base = 2500 + Math.min(weightKg, 30) * 150;
  return {
    cep,
    priceCents: base,
    estimatedDays: cep.startsWith('0') ? 5 : 8,
    source: 'placeholder',
  };
}

export async function calculateFreight(
  requestOrCep: FreightQuoteRequest | string,
  weightKgLegacy = 1.2,
): Promise<FreightQuote> {
  const request: FreightQuoteRequest =
    typeof requestOrCep === 'string'
      ? {
          fromCep: '01310100',
          toCep: requestOrCep,
          weightKg: weightKgLegacy,
        }
      : requestOrCep;

  const toCep = normalizeCep(request.toCep);
  const fromCep = normalizeCep(request.fromCep);

  if (!isMelhorEnvioEnabled()) {
    return placeholderQuote(toCep, request.weightKg);
  }

  try {
    const quote = await quoteMelhorEnvioFreight({
      fromCep,
      toCep,
      products: [
        buildDefaultProduct({
          weightKg: request.weightKg,
          dimensionsCm: request.dimensionsCm,
          insuranceValueBrl: request.insuranceValueBrl,
        }),
      ],
    });

    if (!quote) {
      return placeholderQuote(toCep, request.weightKg);
    }

    return {
      cep: toCep,
      priceCents: quote.priceCents,
      estimatedDays: quote.estimatedDays,
      carrier: quote.carrier,
      serviceName: quote.serviceName,
      serviceId: quote.serviceId,
      source: 'melhor_envio',
    };
  } catch {
    return placeholderQuote(toCep, request.weightKg);
  }
}

export async function generateShippingLabelQr(checkoutId: string): Promise<string> {
  return `AETHERION-SHIP:${checkoutId}`;
}
