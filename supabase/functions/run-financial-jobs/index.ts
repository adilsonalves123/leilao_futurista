import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type FinancialJobsResult = {
  ok?: boolean;
  collateral_released?: number;
  winners_forfeited?: number;
  deadline_hours?: number;
  ran_at?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('FINANCIAL_CRON_SECRET')?.trim()
      ?? Deno.env.get('PUSH_CRON_SECRET')?.trim();
    const headerSecret = req.headers.get('x-cron-secret')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();

    if (!serviceKey || !supabaseUrl) {
      return jsonResponse({ error: 'Supabase não configurado na Edge Function.' }, 500);
    }

    const authorizedByCron = cronSecret && headerSecret === cronSecret;
    const authorizedByService = authHeader === `Bearer ${serviceKey}`;

    let authorizedByAdmin = false;
    if (!authorizedByCron && !authorizedByService && authHeader.startsWith('Bearer ')) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
      if (anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: isAdmin, error: adminError } = await userClient.rpc('auth_is_admin');
        authorizedByAdmin = !adminError && isAdmin === true;
      }
    }

    if (!authorizedByCron && !authorizedByService && !authorizedByAdmin) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const deadlineHours = Math.max(Math.round(Number(body.deadlineHours) || 48), 1);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc('run_scheduled_financial_jobs', {
      p_deadline_hours: deadlineHours,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const result = (data ?? {}) as FinancialJobsResult;

    // Dispara envio de push para notificações enfileiradas pelo job (best-effort).
    if (cronSecret && headerSecret === cronSecret) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': headerSecret,
          },
          body: '{}',
        });
      } catch (pushError) {
        console.warn('[run-financial-jobs] send-push:', pushError);
      }
    }

    return jsonResponse({ ok: true, jobs: result });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
