import type {
  AdminProcessarFilaResult,
  AdminPushOutboxRow,
  AdminPushOutboxStatus,
  AdminPushResumo,
} from '@/src/types/adminPush';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const MOCK_RESUMO: AdminPushResumo = {
  days: 7,
  pending: 2,
  sent: 48,
  failed: 1,
  skipped: 3,
  activeTokens: 12,
  marketingOptIn: 7,
  inboxUnread: 15,
  fonte: 'mock',
};

const MOCK_FILA: AdminPushOutboxRow[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    userId: '22222222-2222-2222-2222-222222222201',
    userEmail: 'maria@exemplo.com',
    notificationType: 'deal_alert',
    title: 'Achado Levou',
    body: 'MacBook Pro M2 com lance inicial 35% abaixo do valor de mercado.',
    status: 'sent',
    lastError: null,
    sentAt: new Date(Date.now() - 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 3700_000).toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    userId: '22222222-2222-2222-2222-222222222202',
    userEmail: 'joao@exemplo.com',
    notificationType: 'bid_outbid',
    title: 'Lance superado',
    body: 'Alguém ofereceu mais em Monitor Gamer. Lance de novo antes do fim.',
    status: 'pending',
    lastError: null,
    sentAt: null,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    userId: '22222222-2222-2222-2222-222222222203',
    userEmail: 'ana@exemplo.com',
    notificationType: 'auction_ending_soon',
    title: 'Leilão termina em breve',
    body: 'Faltam poucos minutos para encerrar Apple Watch Ultra.',
    status: 'failed',
    lastError: 'Sem token push ativo',
    sentAt: null,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

async function assertAdminRpc(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: ehAdmin, error } = await supabase.rpc('auth_is_admin');
  if (error) {
    throw new Error(
      `Função auth_is_admin ausente. Execute as migrations admin no Supabase. Detalhe: ${error.message}`,
    );
  }
  if (ehAdmin !== true) {
    throw new Error(
      'Conta logada não é admin. Atualize role = admin no Supabase e entre de novo em /admin/login.',
    );
  }
}

function mapResumoRow(data: Record<string, unknown>): AdminPushResumo {
  return {
    days: Number(data.days ?? 7),
    pending: Number(data.pending ?? 0),
    sent: Number(data.sent ?? 0),
    failed: Number(data.failed ?? 0),
    skipped: Number(data.skipped ?? 0),
    activeTokens: Number(data.active_tokens ?? 0),
    marketingOptIn: Number(data.marketing_opt_in ?? 0),
    inboxUnread: Number(data.inbox_unread ?? 0),
    fonte: 'supabase',
  };
}

function mapOutboxRow(row: {
  id: string;
  user_id: string;
  user_email: string;
  notification_type: string;
  title: string;
  body: string;
  status: string;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}): AdminPushOutboxRow {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body,
    status: row.status as AdminPushOutboxStatus,
    lastError: row.last_error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

export async function obterResumoPushAdmin(days = 7): Promise<AdminPushResumo> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return { ...MOCK_RESUMO, days };
  }

  const supabase = getSupabase();
  if (!supabase) return { ...MOCK_RESUMO, days };

  await assertAdminRpc();

  const { data, error } = await supabase.rpc('admin_resumo_push', { p_days: days });
  if (error) {
    if (error.message.includes('admin_resumo_push')) {
      throw new Error(
        'Execute supabase/migrations/053_admin_push_dashboard.sql no SQL Editor do Supabase.',
      );
    }
    throw new Error(error.message);
  }

  return mapResumoRow((data ?? {}) as Record<string, unknown>);
}

export async function listarFilaPushAdmin(opts?: {
  status?: AdminPushOutboxStatus | null;
  type?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminPushOutboxRow[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    let rows = [...MOCK_FILA];
    if (opts?.status) {
      rows = rows.filter((r) => r.status === opts.status);
    }
    if (opts?.type) {
      rows = rows.filter((r) => r.notificationType === opts.type);
    }
    return rows;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_FILA;

  await assertAdminRpc();

  const { data, error } = await supabase.rpc('admin_listar_notification_outbox', {
    p_status: opts?.status ?? null,
    p_type: opts?.type ?? null,
    p_limit: opts?.limit ?? 50,
    p_offset: opts?.offset ?? 0,
  });

  if (error) {
    if (error.message.includes('admin_listar_notification_outbox')) {
      throw new Error(
        'Execute supabase/migrations/053_admin_push_dashboard.sql no SQL Editor do Supabase.',
      );
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapOutboxRow);
}

export async function reenviarPushAdmin(outboxId: string): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase indisponível.');

  await assertAdminRpc();

  const { error } = await supabase.rpc('admin_requeue_notification_outbox', {
    p_outbox_id: outboxId,
  });

  if (error) {
    if (error.message.includes('admin_requeue_notification_outbox')) {
      throw new Error(
        'Execute supabase/migrations/053_admin_push_dashboard.sql no SQL Editor do Supabase.',
      );
    }
    throw new Error(error.message);
  }
}

export async function processarFilaPushAdmin(): Promise<AdminProcessarFilaResult> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return { ok: true, processed: 2, sent: 1, failed: 0, skipped: 1 };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, erro: 'Cliente Supabase indisponível.' };
  }

  await assertAdminRpc();

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    processed?: number;
    sent?: number;
    failed?: number;
    skipped?: number;
    error?: string;
  }>('send-push');

  if (error) {
    return {
      ok: false,
      erro:
        error.message.includes('send-push') || error.message.includes('FunctionsRelayError')
          ? 'Edge Function send-push não encontrada. Faça deploy e configure o cron.'
          : error.message,
    };
  }

  if (!data?.ok) {
    return { ok: false, erro: data?.error ?? 'Falha ao processar fila.' };
  }

  return {
    ok: true,
    processed: data.processed,
    sent: data.sent,
    failed: data.failed,
    skipped: data.skipped,
  };
}
