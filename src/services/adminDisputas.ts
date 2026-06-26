import { DISPUTAS_ADMIN_MOCK, obterDisputaMock } from '@/src/admin/disputasMock';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  AdminDisputaDetalhe,
  AdminDisputaEvidence,
  AdminDisputaResumo,
  DisputeCategory,
  DisputeStatus,
} from '@/src/types/adminDisputas';

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
    throw new Error('Conta logada não é admin.');
  }
}

function mapResumo(row: {
  dispute_id: string;
  order_id: string;
  order_code: string;
  auction_title: string;
  auction_image: string;
  buyer_nome: string;
  vendor_nome: string;
  total_cents: number;
  category: string;
  reason: string;
  status: string;
  evidence_count: number;
  opened_at: string;
  updated_at: string;
}): AdminDisputaResumo {
  return {
    disputeId: row.dispute_id,
    orderId: row.order_id,
    orderCode: row.order_code,
    auctionTitle: row.auction_title,
    auctionImage: row.auction_image,
    buyerName: row.buyer_nome,
    vendorName: row.vendor_nome,
    totalCents: Number(row.total_cents),
    category: row.category as DisputeCategory,
    reason: row.reason,
    status: row.status as DisputeStatus,
    evidenceCount: Number(row.evidence_count),
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    fonte: 'supabase',
  };
}

function mapDetalhe(payload: Record<string, unknown>): AdminDisputaDetalhe {
  const dispute = payload.dispute as Record<string, unknown>;
  const order = payload.order as Record<string, unknown>;
  const auction = payload.auction as Record<string, unknown>;
  const buyer = payload.buyer as Record<string, unknown>;
  const vendor = payload.vendor as Record<string, unknown>;
  const evidenceRaw = (payload.evidence ?? []) as Array<Record<string, unknown>>;

  const evidence: AdminDisputaEvidence[] = evidenceRaw.map((e) => ({
    id: String(e.id),
    party: e.party as AdminDisputaEvidence['party'],
    kind: e.kind as AdminDisputaEvidence['kind'],
    mediaUrl: String(e.mediaUrl),
    caption: (e.caption as string | null) ?? null,
    createdAt: String(e.createdAt),
  }));

  return {
    disputeId: String(dispute.id),
    orderId: String(dispute.orderId),
    orderCode: String(order.code),
    orderStatus: String(order.status),
    totalCents: Number(order.totalCents),
    itemCents: Number(order.itemCents),
    shippingCents: Number(order.shippingCents),
    trackingCode: (order.trackingCode as string | null) ?? null,
    category: dispute.category as DisputeCategory,
    reason: String(dispute.reason),
    status: dispute.status as DisputeStatus,
    adminNotes: (dispute.adminNotes as string | null) ?? null,
    resolutionNotes: (dispute.resolutionNotes as string | null) ?? null,
    openedAt: String(dispute.openedAt),
    updatedAt: String(dispute.updatedAt),
    resolvedAt: (dispute.resolvedAt as string | null) ?? null,
    auctionTitle: String(auction.title),
    auctionImage: String(auction.imageUrl ?? ''),
    buyer: {
      id: String(buyer.id),
      nome: String(buyer.nome),
      email: String(buyer.email),
    },
    vendor: {
      id: String(vendor.id),
      nome: String(vendor.nome),
      email: String(vendor.email),
    },
    evidence,
    fonte: 'supabase',
  };
}

export async function listarDisputasAdmin(
  status?: DisputeStatus | null,
): Promise<AdminDisputaResumo[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    let rows = [...DISPUTAS_ADMIN_MOCK];
    if (status) rows = rows.filter((r) => r.status === status);
    return rows;
  }

  const supabase = getSupabase();
  if (!supabase) return DISPUTAS_ADMIN_MOCK;

  await assertAdminRpc();

  const { data, error } = await supabase.rpc('admin_listar_disputas', {
    p_status: status ?? null,
    p_limit: 100,
    p_offset: 0,
  });

  if (error) {
    if (error.message.includes('admin_listar_disputas')) {
      throw new Error('Execute supabase/migrations/060_order_disputes.sql no Supabase.');
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapResumo);
}

export async function obterDisputaAdmin(orderId: string): Promise<AdminDisputaDetalhe | null> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return obterDisputaMock(orderId);
  }

  const supabase = getSupabase();
  if (!supabase) return obterDisputaMock(orderId);

  await assertAdminRpc();

  const { data, error } = await supabase.rpc('admin_obter_disputa', { p_order_id: orderId });
  if (error) {
    if (error.message.includes('admin_obter_disputa')) {
      throw new Error('Execute supabase/migrations/060_order_disputes.sql no Supabase.');
    }
    throw new Error(error.message);
  }

  const row = data as { ok?: boolean; reason?: string } | null;
  if (!row?.ok) return null;

  return mapDetalhe(row as unknown as Record<string, unknown>);
}

export async function atualizarDisputaAdmin(input: {
  disputeId: string;
  status?: DisputeStatus;
  adminNotes?: string;
}): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  await assertAdminRpc();

  const { error } = await supabase.rpc('admin_atualizar_disputa', {
    p_dispute_id: input.disputeId,
    p_status: input.status ?? null,
    p_admin_notes: input.adminNotes ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function adicionarEvidenciaDisputaAdmin(input: {
  disputeId: string;
  party: 'comprador' | 'vendedor' | 'admin';
  kind: 'foto' | 'video' | 'documento' | 'nota_admin';
  mediaUrl: string;
  caption?: string;
}): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  await assertAdminRpc();

  const { error } = await supabase.rpc('admin_adicionar_evidencia_disputa', {
    p_dispute_id: input.disputeId,
    p_party: input.party,
    p_kind: input.kind,
    p_media_url: input.mediaUrl,
    p_caption: input.caption ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function resolverDisputaAdmin(input: {
  disputeId: string;
  favor: 'comprador' | 'vendedor';
  notes?: string;
  debitarGarantiaCents?: number;
}): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  await assertAdminRpc();

  const { error } = await supabase.rpc('admin_resolver_disputa', {
    p_dispute_id: input.disputeId,
    p_favor: input.favor,
    p_notes: input.notes ?? null,
    p_debitar_garantia_cents: input.debitarGarantiaCents ?? null,
  });

  if (error) throw new Error(error.message);
}
