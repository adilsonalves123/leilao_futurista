import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  AdminAiAssistantResponse,
  AdminAiContextBundle,
  AdminAiMessage,
  AdminSystemErrorRow,
} from '@/src/types/adminAi';

const MOCK_CONTEXT: AdminAiContextBundle = {
  generated_at: new Date().toISOString(),
  hours: 24,
  resumo: {
    hours: 24,
    kyc_pendente: 3,
    kyc_em_analise: 2,
    disputas_abertas: 1,
    pedidos_pendentes_pagamento: 4,
    pix_recargas_pendentes: 2,
    pix_recargas_pendentes_mais_24h: 1,
    push_falhas_periodo: 0,
    erros_nao_resolvidos: 2,
    erros_criticos_periodo: 1,
    erros_pix_periodo: 1,
    suporte_atendimento_humano: 0,
  },
  erros_recentes: [
    {
      id: 'demo-1',
      source: 'create-asaas-wallet-deposit',
      severity: 'critical',
      category: 'pix',
      code: 'ASAAS_PIX_KEY_MISSING',
      message: 'Conta Asaas sandbox sem chave Pix cadastrada.',
      created_at: new Date().toISOString(),
    },
  ],
  alertas: [
    {
      kind: 'pix_errors',
      severity: 'warning',
      title: 'Falhas Pix no período',
      detail: '1 evento(s) de erro Pix registrado(s).',
    },
    {
      kind: 'kyc_queue',
      severity: 'info',
      title: 'KYC aguardando análise',
      detail: '2 cadastro(s) em análise.',
    },
  ],
};

async function assertAdminRpc(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: ehAdmin, error } = await supabase.rpc('auth_is_admin');
  if (error) {
    throw new Error(`auth_is_admin indisponível: ${error.message}`);
  }
  if (ehAdmin !== true) {
    throw new Error('Conta logada não é admin.');
  }
}

function mapContext(data: Record<string, unknown>): AdminAiContextBundle {
  const resumo = (data.resumo ?? {}) as Record<string, unknown>;
  return {
    generated_at: String(data.generated_at ?? new Date().toISOString()),
    hours: Number(data.hours ?? 24),
    resumo: {
      hours: Number(resumo.hours ?? 24),
      kyc_pendente: Number(resumo.kyc_pendente ?? 0),
      kyc_em_analise: Number(resumo.kyc_em_analise ?? 0),
      disputas_abertas: Number(resumo.disputas_abertas ?? 0),
      pedidos_pendentes_pagamento: Number(resumo.pedidos_pendentes_pagamento ?? 0),
      pix_recargas_pendentes: Number(resumo.pix_recargas_pendentes ?? 0),
      pix_recargas_pendentes_mais_24h: Number(resumo.pix_recargas_pendentes_mais_24h ?? 0),
      push_falhas_periodo: Number(resumo.push_falhas_periodo ?? 0),
      erros_nao_resolvidos: Number(resumo.erros_nao_resolvidos ?? 0),
      erros_criticos_periodo: Number(resumo.erros_criticos_periodo ?? 0),
      erros_pix_periodo: Number(resumo.erros_pix_periodo ?? 0),
      suporte_atendimento_humano: Number(resumo.suporte_atendimento_humano ?? 0),
    },
    erros_recentes: Array.isArray(data.erros_recentes)
      ? (data.erros_recentes as AdminAiContextBundle['erros_recentes'])
      : [],
    alertas: Array.isArray(data.alertas)
      ? (data.alertas as AdminAiContextBundle['alertas'])
      : [],
  };
}

function localAdminReply(message: string | undefined, context: AdminAiContextBundle): string {
  const r = context.resumo;
  if (!message) {
    return [
      `Briefing (${context.hours}h):`,
      `• KYC em análise: ${r.kyc_em_analise}`,
      `• Disputas abertas: ${r.disputas_abertas}`,
      `• Erros Pix: ${r.erros_pix_periodo}`,
      `• Erros críticos: ${r.erros_criticos_periodo}`,
      context.alertas.length
        ? `\nAlertas: ${context.alertas.map((a) => a.title).join('; ')}`
        : '',
    ].join('\n');
  }

  const q = message.toLowerCase();
  if (q.includes('pix')) {
    return `Erros Pix no período: ${r.erros_pix_periodo}. Pendentes >24h: ${r.pix_recargas_pendentes_mais_24h}. Veja logs em system_error_logs.`;
  }
  if (q.includes('disputa')) {
    return `Disputas abertas: ${r.disputas_abertas}. Acesse /admin/disputas.`;
  }
  return `Erros não resolvidos: ${r.erros_nao_resolvidos}. Push com falha: ${r.push_falhas_periodo}.`;
}

