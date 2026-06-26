import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAiChatCompletion, humanizeAiOfflineReason } from '../_shared/aiChatClient.ts';
import { type ChatMessage } from '../_shared/openaiClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  buildBuyerJarvisSystemPrompt,
  formatBrl,
  formatBuyerAuctionHowToReply,
  formatBuyerMarketOpportunitiesReply,
  isBuyerAuctionHowToQuestion,
  isBuyerMarketQuestion,
} from '../_shared/levouKnowledgeBase.ts';
import { describeCaughtError, isLikelyTimeoutError, logSystemError } from '../_shared/systemErrorLog.ts';

const SOURCE = 'buyer-jarvis';

type JarvisBody = {
  sessionId?: string;
  message?: string;
  route?: string;
};

type HistoryRow = { role: string; body: string };

function buildFallbackReply(context: Record<string, unknown>, userMessage?: string): string {
  const wallet = (context.wallet ?? {}) as Record<string, unknown>;
  const user = (context.user ?? {}) as Record<string, unknown>;
  const kyc = (context.kyc ?? {}) as Record<string, unknown>;
  const bids = (context.bids ?? {}) as Record<string, unknown>;
  const pedidos = (context.pedidos ?? {}) as Record<string, unknown>;
  const alertas = (context.alertas ?? []) as Array<{ title?: string; detail?: string }>;
  const kycStatus = String(user.kyc_status ?? kyc.status ?? 'pendente');
  const podeLance = kyc.pode_dar_lance === true;

  if (!userMessage) {
    const linhas = [
      `Olá${user.display_name ? `, ${user.display_name}` : ''}! Sou o Jarvis do Levou.`,
      `Saldo disponível: ${formatBrl(Number(wallet.available_cents ?? 0))} | Retido em lances: ${formatBrl(Number(wallet.hold_cents ?? 0))}.`,
      `KYC: ${kycStatus}${podeLance ? ' — você pode dar lances.' : ' — lances bloqueados até aprovação do KYC.'}`,
      `Leilões que você lidera agora: ${bids.winning_live_count ?? 0}.`,
    ];
    if (Number(pedidos.pending_payment_count ?? 0) > 0) {
      linhas.push(`Faturas pendentes de pagamento: ${pedidos.pending_payment_count} (prazo 24h).`);
    }
    if (alertas.length) {
      linhas.push('', 'Alertas:', ...alertas.slice(0, 3).map((a) => `• ${a.title}: ${a.detail}`));
    }
    linhas.push('', 'Para saber se um lote compensa, abra o leilão — lá analiso mercado estimado e veredito.');
    return linhas.join('\n');
  }

  const q = userMessage.toLowerCase();

  if (q.includes('saque') || q.includes('retir')) {
    return (
      'Saque (Carteira → Sacar): só para Pix do mesmo CPF do KYC. Prazo até 2h úteis após auditoria. ' +
      `Seu saldo disponível agora: ${formatBrl(Number(wallet.available_cents ?? 0))}.`
    );
  }
  if (q.includes('pix') || q.includes('deposit') || q.includes('depósito') || q.includes('deposito')) {
    const pending = Number(wallet.pix_pending_count ?? 0);
    return pending > 0
      ? `Você tem ${pending} Pix pendente(s). Vá em Carteira para acompanhar. Depósitos confirmados liberam saldo em segundos.`
      : 'Depósito: Carteira → Depositar → Pix. Após confirmação, o saldo fica disponível para lances em poucos segundos.';
  }
  if (q.includes('saldo') || q.includes('carteira') || q.includes('retido') || q.includes('bloqueio')) {
    return (
      `Disponível: ${formatBrl(Number(wallet.available_cents ?? 0))} (livre para lance ou saque). ` +
      `Retido: ${formatBrl(Number(wallet.hold_cents ?? 0))} (caução em lances ativos — devolve na hora se forem cobertos).`
    );
  }
  if (q.includes('kyc') || q.includes('cadastro') || q.includes('documento') || q.includes('bloqueado')) {
    return kycStatus === 'aprovado'
      ? 'Seu KYC está aprovado — lances liberados. Mantenha saldo disponível para a caução de cada lance.'
      : `KYC "${kycStatus}": lances bloqueados até aprovação. Vá em Perfil/Mais, envie documento + selfie e aguarde análise.`;
  }
  if (q.includes('multa') || q.includes('penal') || q.includes('24') || q.includes('fatura')) {
    return (
      'Ao vencer um leilão, você tem 24h para pagar a fatura. Comissão Levou: 10%. ' +
      'Desistir ou não pagar: multa irrevogável de 30% e possível suspensão da conta.'
    );
  }
  if (q.includes('envio') || q.includes('rastre') || q.includes('frete') || q.includes('entrega')) {
    const emTransito = Number(pedidos.in_transit_count ?? 0);
    return (
      'Após pagamento, o envio usa o endereço do perfil (etiqueta em até 3 dias úteis). ' +
      `Rastreio em Meus Arremates.${emTransito > 0 ? ` Você tem ${emTransito} pedido(s) em trânsito.` : ''}`
    );
  }
  if (userMessage && isBuyerAuctionHowToQuestion(userMessage)) {
    return formatBuyerAuctionHowToReply(context);
  }
  if (isBuyerMarketQuestion(userMessage ?? '') ) {
    const oportunidades = context.leiloes_oportunidades as Record<string, unknown> | undefined;
    if (oportunidades) {
      return formatBuyerMarketOpportunitiesReply(oportunidades);
    }
  }
  if (q.includes('vale') || q.includes('lance') || q.includes('leilão') || q.includes('leilao')) {
    return (
      'No app, "mercado estimado" vem do cadastro do lote. Veredito: Compensa (≥20% abaixo), Atenção (5–19%), Acima (<5%). ' +
      'Abra o leilão para análise completa com caução, próximo lance mínimo e teto sugerido.'
    );
  }
  if (q.includes('incremento') || q.includes('15') || q.includes('cronômetro') || q.includes('cronometro')) {
    return (
      'Incremento mínimo: +R$5 (<R$500), +R$50 (até R$1.000), +R$200 acima. ' +
      'Nos últimos 15s, cada lance adiciona +15s ao relógio (anti-robô).'
    );
  }

  return (
    'Posso ajudar com Carteira (Pix/saque/saldo), KYC, lances, arremate (24h, comissão 10%, multa 30%) e envio. ' +
    'Para análise de mercado de um lote, abra a tela do leilão.'
  );
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
      return jsonResponse({ ok: false, error: 'Faça login para usar o Jarvis.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as JarvisBody;
    const userMessage = body.message?.trim() || null;
    const route = body.route?.trim() || '/';

    let sessionId = body.sessionId?.trim() || null;
    if (!sessionId) {
      const { data: newSessionId, error: sessionError } = await userClient.rpc(
        'buyer_jarvis_obter_ou_criar_sessao',
        { p_route: route },
      );
      if (sessionError || !newSessionId) {
        return jsonResponse({ ok: false, error: sessionError?.message ?? 'Falha na sessão.' }, 500);
      }
      sessionId = newSessionId as string;
    }

    const { data: contextRaw, error: contextError } = await userClient.rpc('buyer_jarvis_context_bundle', {
      p_route: route,
    });

    if (contextError || !contextRaw || (contextRaw as { ok?: boolean }).ok === false) {
      return jsonResponse({ ok: false, error: contextError?.message ?? 'Falha ao carregar contexto.' }, 500);
    }

    const context = contextRaw as Record<string, unknown>;

    if (userMessage && isBuyerAuctionHowToQuestion(userMessage)) {
      const guideReply = formatBuyerAuctionHowToReply(context);
      await adminClient!.rpc('buyer_jarvis_persistir_mensagens', {
        p_session_id: sessionId,
        p_user_id: authData.user.id,
        p_user_body: userMessage,
        p_assistant_body: guideReply,
        p_metadata: {
          route,
          model: 'levou-auction-guide',
          provider: 'none',
          ai_offline: false,
          rules_version: 'levou-auction-howto-v2',
        },
      });
      return jsonResponse({
        ok: true,
        sessionId,
        reply: guideReply,
        context,
        model: 'levou-auction-guide',
        provider: 'none',
        aiOffline: false,
      });
    }

    const { data: historyRaw } = await adminClient!
      .from('buyer_jarvis_messages')
      .select('role, body')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(12);

    const history = (historyRaw ?? []) as HistoryRow[];
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: buildBuyerJarvisSystemPrompt(context, route, userMessage) },
    ];

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
        content: 'Com base nas regras do Levou e no meu contexto, o que preciso saber agora nesta tela?',
      });
    }

    const completion = await createAiChatCompletion(chatMessages, {
      maxTokens: 550,
      temperature: 0.35,
    });
    let reply = completion.text;
    let model = completion.model;
    const aiOfflineReason = humanizeAiOfflineReason(completion.error, model);

    if (!completion.ok || !reply) {
      reply = buildFallbackReply(context, userMessage ?? undefined);
      model = 'deterministic-fallback';
      if (completion.error && adminClient) {
        await logSystemError(adminClient, {
          source: SOURCE,
          severity: 'warning',
          category: 'ia',
          code:
            completion.error === 'AI_KEYS_MISSING' ||
            completion.error === 'OPENAI_API_KEY_MISSING' ||
            completion.error === 'GEMINI_API_KEY_MISSING'
              ? 'AI_KEYS_MISSING'
              : 'AI_COMPLETION_FAILED',
          message: completion.error,
          userId: authData.user.id,
          payload: { sessionId, route, provider: completion.provider },
        });
      }
    }

    await adminClient!.rpc('buyer_jarvis_persistir_mensagens', {
      p_session_id: sessionId,
      p_user_id: authData.user.id,
      p_user_body: userMessage,
      p_assistant_body: reply,
      p_metadata: {
        route,
        model,
        provider: completion.provider ?? 'none',
        ai_offline: model === 'deterministic-fallback',
        ai_offline_reason: aiOfflineReason || completion.error || null,
        rules_version: 'levou-kb-v1',
        tokens_in: completion.tokensIn,
        tokens_out: completion.tokensOut,
      },
    });

    return jsonResponse({
      ok: true,
      sessionId,
      reply,
      context,
      model,
      provider: completion.provider ?? 'none',
      aiOffline: model === 'deterministic-fallback',
      aiOfflineReason: aiOfflineReason || undefined,
      tokensIn: completion.tokensIn,
      tokensOut: completion.tokensOut,
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
