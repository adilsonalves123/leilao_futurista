import { formatBRL } from '@/src/lib/bids';
import {
  formatJarvisAuctionHowToReply,
  isAuctionHowToQuestion,
} from '@/src/lib/jarvisAuctionHowTo';
import {
  formatJarvisMarketOpportunitiesReply,
  isMarketOpportunityQuestion,
} from '@/src/lib/jarvisMarketOpportunities';
import {
  isJarvisInfrastructureError,
  isJarvisOfflineModel,
  jarvisAiSecretsHint,
} from '@/src/lib/jarvisAiStatus';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  BuyerJarvisContext,
  BuyerJarvisMessage,
  BuyerJarvisResponse,
} from '@/src/types/buyerJarvis';

const MOCK_CONTEXT: BuyerJarvisContext = {
  generated_at: new Date().toISOString(),
  route: '/',
  user: { display_name: 'Usuário', kyc_status: 'pendente' },
  wallet: { available_cents: 0, hold_cents: 0, pix_pending_count: 0 },
  bids: { winning_live_count: 0 },
  alertas: [],
};

function mapContext(data: Record<string, unknown>): BuyerJarvisContext {
  const user = (data.user ?? {}) as Record<string, unknown>;
  const wallet = (data.wallet ?? {}) as Record<string, unknown>;
  const bids = (data.bids ?? {}) as Record<string, unknown>;
  const kyc = (data.kyc ?? {}) as Record<string, unknown>;
  const pedidos = (data.pedidos ?? {}) as Record<string, unknown>;
  const oportunidades = (data.leiloes_oportunidades ?? {}) as Record<string, unknown>;

  return {
    ok: data.ok === true,
    generated_at: String(data.generated_at ?? new Date().toISOString()),
    route: String(data.route ?? '/'),
    user: {
      display_name: user.display_name != null ? String(user.display_name) : null,
      kyc_status: String(user.kyc_status ?? 'pendente'),
    },
    kyc: {
      status: String(kyc.status ?? user.kyc_status ?? 'pendente'),
      pode_dar_lance: kyc.pode_dar_lance === true,
    },
    wallet: {
      available_cents: Number(wallet.available_cents ?? 0),
      hold_cents: Number(wallet.hold_cents ?? 0),
      pix_pending_count: Number(wallet.pix_pending_count ?? 0),
    },
    bids: {
      winning_live_count: Number(bids.winning_live_count ?? 0),
    },
    pedidos: {
      pending_payment_count: Number(pedidos.pending_payment_count ?? 0),
      in_transit_count: Number(pedidos.in_transit_count ?? 0),
    },
    leiloes_oportunidades: data.leiloes_oportunidades
      ? {
          live_com_mercado_estimado: Number(oportunidades.live_com_mercado_estimado ?? 0),
          abaixo_mercado_compensa: Number(oportunidades.abaixo_mercado_compensa ?? 0),
          abaixo_mercado_atencao: Number(oportunidades.abaixo_mercado_atencao ?? 0),
          melhores: Array.isArray(oportunidades.melhores)
            ? (oportunidades.melhores as NonNullable<BuyerJarvisContext['leiloes_oportunidades']>['melhores'])
            : [],
        }
      : undefined,
    alertas: Array.isArray(data.alertas) ? (data.alertas as BuyerJarvisContext['alertas']) : [],
  };
}

function localJarvisReply(message: string | undefined, context: BuyerJarvisContext): string {
  if (!message) {
    return [
      `Jarvis online. Saldo ${formatBRL(context.wallet.available_cents)}, KYC ${context.user.kyc_status}.`,
      context.alertas.length
        ? `Alertas: ${context.alertas.map((a) => a.title).join('; ')}`
        : 'Nenhum alerta crítico agora.',
      'Abra um lote para análise neural completa.',
    ].join('\n');
  }

  const q = message.toLowerCase();
  if (q.includes('pix')) {
    return context.wallet.pix_pending_count > 0
      ? `Você tem ${context.wallet.pix_pending_count} Pix pendente(s). Vá em Carteira.`
      : 'Carteira → Depositar → Pix. Saldo libera após confirmação.';
  }
  if (q.includes('saldo')) {
    return `Disponível ${formatBRL(context.wallet.available_cents)}, retido ${formatBRL(context.wallet.hold_cents)}.`;
  }
  if (q.includes('kyc')) {
    return `KYC: ${context.user.kyc_status}. Complete em Perfil se ainda não aprovado.`;
  }
  if (message && isAuctionHowToQuestion(message)) {
    return formatJarvisAuctionHowToReply(context);
  }
  if (message && isMarketOpportunityQuestion(message)) {
    return formatJarvisMarketOpportunitiesReply(context.leiloes_oportunidades);
  }
  return 'Posso ajudar com carteira, Pix, KYC, leilões e oportunidades abaixo do mercado. Pergunte, por exemplo: "tem lote abaixo do mercado?"';
}