export async function carregarContextoAdminAi(hours = 24): Promise<AdminAiContextBundle> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_CONTEXT;
  }

  try {
    await assertAdminRpc();
  } catch (e) {
    console.warn('[adminAiAssistant] contexto sem admin:', e);
    return MOCK_CONTEXT;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_CONTEXT;

  const { data, error } = await supabase.rpc('admin_ai_context_bundle', { p_hours: hours });
  if (error) {
    console.warn('[adminAiAssistant] context bundle:', error.message);
    return MOCK_CONTEXT;
  }

  return mapContext(data as Record<string, unknown>);
}

export async function listarMensagensAdminAi(sessionId: string): Promise<AdminAiMessage[]> {
  if (sessionId.startsWith('local-') || !isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('admin_ai_listar_mensagens', {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn('[adminAiAssistant] listar mensagens:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    role: row.role as AdminAiMessage['role'],
    body: row.body as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}

export async function listarErrosSistemaAdmin(
  limit = 20,
): Promise<AdminSystemErrorRow[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_CONTEXT.erros_recentes.map((e) => ({
      id: e.id,
      source: e.source,
      severity: e.severity,
      category: e.category,
      code: e.code,
      message: e.message,
      userEmail: null,
      resolved: false,
      createdAt: e.created_at,
    }));
  }

  try {
    await assertAdminRpc();
  } catch {
    return MOCK_CONTEXT.erros_recentes.map((e) => ({
      id: e.id,
      source: e.source,
      severity: e.severity,
      category: e.category,
      code: e.code,
      message: e.message,
      userEmail: null,
      resolved: false,
      createdAt: e.created_at,
    }));
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('admin_listar_erros_sistema', {
    p_resolved: false,
    p_category: null,
    p_severity: null,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) {
    console.warn('[adminAiAssistant] listar erros:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    source: row.source as string,
    severity: row.severity as string,
    category: row.category as string,
    code: (row.code as string | null) ?? null,
    message: row.message as string,
    userEmail: (row.user_email as string | null) ?? null,
    resolved: Boolean(row.resolved),
    createdAt: row.created_at as string,
  }));
}

export async function resolverErroSistemaAdmin(errorId: string): Promise<boolean> {
  if (isMockMode() || !isSupabaseConfigured()) return true;

  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('admin_resolver_erro_sistema', {
    p_error_id: errorId,
  });

  if (error) {
    console.warn('[adminAiAssistant] resolver erro:', error.message);
    return false;
  }

  return (data as { ok?: boolean })?.ok === true;
}

export async function consultarAssistenteAdmin(input: {
  message?: string;
  sessionId?: string | null;
  hours?: number;
}): Promise<AdminAiAssistantResponse> {
  const context = await carregarContextoAdminAi(input.hours ?? 24);

  if (isMockMode() || !isSupabaseConfigured()) {
    const reply = localAdminReply(input.message, context);
    return {
      ok: true,
      sessionId: 'local-admin',
      context,
      reply,
      model: 'local-deterministic',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: true,
      sessionId: 'local-admin',
      context,
      reply: localAdminReply(input.message, context),
      model: 'local-deterministic',
    };
  }

  try {
    await assertAdminRpc();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Admin não autenticado.',
      context,
    };
  }

  const { data, error } = await supabase.functions.invoke<AdminAiAssistantResponse>(
    'admin-ai-assistant',
    {
      body: {
        message: input.message?.trim() || undefined,
        sessionId: input.sessionId ?? undefined,
        hours: input.hours ?? 24,
      },
    },
  );

  if (error) {
    const msg = error.message.includes('admin-ai-assistant')
      ? 'Deploy a Edge Function admin-ai-assistant e configure OPENAI_API_KEY.'
      : error.message;
    return {
      ok: true,
      sessionId: input.sessionId ?? 'local-admin',
      context,
      reply: localAdminReply(input.message, context),
      model: 'local-deterministic',
      error: msg,
    };
  }

  if (!data?.ok) {
    return {
      ok: true,
      sessionId: input.sessionId ?? 'local-admin',
      context: data?.context ? mapContext(data.context as unknown as Record<string, unknown>) : context,
      reply: localAdminReply(input.message, context),
      error: data?.error,
      model: 'local-deterministic',
    };
  }

  return {
    ...data,
    context: data.context ? mapContext(data.context as unknown as Record<string, unknown>) : context,
  };
}

export function mapAdminAiMessagesToChat(
  rows: AdminAiMessage[],
): Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }> {
  return rows
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      text: r.body,
      createdAt: new Date(r.createdAt).getTime(),
    }));
}
