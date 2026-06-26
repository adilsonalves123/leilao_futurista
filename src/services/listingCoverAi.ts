import {
  prepararImagemParaVisao,
  salvarBase64ComoArquivoLocal,
} from '@/src/lib/listingCoverImageEnhance';
import { jarvisAiSecretsHint } from '@/src/lib/jarvisAiStatus';
import { uriParaBase64 } from '@/src/lib/uriToArrayBuffer';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { isMockMode } from '@/src/lib/mockMode';

export type ListingCoverAiResult = {
  ok: boolean;
  coverUri: string;
  galleryUris: string[];
  summary?: string;
  backgroundRemoved?: boolean;
  sceneComposed?: boolean;
  aiApplied: boolean;
  error?: string;
};

type EdgeResponse = {
  ok: boolean;
  bestIndex?: number;
  summary?: string;
  backgroundRemoved?: boolean;
  sceneComposed?: boolean;
  processedImage?: { base64: string; mime: string } | null;
  error?: string;
  aiOffline?: boolean;
};

async function humanizarErroCapaAi(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'Otimização de capa indisponível.';

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

  if (msg.includes('listing-cover-ai') || /not found|não encontrad/i.test(msg)) {
    return 'Função listing-cover-ai não está publicada no Supabase. No terminal: npx supabase login → npx supabase functions deploy listing-cover-ai';
  }

  if (/non-2xx|2xx status/i.test(msg)) {
    return `Servidor da capa IA respondeu com erro. Confira OPENAI_API_KEY e deploy de listing-cover-ai. ${jarvisAiSecretsHint()}`;
  }

  return msg.trim() || 'Otimização de capa indisponível.';
}

function deveUsarFallbackLocal(msg: string): boolean {
  return (
    msg.includes('OPENAI') ||
    msg.includes('AI_KEYS') ||
    /not found|não encontrad/i.test(msg)
  );
}

async function otimizarCapaLocal(
  coverUri: string,
  galleryUris: string[],
): Promise<ListingCoverAiResult> {
  return {
    ok: true,
    coverUri,
    galleryUris,
    summary: 'Foto original mantida (cenário profissional requer Supabase + REMOVE_BG_API_KEY).',
    aiApplied: false,
  };
}

/**
 * Agente "Capa que vende mais" — mesma OPENAI_API_KEY do Jarvis (Edge Function listing-cover-ai).
 */
export async function otimizarCapaAnuncio(input: {
  coverUri: string;
  galleryUris: string[];
  title: string;
  category: string;
}): Promise<ListingCoverAiResult> {
  const allUris = [input.coverUri, ...input.galleryUris.filter((u) => u && u !== input.coverUri)];

  if (isMockMode() || !isSupabaseConfigured()) {
    return otimizarCapaLocal(input.coverUri, input.galleryUris);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return otimizarCapaLocal(input.coverUri, input.galleryUris);
  }

  try {
    const prepared = await Promise.all(allUris.map((uri) => prepararImagemParaVisao(uri)));
    const images = await Promise.all(
      prepared.map(async (uri) => {
        const { base64, mime } = await uriParaBase64(uri);
        return { base64, mime };
      }),
    );

    const { data, error } = await supabase.functions.invoke<EdgeResponse>('listing-cover-ai', {
      body: {
        title: input.title,
        category: input.category,
        images,
      },
    });

    if (error) {
      const msg = await humanizarErroCapaAi(error);
      if (deveUsarFallbackLocal(msg)) {
        const local = await otimizarCapaLocal(input.coverUri, input.galleryUris);
        return {
          ...local,
          summary: `${local.summary ?? ''} (${msg})`.trim(),
        };
      }
      return {
        ok: false,
        coverUri: input.coverUri,
        galleryUris: input.galleryUris,
        aiApplied: false,
        error: msg,
      };
    }

    if (!data?.ok) {
      const msg = data?.error ?? 'Falha na otimização de capa.';
      if (data?.aiOffline || deveUsarFallbackLocal(msg)) {
        const local = await otimizarCapaLocal(input.coverUri, input.galleryUris);
        return {
          ...local,
          summary: local.summary ?? 'Melhor foto selecionada (cenário profissional indisponível).',
        };
      }
      return {
        ok: false,
        coverUri: input.coverUri,
        galleryUris: input.galleryUris,
        aiApplied: false,
        error: msg,
      };
    }

    const bestIndex = Math.min(Math.max(0, data.bestIndex ?? 0), allUris.length - 1);
    let bestUri = allUris[bestIndex];
    const restUris = allUris.filter((_, i) => i !== bestIndex);

    if (data.processedImage?.base64) {
      bestUri = await salvarBase64ComoArquivoLocal(
        data.processedImage.base64,
        data.processedImage.mime,
      );
    }

    const aiApplied = !!data.processedImage?.base64 || bestIndex !== 0;

    return {
      ok: true,
      coverUri: bestUri,
      galleryUris: restUris,
      summary: data.summary,
      backgroundRemoved: data.backgroundRemoved,
      sceneComposed: data.sceneComposed,
      aiApplied: !!data.processedImage?.base64,
    };
  } catch (e) {
    return {
      ok: false,
      coverUri: input.coverUri,
      galleryUris: input.galleryUris,
      aiApplied: false,
      error: e instanceof Error ? e.message : 'Erro ao otimizar capa.',
    };
  }
}
