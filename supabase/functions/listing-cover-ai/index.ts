import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  analyzeListingCoverPhotos,
  removeBackgroundFromImage,
  type VisionImageInput,
} from '../_shared/aiVisionClient.ts';
import {
  composeListingCoverScene,
  extractProductRegion,
  sceneKeyForCategory,
} from '../_shared/listingCoverSceneCompose.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { describeCaughtError } from '../_shared/systemErrorLog.ts';

type Body = {
  title?: string;
  category?: string;
  images?: Array<{ base64: string; mime?: string }>;
  coverIndex?: number;
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ ok: false, error: 'Supabase não configurado.' }, 500);
    }
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'Faça login para usar a otimização de capa.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as Body;
    const images: VisionImageInput[] = (body.images ?? [])
      .filter((img) => img?.base64?.trim())
      .map((img) => ({
        base64: img.base64.trim(),
        mime: img.mime?.trim() || 'image/jpeg',
      }));

    if (!images.length) {
      return jsonResponse({ ok: false, error: 'Envie pelo menos uma foto.' }, 400);
    }

    const analysis = await analyzeListingCoverPhotos(images, {
      title: body.title?.trim() || 'Anúncio',
      category: body.category?.trim() || 'geral',
    });

    if (!analysis.ok) {
      return jsonResponse({
        ok: false,
        error: analysis.error ?? 'Falha na análise de capa.',
        aiOffline: analysis.error === 'OPENAI_API_KEY_MISSING',
      });
    }

    let processedBase64: string | null = null;
    let processedMime: string | null = null;
    let backgroundRemoved = false;
    let sceneComposed = false;

    const category = body.category?.trim() || 'geral';
    const sceneKey =
      analysis.sceneKey === 'desk' ? 'desk' : sceneKeyForCategory(category);

    const bestBytes = base64ToBytes(images[analysis.bestIndex].base64);
    const bestMime = images[analysis.bestIndex].mime;

    let productBytes: Uint8Array | null = null;

    const removed = await removeBackgroundFromImage(bestBytes, bestMime);
    if (removed.ok && removed.bytes) {
      productBytes = removed.bytes;
      backgroundRemoved = true;
    } else {
      productBytes = await extractProductRegion(bestBytes, analysis.productBbox);
    }

    if (productBytes) {
      const composed = await composeListingCoverScene(productBytes, sceneKey);
      if (composed.ok && composed.bytes) {
        processedBase64 = bytesToBase64(composed.bytes);
        processedMime = 'image/jpeg';
        sceneComposed = true;
      }
    }

    let summary = analysis.summary;
    if (sceneComposed && backgroundRemoved) {
      summary =
        analysis.summary ||
        'Fundo removido e produto colocado em cenário profissional.';
    } else if (sceneComposed) {
      summary =
        analysis.summary ||
        'Produto destacado em cenário profissional (mesa/estúdio).';
    } else {
      summary =
        analysis.summary ||
        'Não foi possível montar o cenário. Tente outra foto.';
    }

    return jsonResponse({
      ok: true,
      bestIndex: analysis.bestIndex,
      removeBackground: analysis.removeBackground,
      sceneKey,
      backgroundRemoved,
      sceneComposed,
      summary,
      model: analysis.model,
      processedImage:
        processedBase64 && processedMime
          ? { base64: processedBase64, mime: processedMime }
          : null,
      provider: 'openai',
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: describeCaughtError(error) }, 500);
  }
});