export async function carregarContextoBuyerJarvis(route: string): Promise<BuyerJarvisContext> {
  if (!isSupabaseConfigured()) return { ...MOCK_CONTEXT, route };

  const supabase = getSupabase();
  if (!supabase) return { ...MOCK_CONTEXT, route };

  const { data, error } = await supabase.rpc('buyer_jarvis_context_bundle', { p_route: route });
  if (error || !data || (data as { ok?: boolean }).ok === false) {
    console.warn('[buyerJarvis] context:', error?.message);
    return { ...MOCK_CONTEXT, route };
  }

  return mapContext(data as Record<string, unknown>);
}

export async function listarMensagensBuyerJarvis(sessionId: string): Promise<BuyerJarvisMessage[]> {
  if (sessionId.startsWith('local-') || !isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('buyer_jarvis_listar_mensagens', {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn('[buyerJarvis] listar:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    role: row.role as BuyerJarvisMessage['role'],
    body: row.body as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}

async function humanizarErroEdgeFunction(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'Jarvis temporariamente indisponível.';

  const msg = 'message' in error ? String(error.message) : '';
  const ctx = (error as { context?: Response }).context;

  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string; message?: string };
      if (body?.error?.trim()) return body.error.trim();
      if (body?.message?.trim()) return body.message.trim();
    } catch {
      /* corpo não-JSON */
    }
  }

  if (/non-2xx|2xx status/i.test(msg)) {
    return 'Jarvis temporariamente indisponível. Tente de novo em instantes.';
  }

  if (msg.includes('buyer-jarvis')) {
    return `Deploy a Edge Function buyer-jarvis. ${jarvisAiSecretsHint()}`;
  }

  return msg.trim() || 'Jarvis temporariamente indisponível.';
}

function buildJarvisInvokeFallback(
  msg: string,
  context: BuyerJarvisContext,
  message: string | undefined,
  sessionId?: string | null,
): BuyerJarvisResponse {
  if (isJarvisInfrastructureError(msg)) {
    return {
      ok: false,
      context,
      error: msg,
      aiOffline: false,
    };
  }

  return {
    ok: true,
    sessionId: sessionId ?? 'local-jarvis',
    context,
    reply: localJarvisReply(message, context),
    model: 'local-fallback',
    provider: 'none',
    aiOffline: true,
    aiOfflineReason:
      /OPENAI|GEMINI|AI_KEYS|deploy/i.test(msg) ? msg : `${msg} ${jarvisAiSecretsHint()}`,
    error: msg,
  };
}

export async function consultarBuyerJarvis(input: {
  sessionId?: string | null;
  message?: string;
  route: string;
}): Promise<BuyerJarvisResponse> {
  const context = await carregarContextoBuyerJarvis(input.route);

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      sessionId: 'local-jarvis',
      context,
      reply: localJarvisReply(input.message, context),
      model: 'local-deterministic',
      provider: 'none',
      aiOffline: true,
      aiOfflineReason: 'Supabase não configurado — modo básico local.',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: true,
      sessionId: 'local-jarvis',
      context,
      reply: localJarvisReply(input.message, context),
      model: 'local-deterministic',
      provider: 'none',
      aiOffline: true,
      aiOfflineReason: 'Cliente sem conexão Supabase — modo básico local.',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return {
      ok: false,
      error: 'Faça login para usar o Jarvis com IA.',
      context,
    };
  }

  const { data, error } = await supabase.functions.invoke<BuyerJarvisResponse>('buyer-jarvis', {
    body: {
      sessionId: input.sessionId ?? undefined,
      message: input.message?.trim() || undefined,
      route: input.route,
    },
  });

  if (error) {
    const msg = await humanizarErroEdgeFunction(error);
    return buildJarvisInvokeFallback(msg, context, input.message, input.sessionId);
  }

  if (!data?.ok) {
    const msg = data?.error ?? 'Falha ao consultar Jarvis.';
    return buildJarvisInvokeFallback(msg, context, input.message, input.sessionId);
  }

  const aiOffline =
    data.aiOffline === true || isJarvisOfflineModel(data.model);

  return {
    ...data,
    aiOffline,
    aiOfflineReason: data.aiOfflineReason ?? (aiOffline ? data.error : undefined),
  };
}

export function mapBuyerJarvisMessagesToChat(
  rows: BuyerJarvisMessage[],
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
