import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAiChatCompletion, type ChatMessage } from '../_shared/openaiClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { describeCaughtError, isLikelyTimeoutError, logSystemError } from '../_shared/systemErrorLog.ts';

const SOURCE = 'support-ai-agent';

type SupportAiBody = {
  conversationId?: string;
  message?: string;
  atalhoId?: string;
};

type HistoryRow = { role: string; body: string };

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function deveEscalarHumano(texto: string, atalhoId?: string): boolean {
  if (atalhoId === 'humano') return true;
  const t = normalizar(texto);
  return (
    t.includes('contest') ||
    t.includes('disputa') ||
    t.includes('cobranca errada') ||
    t.includes('fatura errada') ||
    t.includes('cobranca indevida') ||
    t.includes('atendente humano') ||
    t === 'humano' ||
    (t.includes('fatura') &&
      (t.includes('errad') || t.includes('incorret') || t.includes('nao reconheco')))
  );
}

function mensagemParaAtalho(atalhoId: string | undefined, message: string): string {
  if (atalhoId === 'kyc') return 'Qual é o status do meu KYC?';
  if (atalhoId === 'rastreio') return 'Quero consultar o rastreio dos meus arremates';
  if (atalhoId === 'carteira') return 'Explique meu saldo na carteira';
  if (atalhoId === 'humano') return 'Preciso falar com um atendente sobre minha fatura';
  return message;
}

function buildFallbackReply(context: Record<string, unknown>, userMessage: string): string {
  const user = (context.user ?? {}) as Record<string, unknown>;
  const wallet = (context.wallet ?? {}) as Record<string, unknown>;
  const orders = (context.orders ?? []) as Array<{
    code?: string;
    title?: string;
    tracking_code?: string | null;
    status?: string;
  }>;

  const q = normalizar(userMessage);
  if (q.includes('kyc') || q.includes('cadastro') || q.includes('verificacao')) {
    return `Status KYC (${user.email ?? 'sua conta'}): ${user.kyc_status ?? 'pendente'}. Complete em Mais → Meu cadastro (KYC) se ainda não aprovado.`;
  }
  if (q.includes('rastreio') || q.includes('envio') || q.includes('entrega')) {
    const comCodigo = orders.filter((o) => o.tracking_code?.trim());
    if (!comCodigo.length) {
      return 'Ainda não há código de rastreio nos seus arremates. Assim que o vendedor postar, aparece em Mais → Meus Lotes / Arremates.';
    }
    const linhas = comCodigo
      .slice(0, 3)
      .map((o) => `• ${o.title} (${o.code}): ${o.tracking_code}`)
      .join('\n');
    return `Seus rastreios:\n${linhas}`;
  }
  if (q.includes('carteira') || q.includes('saldo') || q.includes('pix')) {
    return (
      `Carteira: disponível ${formatBrl(Number(wallet.available_cents ?? 0))}, ` +
      `retido ${formatBrl(Number(wallet.hold_cents ?? 0))}. Depósitos e saques: aba Carteira.`
    );
  }
  if (q.includes('lance') || q.includes('leilao')) {
    return 'Para lances: KYC aprovado é obrigatório. Regras em Mais → Ajuda → Como funciona o leilão.';
  }
  return 'Posso ajudar com KYC, rastreio, carteira e lances. Para contestação de fatura, peça atendimento humano.';
}

function buildSystemPrompt(context: Record<string, unknown>): string {
  return [
    'Você é o assistente virtual de suporte do app Levou (leilões), em português do Brasil.',
    'Responda de forma objetiva (máx. 160 palavras), amigável e acionável.',
    'Use SOMENTE os dados do contexto JSON — não invente números, códigos ou status.',
    'Escopo: KYC/cadastro, rastreio de arremates, saldo disponível/retido na carteira, regras de lances.',
    'NÃO resolva contestação de faturas, disputas de cobrança ou casos que exijam análise manual — nesses casos diga que vai encaminhar para humano.',
    'Não peça senha, CPF completo ou dados bancários sensíveis.',
    'Se o usuário enviou foto, oriente a descrever o assunto em texto.',
    '',
    'CONTEXTO DO USUÁRIO (JSON):',
    JSON.stringify(context).slice(0, 10000),
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
      return jsonResponse({ ok: false, error: 'Faça login para usar o suporte.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as SupportAiBody;
    const conversationId = body.conversationId?.trim();
    const userMessage = mensagemParaAtalho(body.atalhoId, body.message?.trim() ?? '');

    if (!conversationId) {
      return jsonResponse({ ok: false, error: 'conversationId obrigatório.' }, 400);
    }
    if (!userMessage) {
      return jsonResponse({ ok: false, error: 'Mensagem vazia.' }, 400);
    }

    if (deveEscalarHumano(userMessage, body.atalhoId)) {
      return jsonResponse({
        ok: true,
        replies: [],
        escalateHuman: true,
        model: 'escalation-rules',
      });
    }

    const { data: contextRaw, error: contextError } = await userClient.rpc('suporte_ai_context_bundle');

    if (contextError || !contextRaw || (contextRaw as { ok?: boolean }).ok === false) {
      return jsonResponse({ ok: false, error: contextError?.message ?? 'Falha ao carregar contexto.' }, 500);
    }

    const context = contextRaw as Record<string, unknown>;

    const { data: historyRaw } = await adminClient!
      .from('support_messages')
      .select('role, body')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(14);

    const history = (historyRaw ?? []) as HistoryRow[];
    const chatMessages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt(context) }];

    for (const row of history) {
      if (row.role === 'user') {
        chatMessages.push({ role: 'user', content: row.body });
      } else if (row.role === 'bot' || row.role === 'admin') {
        chatMessages.push({ role: 'assistant', content: row.body });
      }
    }

    if (!history.some((h) => h.role === 'user' && h.body === userMessage)) {
      chatMessages.push({ role: 'user', content: userMessage });
    }

    const completion = await createOpenAiChatCompletion(chatMessages, { maxTokens: 450, temperature: 0.35 });
    let reply = completion.text;
    let model = completion.model;

    if (!completion.ok || !reply) {
      reply = buildFallbackReply(context, userMessage);
      model = 'deterministic-fallback';
      if (completion.error && adminClient) {
        await logSystemError(adminClient, {
          source: SOURCE,
          severity: 'warning',
          category: 'ia',
          code:
            completion.error === 'OPENAI_API_KEY_MISSING'
              ? 'OPENAI_API_KEY_MISSING'
              : 'OPENAI_COMPLETION_FAILED',
          message: completion.error,
          userId: authData.user.id,
          payload: { conversationId },
        });
      }
    }

    if (deveEscalarHumano(reply)) {
      return jsonResponse({
        ok: true,
        replies: [],
        escalateHuman: true,
        model,
      });
    }

    return jsonResponse({
      ok: true,
      replies: [reply],
      escalateHuman: false,
      model,
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
