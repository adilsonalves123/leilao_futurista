import { prepararImagemParaVisao } from '@/src/lib/listingCoverImageEnhance';
import { jarvisAiSecretsHint } from '@/src/lib/jarvisAiStatus';
import { isMockMode } from '@/src/lib/mockMode';
import { uriParaBase64 } from '@/src/lib/uriToArrayBuffer';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type KycSelfieVerifyResult = {
  ok: boolean;
  approved: boolean;
  confidence?: number;
  issues?: string[];
  summary?: string;
  error?: string;
};

type EdgeResponse = {
  ok: boolean;
  approved?: boolean;
  confidence?: number;
  issues?: string[];
  summary?: string;
  error?: string;
  aiOffline?: boolean;
};

async function humanizarErro(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'Verificação facial indisponível.';

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

  if (msg.includes('kyc-selfie-verify') || /not found|não encontrad/i.test(msg)) {
    return 'Função kyc-selfie-verify não publicada. No terminal: npx supabase functions deploy kyc-selfie-verify';
  }

  if (/non-2xx|2xx status/i.test(msg)) {
    return `Erro na verificação facial. Confira OPENAI_API_KEY e deploy. ${jarvisAiSecretsHint()}`;
  }

  return msg.trim() || 'Verificação facial indisponível.';
}

/** Verifica se a selfie contém um rosto humano real (OpenAI Vision via Edge Function). */
export async function verificarSelfieKyc(uri: string): Promise<KycSelfieVerifyResult> {
  if (isMockMode() || !isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      ok: true,
      approved: true,
      confidence: 1,
      summary: 'Verificação facial aprovada (modo demonstração).',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: true,
      approved: true,
      confidence: 1,
      summary: 'Verificação facial aprovada (modo local).',
    };
  }

  try {
    const prepared = await prepararImagemParaVisao(uri, 1024);
    const { base64, mime } = await uriParaBase64(prepared);

    const { data, error } = await supabase.functions.invoke<EdgeResponse>('kyc-selfie-verify', {
      body: { image: { base64, mime } },
    });

    if (error) {
      return {
        ok: false,
        approved: false,
        error: await humanizarErro(error),
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        approved: false,
        error: data?.error ?? 'Falha na verificação facial.',
      };
    }

    return {
      ok: true,
      approved: data.approved === true,
      confidence: data.confidence,
      issues: data.issues,
      summary: data.summary,
    };
  } catch (e) {
    return {
      ok: false,
      approved: false,
      error: e instanceof Error ? e.message : 'Erro ao verificar selfie.',
    };
  }
}
