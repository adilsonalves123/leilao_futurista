import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type OutboxRow = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type PushTokenRow = {
  expo_push_token: string;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

const BATCH_SIZE = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('PUSH_CRON_SECRET')?.trim();
    const headerSecret = req.headers.get('x-cron-secret')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();

    if (!serviceKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Supabase não configurado na Edge Function.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: jobStats, error: jobError } = await supabase.rpc('run_scheduled_push_jobs');
    if (jobError) {
      console.warn('[send-push] run_scheduled_push_jobs:', jobError.message);
    }

    const { data: pending, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('id, user_id, notification_type, title, body, data')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = (pending ?? []) as OutboxRow[];
    if (!rows.length) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, jobs: jobStats ?? null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      const { data: tokens, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('expo_push_token')
        .eq('user_id', row.user_id)
        .eq('active', true);

      if (tokenError) {
        await markOutbox(supabase, row.id, 'failed', tokenError.message);
        failed += 1;
        continue;
      }

      const pushTokens = (tokens ?? []) as PushTokenRow[];
      if (!pushTokens.length) {
        await markOutbox(supabase, row.id, 'skipped', 'Sem token push ativo');
        skipped += 1;
        continue;
      }

      const messages = pushTokens.map((t) => ({
        to: t.expo_push_token,
        sound: 'default',
        title: row.title,
        body: row.body,
        data: {
          ...row.data,
          notificationType: row.notification_type,
          outboxId: row.id,
        },
        priority: 'high',
      }));

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const expoPayload = await expoRes.json();
      const tickets = (expoPayload?.data ?? []) as ExpoTicket[];
      const hasOk = tickets.some((t) => t.status === 'ok');
      const firstError = tickets.find((t) => t.status === 'error');

      if (!expoRes.ok || !hasOk) {
        const errMsg =
          firstError?.message ??
          firstError?.details?.error ??
          (typeof expoPayload === 'object' ? JSON.stringify(expoPayload) : 'Falha Expo Push');
        await markOutbox(supabase, row.id, 'failed', errMsg);
        failed += 1;
        continue;
      }

      await markOutbox(supabase, row.id, 'sent', null);
      sent += 1;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: rows.length,
        sent,
        failed,
        skipped,
        jobs: jobStats ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro inesperado';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function markOutbox(
  supabase: ReturnType<typeof createClient>,
  id: string,
  status: 'sent' | 'failed' | 'skipped',
  lastError: string | null,
) {
  await supabase
    .from('notification_outbox')
    .update({
      status,
      last_error: lastError,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', id);
}
