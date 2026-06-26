import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { analyzeKycSelfie } from '../_shared/kycSelfieVision.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { describeCaughtError } from '../_shared/systemErrorLog.ts';

type Body = {
  image?: { base64: string; mime?: string };
};

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
      return jsonResponse({ ok: false, error: 'Faça login para verificar a selfie.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as Body;
    const base64 = body.image?.base64?.trim();
    if (!base64) {
      return jsonResponse({ ok: false, error: 'Envie a imagem da selfie.' }, 400);
    }

    const result = await analyzeKycSelfie({
      base64,
      mime: body.image?.mime?.trim() || 'image/jpeg',
    });

    if (!result.ok) {
      return jsonResponse({
        ok: false,
        approved: false,
        error: result.error ?? 'Falha na verificação facial.',
        aiOffline: result.error === 'OPENAI_API_KEY_MISSING',
      });
    }

    return jsonResponse({
      ok: true,
      approved: result.approved,
      confidence: result.confidence,
      issues: result.issues,
      summary: result.summary,
      model: result.model,
      provider: 'openai',
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: describeCaughtError(error) }, 500);
  }
});
