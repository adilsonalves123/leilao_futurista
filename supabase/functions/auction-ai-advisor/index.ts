import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAiChatCompletion, humanizeAiOfflineReason } from '../_shared/aiChatClient.ts';
import { type ChatMessage } from '../_shared/openaiClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  buildAuctionAdvisorSystemPrompt,
  buildAuctionMarketInsight,
  computeMarketVerdict,
  computeMinNextBidCents,
  computeBidHoldCents,
  formatBrl,
  verdictLabelPt,
} from '../_shared/levouKnowledgeBase.ts';
import { describeCaughtError, isLikelyTimeoutError, logSystemError } from '../_shared/systemErrorLog.ts';

const SOURCE = 'auction-ai-advisor';

type AdvisorBody = {
  auctionId?: string;
  sessionId?: string;
  message?: string;
};

type AuctionRow = {
  id: string;
  title: string;
  description: string | null;
  current_price_cents: number;
  starting_price_cents: number;
  estimated_market_cents: number | null;
  conservation_state: string | null;
  listing_category: string | null;
  listing_extras: Record<string, unknown> | null;
  ends_at: string | null;
  status: string;
};

type HistoryRow = {
  role: string;
  body: string;
};

function buildFallbackReply(
  auction: AuctionRow,
  verdict: string,
  discountPct: number | null,
  savingsCents: number | null,
  userMessage?: string,
  buyerContext?: {
    availableCents?: number;
    isLeading?: boolean;
  },
): string {
  const bid = auction.current_price_cents;
  const market = auction.estimated_market_cents;
  const lance = formatBrl(bid);
  const nextBid = computeMinNextBidCents(bid);
  const hold = computeBidHoldCents(nextBid, auction.listing_category);

  const insight = buildAuctionMarketInsight({
    title: auction.title,
    description: auction.description,
    currentPriceCents: bid,
    startingPriceCents: auction.starting_price_cents,
    marketCents: market,
    conservationState: auction.conservation_state,
    listingCategory: auction.listing_category,
    listingExtras: auction.listing_extras,
    status: auction.status,
    secondsLeft: null,
    verdict,
    discountPct,
    savingsCents,
    buyerContext: buyerContext
      ? {
          availableCents: buyerContext.availableCents,
          isLeading: buyerContext.isLeading,
        }
      : undefined,
  });

  if (!userMessage) {
    const base =
      market == null || market <= 0
        ? `"${auction.title}": lance ${lance}. Sem mercado estimado no app — compare em OLX/Mercado Livre.`
        : `Veredito: ${verdictLabelPt(verdict)} (${discountPct ?? 0}% vs mercado ${formatBrl(market)}). Lance ${lance}.`;
    return `${base}\n\n${insight.split('\n').slice(0, 4).join('\n')}\n\nLembre: comissão 10% no arremate + frete. Pagamento em 24h se vencer.`;
  }

  const pergunta = userMessage.toLowerCase();
  if (pergunta.includes('compensa') || pergunta.includes('vale')) {
    if (verdict === 'good') {
      return `Pelo mercado estimado do app, compensa (${discountPct ?? 0}% abaixo). Some comissão 10% (~${formatBrl(Math.round(bid * 0.1))}) e frete ao definir teto. Confira também preços na web para o mesmo item.`;
    }
    if (verdict === 'fair') {
      return `Desconto moderado (${discountPct ?? 0}%) — faixa Atenção. Só continue se estado (${auction.conservation_state ?? 'n/d'}) e frete fecharem a conta.`;
    }
    if (verdict === 'unknown') {
      return 'Sem mercado estimado no cadastro. Busque o mesmo modelo em OLX/Mercado Livre antes de disputar.';
    }
    return `Lance acima ou perto do mercado estimado. Dispute só com diferencial claro (item raro, lacrado, etc.).`;
  }

  if (pergunta.includes('teto') || pergunta.includes('máximo') || pergunta.includes('maximo')) {
    if (market != null && market > 0) {
      const sugestao = Math.max(bid, Math.round(market * 0.85));
      return `Mercado estimado (app): ${formatBrl(market)}. Teto conservador ~${formatBrl(sugestao)}. Próximo lance mínimo: ${formatBrl(nextBid)} (caução ~${formatBrl(hold)}).`;
    }
    return `Sem referência no app. Use 85–90% do preço médio que encontrar na web para lotes equivalentes.`;
  }

  if (pergunta.includes('saldo') || pergunta.includes('caução') || pergunta.includes('caucao')) {
  const saldo = buyerContext?.availableCents;
    return (
      `Caução estimada no próximo lance (${formatBrl(nextBid)}): ~${formatBrl(hold)}.` +
      (saldo != null ? ` Seu saldo disponível: ${formatBrl(saldo)}.` : ' Verifique saldo em Carteira.')
    );
  }

  return `Sobre "${auction.title}": ${verdictLabelPt(verdict)}, lance ${lance}. ${insight.split('\n')[0]}. Estado: ${auction.conservation_state ?? 'n/d'}.`;
}

