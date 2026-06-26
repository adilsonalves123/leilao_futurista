import { deveUsarBackendLeilaoLocal } from '@/src/lib/auctionIds';
import { formatBRL } from '@/src/lib/bids';
import { isJarvisInfrastructureError, isJarvisOfflineModel, jarvisAiSecretsHint } from '@/src/lib/jarvisAiStatus';
import {
  computeMarketDealVerdict,
  MARKET_DEAL_FAIR_MIN_DISCOUNT_PCT,
  MARKET_DEAL_GOOD_MIN_DISCOUNT_PCT,
  type MarketDealVerdict,
} from '@/src/lib/marketDealMath';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  AuctionAiAdvisorResponse,
  AuctionAiConsultaInput,
  AuctionAiMessage,
} from '@/src/types/auctionAi';

function buildLocalReply(
  input: AuctionAiConsultaInput,
  verdict: MarketDealVerdict,
  discountPct: number | null,
): string {
  const lance = formatBRL(input.bidCents);
  const mercado =
    input.marketCents != null && input.marketCents > 0 ? formatBRL(input.marketCents) : null;
  const pergunta = input.message?.toLowerCase() ?? '';

  if (!input.message) {
    if (!mercado) {
      return `Analisei "${input.title}". Lance atual: ${lance}. Sem valor de mercado informado — compare com anúncios similares.`;
    }
    if (verdict === 'good') {
      return `Veredito: Compensa. Lance ${lance} está ${discountPct ?? 0}% abaixo do mercado (${mercado}). Defina um teto e considere frete.`;
    }
    if (verdict === 'fair') {
      return `Veredito: Atenção. Desconto de ${discountPct ?? 0}% sobre ${mercado}. Avalie se a disputa ainda vale a pena.`;
    }
    if (verdict === 'bad') {
      return `Veredito: Acima do mercado. Lance ${lance} vs referência ${mercado}. Só prossiga se houver diferencial claro.`;
    }
    return `Lance atual: ${lance}. Referência de mercado indisponível.`;
  }

  if (pergunta.includes('compensa') || pergunta.includes('vale')) {
    if (verdict === 'good') return `Sim, pelo cálculo atual compensa (${discountPct ?? 0}% abaixo do mercado).`;
    if (verdict === 'fair') return `Desconto moderado (${discountPct ?? 0}%) — fique atento ao teto.`;
    if (verdict === 'unknown') return 'Sem referência de mercado para afirmar se compensa.';
    return 'No momento o lance está próximo ou acima do mercado estimado.';
  }

  if (pergunta.includes('teto')) {
    if (input.marketCents != null && input.marketCents > 0) {
      const sugestao = Math.max(input.bidCents, Math.round(input.marketCents * 0.85));
      return `Teto conservador sugerido: ${formatBRL(sugestao)} (≈15% abaixo de ${mercado}).`;
    }
    return 'Sem mercado de referência, use 85–90% do preço médio de anúncios equivalentes.';
  }

  return `Lance ${lance}, veredito ${verdict}. Faixas: Compensa ≥${MARKET_DEAL_GOOD_MIN_DISCOUNT_PCT}%, Atenção ≥${MARKET_DEAL_FAIR_MIN_DISCOUNT_PCT}%.`;
}

function localAdvisorResponse(input: AuctionAiConsultaInput): AuctionAiAdvisorResponse {
  const market = input.marketCents != null && input.marketCents > 0 ? input.marketCents : 0;
  const result = computeMarketDealVerdict(input.bidCents, market);
  const reply = buildLocalReply(input, result.verdict, result.discountPct);

  return {
    ok: true,
    sessionId: `local-${input.auctionId}`,
    verdict: result.verdict,
    discountPct: result.discountPct,
    marketCents: input.marketCents,
    bidCents: input.bidCents,
    reply,
    fromCache: false,
    model: 'local-deterministic',
    provider: 'none',
    aiOffline: true,
    aiOfflineReason: 'Leilão local ou sem backend — análise automática.',
  };
}

export async function listarMensagensAssistenteLeilao(
  sessionId: string,
): Promise<AuctionAiMessage[]> {
  if (sessionId.startsWith('local-') || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('ai_advisor_listar_mensagens', {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn('[auctionAiAdvisor] listar mensagens:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    role: row.role as AuctionAiMessage['role'],
    body: row.body as string,
    verdict: (row.verdict as MarketDealVerdict | null) ?? null,
    discountPct: row.discount_pct != null ? Number(row.discount_pct) : null,
    marketCents: row.market_cents != null ? Number(row.market_cents) : null,
    bidCents: row.bid_cents != null ? Number(row.bid_cents) : null,
    createdAt: row.created_at as string,
  }));
}

export async function consultarAssistenteLeilao(
  input: AuctionAiConsultaInput,
): Promise<AuctionAiAdvisorResponse> {
  if (deveUsarBackendLeilaoLocal(input.auctionId) || !isSupabaseConfigured()) {
    return localAdvisorResponse(input);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return localAdvisorResponse(input);
  }

  const { data, error } = await supabase.functions.invoke<AuctionAiAdvisorResponse>(
    'auction-ai-advisor',
    {
      body: {
        auctionId: input.auctionId,
        sessionId: input.sessionId ?? undefined,
        message: input.message?.trim() || undefined,
      },
    },
  );

  if (error) {
    const msg = error.message.includes('auction-ai-advisor')
      ? `Deploy a Edge Function auction-ai-advisor. ${jarvisAiSecretsHint()}`
      : error.message;
    console.warn('[auctionAiAdvisor] invoke error:', msg);
    if (isJarvisInfrastructureError(msg)) {
      return { ok: false, error: msg, aiOffline: false };
    }
    return {
      ...localAdvisorResponse(input),
      error: msg,
      aiOfflineReason: msg,
    };
  }

  if (!data?.ok) {
    const msg = data?.error ?? 'Falha ao consultar assistente.';
    if (isJarvisInfrastructureError(msg)) {
      return { ok: false, error: msg, aiOffline: false };
    }
    return {
      ...localAdvisorResponse(input),
      error: data?.error ?? 'Falha ao consultar assistente.',
      aiOfflineReason: data?.error ?? 'Assistente indisponível — modo básico.',
    };
  }

  const aiOffline = data.aiOffline === true || isJarvisOfflineModel(data.model);

  return {
    ...data,
    aiOffline,
    aiOfflineReason: data.aiOfflineReason ?? (aiOffline ? data.error : undefined),
  };
}

export function mapAdvisorMessagesToChat(
  rows: AuctionAiMessage[],
): Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }> {
  return rows
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .map((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      text: row.body,
      createdAt: new Date(row.createdAt).getTime(),
    }));
}
