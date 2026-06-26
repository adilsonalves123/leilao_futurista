import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { processarMensagemSuporte } from '@/src/services/suporteAgent';

export type SuporteAiProcessResult = {
  respostas: string[];
  escalateHuman?: boolean;
  model?: string;
};

export type SuporteAiEdgeResponse = {
  ok: boolean;
  replies?: string[];
  escalateHuman?: boolean;
  model?: string;
  error?: string;
};

async function humanizarErroEdgeFunction(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'Suporte IA temporariamente indisponível.';

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
    return 'Suporte IA temporariamente indisponível. Tente de novo em instantes.';
  }

  return msg.trim() || 'Suporte IA temporariamente indisponível.';
}

export async function processarMensagemSuporteAi(
  conversationId: string,
  mensagem: string,
  atalhoId?: string,
): Promise<SuporteAiProcessResult> {
  if (!isSupabaseConfigured()) {
    return {
      respostas: await processarMensagemSuporte(mensagem, atalhoId),
      model: 'local-deterministic',
      escalateHuman: atalhoId === 'humano',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      respostas: await processarMensagemSuporte(mensagem, atalhoId),
      model: 'local-deterministic',
      escalateHuman: atalhoId === 'humano',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return {
      respostas: ['Faça login no app para eu consultar seus dados com segurança.'],
      model: 'local-auth',
    };
  }

  const { data, error } = await supabase.functions.invoke<SuporteAiEdgeResponse>('support-ai-agent', {
    body: {
      conversationId,
      message: mensagem.trim() || undefined,
      atalhoId,
    },
  });

  if (error) {
    const msg = await humanizarErroEdgeFunction(error);
    console.warn('[suporteAiAgent]', msg);
    return {
      respostas: await processarMensagemSuporte(mensagem, atalhoId),
      model: 'local-fallback',
      escalateHuman: atalhoId === 'humano',
    };
  }

  if (!data?.ok) {
    console.warn('[suporteAiAgent]', data?.error);
    return {
      respostas: await processarMensagemSuporte(mensagem, atalhoId),
      model: 'local-fallback',
      escalateHuman: atalhoId === 'humano',
    };
  }

  if (data.escalateHuman) {
    return {
      respostas: [],
      escalateHuman: true,
      model: data.model ?? 'escalation',
    };
  }

  const respostas = (data.replies ?? []).filter((r) => r.trim());
  if (!respostas.length) {
    return {
      respostas: await processarMensagemSuporte(mensagem, atalhoId),
      model: 'local-fallback',
    };
  }

  return {
    respostas,
    model: data.model,
  };
}

export async function solicitarAtendimentoHumanoSuporte(conversationId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return processarMensagemSuporte('', 'humano');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return processarMensagemSuporte('', 'humano');
  }

  const { error } = await supabase.rpc('suporte_solicitar_atendimento_humano', {
    p_conversation_id: conversationId,
  });

  if (error) {
    console.warn('[suporteAiAgent] solicitar humano:', error.message);
    return processarMensagemSuporte('', 'humano');
  }

  return [];
}