async function loadBuyerAuctionContext(
  userClient: ReturnType<typeof createClient>,
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  auctionId: string,
): Promise<{
  availableCents: number;
  holdCents: number;
  isLeading: boolean;
  kycStatus: string;
  podeDarLance: boolean;
}> {
  let availableCents = 0;
  let holdCents = 0;
  let kycStatus = 'pendente';
  let podeDarLance = false;
  let isLeading = false;

  const { data: availableRaw } = await userClient.rpc('saldo_carteira_disponivel_cents', {
    p_user_id: userId,
  });
  if (typeof availableRaw === 'number') availableCents = availableRaw;

  const { data: holdsRaw } = await adminClient
    .from('bid_holds')
    .select('hold_cents')
    .eq('bidder_id', userId)
    .eq('status', 'active');
  holdCents = (holdsRaw ?? []).reduce((sum, row) => sum + Number((row as { hold_cents: number }).hold_cents ?? 0), 0);

  const { data: userRow } = await adminClient
    .from('users')
    .select('status_verificacao')
    .eq('id', userId)
    .maybeSingle();
  kycStatus = String((userRow as { status_verificacao?: string } | null)?.status_verificacao ?? 'pendente');
  podeDarLance = kycStatus === 'aprovado';

  const { data: topBid } = await adminClient
    .from('bids')
    .select('bidder_id')
    .eq('auction_id', auctionId)
    .order('amount_cents', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  isLeading = (topBid as { bidder_id?: string } | null)?.bidder_id === userId;

  return { availableCents, holdCents, isLeading, kycStatus, podeDarLance };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let adminClient: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    if (supabaseUrl && serviceKey) {
      adminClient = createClient(supabaseUrl, serviceKey);
    }

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ ok: false, error: 'Supabase não configurado.' }, 500);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'Faça login para usar o assistente.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as AdvisorBody;
    const auctionId = body.auctionId?.trim();
    const userMessage = body.message?.trim() || null;

    if (!auctionId) {
      return jsonResponse({ ok: false, error: 'auctionId obrigatório.' }, 400);
    }

    const { data: auctionRow, error: auctionError } = await adminClient!
      .from('auctions')
      .select(
        'id, title, description, current_price_cents, starting_price_cents, estimated_market_cents, conservation_state, listing_category, listing_extras, ends_at, status',
      )
      .eq('id', auctionId)
      .maybeSingle();

    if (auctionError || !auctionRow) {
      return jsonResponse({ ok: false, error: 'Leilão não encontrado.' }, 404);
    }

    const auction = auctionRow as AuctionRow;
    const bidCents = Number(auction.current_price_cents) || 0;
    const marketCents =
      auction.estimated_market_cents != null ? Number(auction.estimated_market_cents) : null;
    const { verdict, discountPct, savingsCents } = computeMarketVerdict(bidCents, marketCents);

    const buyerContext = await loadBuyerAuctionContext(
      userClient,
      adminClient!,
      authData.user.id,
      auctionId,
    );

    let sessionId = body.sessionId?.trim() || null;

    if (!sessionId) {
      const { data: newSessionId, error: sessionError } = await userClient.rpc(
        'ai_advisor_obter_ou_criar_sessao',
        { p_auction_id: auctionId },
      );
      if (sessionError || !newSessionId) {
        return jsonResponse({ ok: false, error: sessionError?.message ?? 'Falha ao criar sessão.' }, 500);
      }
      sessionId = newSessionId as string;
    }

    const { data: snapshotRaw } = await adminClient!.rpc('ai_advisor_obter_snapshot', {
      p_auction_id: auctionId,
      p_bid_cents: bidCents,
    });

    const snapshot = snapshotRaw as {
      ok?: boolean;
      summary?: string;
    } | null;

    if (!userMessage && snapshot?.ok && snapshot.summary?.trim()) {
      const { count: messageCount } = await adminClient!
        .from('ai_advisor_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if ((messageCount ?? 0) === 0) {
        await adminClient!.rpc('ai_advisor_persistir_mensagens', {
          p_session_id: sessionId,
          p_user_id: authData.user.id,
          p_assistant_body: snapshot.summary.trim(),
          p_verdict: verdict,
          p_discount_pct: discountPct,
          p_market_cents: marketCents,
          p_bid_cents: bidCents,
          p_model: 'snapshot-cache',
          p_tokens_in: null,
          p_tokens_out: null,
          p_snapshot_summary: null,
        });
      }

      return jsonResponse({
        ok: true,
        sessionId,
        verdict,
        discountPct,
        marketCents,
        bidCents,
        reply: snapshot.summary.trim(),
        fromCache: true,
        model: null,
      });
    }

    const { data: historyRaw } = await adminClient!
      .from('ai_advisor_messages')
      .select('role, body')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(12);

    const history = (historyRaw ?? []) as HistoryRow[];
    const secondsLeft = auction.ends_at
      ? Math.max(0, Math.floor((new Date(auction.ends_at).getTime() - Date.now()) / 1000))
      : null;

    const systemPrompt = buildAuctionAdvisorSystemPrompt({
      title: auction.title,
      description: auction.description,
      currentPriceCents: bidCents,
      startingPriceCents: Number(auction.starting_price_cents) || 0,
      marketCents,
      conservationState: auction.conservation_state,
      listingCategory: auction.listing_category,
      listingExtras: auction.listing_extras,
      status: auction.status,
      secondsLeft,
      verdict,
      discountPct,
      savingsCents,
      buyerContext,
    });

    const chatMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const row of history) {
      if (row.role === 'user' || row.role === 'assistant') {
        chatMessages.push({ role: row.role, content: row.body });
      }
    }

    if (userMessage) {
      chatMessages.push({ role: 'user', content: userMessage });
    } else {
      chatMessages.push({
        role: 'user',
        content:
          'Analise este lote pelas regras do Levou: compensa no lance atual? Cite veredito, caução, comissão 10%, prazo de pagamento e o que observar no estado do item.',
      });
    }

    const completion = await createAiChatCompletion(chatMessages, {
      maxTokens: 520,
      temperature: 0.35,
    });
    let reply = completion.text;
    let model = completion.model;
    const tokensIn = completion.tokensIn;
    const tokensOut = completion.tokensOut;

    if (!completion.ok || !reply) {
      reply = buildFallbackReply(
        auction,
        verdict,
        discountPct,
        savingsCents,
        userMessage ?? undefined,
        buyerContext,
      );
      model = 'deterministic-fallback';
      if (completion.error && adminClient) {
        await logSystemError(adminClient, {
          source: SOURCE,
          severity: 'warning',
          category: 'ia',
          code: completion.error === 'OPENAI_API_KEY_MISSING' ? 'OPENAI_API_KEY_MISSING' : 'OPENAI_COMPLETION_FAILED',
          message: completion.error,
          userId: authData.user.id,
          payload: { auctionId, sessionId },
        });
      }
    }

    const snapshotSummary = !userMessage ? reply : null;

    await adminClient!.rpc('ai_advisor_persistir_mensagens', {
      p_session_id: sessionId,
      p_user_id: authData.user.id,
      p_user_body: userMessage,
      p_assistant_body: reply,
      p_verdict: verdict,
      p_discount_pct: discountPct,
      p_market_cents: marketCents,
      p_bid_cents: bidCents,
      p_model: model,
      p_tokens_in: tokensIn,
      p_tokens_out: tokensOut,
      p_snapshot_summary: snapshotSummary,
    });

    return jsonResponse({
      ok: true,
      sessionId,
      verdict,
      discountPct,
      marketCents,
      bidCents,
      reply,
      fromCache: false,
      model,
      provider: completion.provider ?? 'none',
      aiOffline: model === 'deterministic-fallback',
      aiOfflineReason: humanizeAiOfflineReason(completion.error, model) || undefined,
      tokensIn,
      tokensOut,
    });
  } catch (error) {
    const message = describeCaughtError(error);
    if (adminClient) {
      await logSystemError(adminClient, {
        source: SOURCE,
        severity: 'critical',
        category: 'ia',
        code: isLikelyTimeoutError(error) ? 'TIMEOUT' : 'UNHANDLED_EXCEPTION',
        message,
      });
    }
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
