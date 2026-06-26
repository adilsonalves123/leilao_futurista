import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAiChatCompletion, type ChatMessage } from '../_shared/openaiClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { describeCaughtError, isLikelyTimeoutError, logSystemError } from '../_shared/systemErrorLog.ts';

const SOURCE = 'admin-ai-assistant';

type AdminAiBody = {
  sessionId?: string;
  message?: string;
  hours?: number;
};

type HistoryRow = {
  role: string;
  body: string;
};

function buildFallbackReply(context: Record<string, unknown>, userMessage?: string): string {
  const resumo = (context.resumo ?? {}) as Record<string, unknown>;
  const alertas = (context.alertas ?? []) as Array<{ title?: string; detail?: string }>;

  if (!userMessage) {
    const linhas = [
      `KYC em análise: ${resumo.kyc_em_analise ?? 0}`,
      `Disputas abertas: ${resumo.disputas_abertas ?? 0}`,
      `Erros Pix (período): ${resumo.erros_pix_periodo ?? 0}`,
      `Erros críticos: ${resumo.erros_criticos_periodo ?? 0}`,
    ];
    if (alertas.length) {
      linhas.push('', 'Alertas:', ...alertas.map((a) => `• ${a.title}: ${a.detail}`));
    }
    return linhas.join('\n');
  }

  const q = userMessage.toLowerCase();
  if (q.includes('pix')) {
    return `Erros Pix no período: ${resumo.erros_pix_periodo ?? 0}. Recargas pendentes >24h: ${resumo.pix_recargas_pendentes_mais_24h ?? 0}. Consulte system_error_logs ou /admin pedidos.`;
  }
  if (q.includes('kyc')) {
    return `KYC pendente: ${resumo.kyc_pendente ?? 0}, em análise: ${resumo.kyc_em_analise ?? 0}. Acesse /admin/kyc para fila.`;
  }
  if (q.includes('disputa')) {
    return `Disputas abertas: ${resumo.disputas_abertas ?? 0}. Veja /admin/disputas.`;
  }

  return `Com base no painel: ${resumo.erros_nao_resolvidos ?? 0} erro(s) não resolvido(s), ${resumo.push_falhas_periodo ?? 0} push com falha no período.`;
}

function buildSystemPrompt(context: Record<string, unknown>): string {
  return [
    'Você é o Assistente Adilson, copiloto interno do admin do marketplace Levou (leilões).',
    'Responda em português do Brasil, objetivo e acionável (máx. 180 palavras).',
    'Use SOMENTE os dados do contexto JSON abaixo — não invente números.',
    'Priorize alertas críticos (Pix, erros de sistema, disputas, KYC).',
    'Quando citar erros, mencione source/code se disponível.',
    '',
    'CONTEXTO OPERACIONAL (JSON):',
    JSON.stringify(context).slice(0, 12000),
  ].join('\n');
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
      return jsonResponse({ ok: false, error: 'Faça login como admin.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const { data: ehAdmin } = await userClient.rpc('auth_is_admin');
    if (ehAdmin !== true) {
      return jsonResponse({ ok: false, error: 'Acesso negado: admin necessário.' }, 403);
    }

    const body = (await req.json()) as AdminAiBody;
    const userMessage = body.message?.trim() || null;
    const hours = Math.min(168, Math.max(1, Math.round(Number(body.hours) || 24)));

    let sessionId = body.sessionId?.trim() || null;
    if (!sessionId) {
      const { data: newSessionId, error: sessionError } = await userClient.rpc(
        'admin_ai_obter_ou_criar_sessao',
      );
      if (sessionError || !newSessionId) {
        return jsonResponse({ ok: false, error: sessionError?.message ?? 'Falha na sessão.' }, 500);
      }
      sessionId = newSessionId as string;
    }

    const { data: contextRaw, error: contextError } = await userClient.rpc('admin_ai_context_bundle', {
      p_hours: hours,
    });

    if (contextError || !contextRaw) {
      return jsonResponse({ ok: false, error: contextError?.message ?? 'Falha ao carregar contexto.' }, 500);
    }

    const context = contextRaw as Record<string, unknown>;

    const { data: historyRaw } = await adminClient
      .from('admin_ai_messages')
      .select('role, body')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(14);

    const history = (historyRaw ?? []) as HistoryRow[];

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(context) },
    ];

    for (const row of history) {
      if (row.role === 'user' || row.role === 'assistant') {
        chatMessages.push({ role: row.role, content: row.body });
      }
    }

    if (userMessage) {
      chatMessages.push({ role: 'user', content: userMessage });
    } else if (history.length === 0) {
      chatMessages.push({
        role: 'user',
        content: `Gere um briefing operacional das últimas ${hours} horas: o que exige atenção imediata do admin?`,
      });
    } else {
      return jsonResponse({
        ok: true,
        sessionId,
        context,
        reply: null,
        fromHistory: true,
      });
    }

    const completion = await createOpenAiChatCompletion(chatMessages, { maxTokens: 900 });
    let reply = completion.text;
    let model = completion.model;

    if (!completion.ok || !reply) {
      reply = buildFallbackReply(context, userMessage ?? undefined);
      model = 'deterministic-fallback';
      if (completion.error && adminClient) {
        await logSystemError(adminClient, {
          source: SOURCE,
          severity: 'warning',
          category: 'ia',
          code: completion.error === 'OPENAI_API_KEY_MISSING' ? 'OPENAI_API_KEY_MISSING' : 'OPENAI_COMPLETION_FAILED',
          message: completion.error,
          userId: authData.user.id,
        });
      }
    }

    await adminClient.rpc('admin_ai_persistir_mensagens', {
      p_session_id: sessionId,
      p_admin_user_id: authData.user.id,
      p_user_body: userMessage ?? (history.length === 0 ? chatMessages[chatMessages.length - 1]?.content : null),
      p_assistant_body: reply,
      p_metadata: {
        model,
        hours,
        tokens_in: completion.tokensIn,
        tokens_out: completion.tokensOut,
      },
    });

    return jsonResponse({
      ok: true,
      sessionId,
      context,
      reply,
      model,
      fromCache: false,
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
