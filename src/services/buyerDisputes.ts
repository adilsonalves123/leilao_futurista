import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type { DisputeCategory, DisputeEvidenceKind, DisputeStatus } from '@/src/types/adminDisputas';
import { enviarEvidenciaDisputa } from '@/src/services/disputeEvidenceUpload';

export type BuyerDisputeEvidence = {
  id: string;
  party: string;
  kind: DisputeEvidenceKind;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
};

export type BuyerDispute = {
  disputeId: string;
  orderId: string;
  category: DisputeCategory;
  reason: string;
  status: DisputeStatus;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  evidence: BuyerDisputeEvidence[];
};

export type AbrirDisputaInput = {
  orderId: string;
  category: DisputeCategory;
  reason: string;
  mediaUris: string[];
};

export async function obterDisputaComprador(orderId: string): Promise<BuyerDispute | null> {
  if (isMockMode() || !isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('comprador_obter_disputa', { p_order_id: orderId });
  if (error || !data) return null;

  const payload = data as Record<string, unknown>;
  if (payload.ok !== true) return null;

  const dispute = payload.dispute as Record<string, unknown>;
  const evidence = (payload.evidence as Record<string, unknown>[]) ?? [];

  return {
    disputeId: String(dispute.id),
    orderId: String(dispute.orderId),
    category: String(dispute.category) as DisputeCategory,
    reason: String(dispute.reason ?? ''),
    status: String(dispute.status) as DisputeStatus,
    openedAt: String(dispute.openedAt),
    updatedAt: String(dispute.updatedAt),
    resolvedAt: dispute.resolvedAt ? String(dispute.resolvedAt) : null,
    evidence: evidence.map((e) => ({
      id: String(e.id),
      party: String(e.party),
      kind: String(e.kind) as DisputeEvidenceKind,
      mediaUrl: String(e.mediaUrl),
      caption: e.caption ? String(e.caption) : null,
      createdAt: String(e.createdAt),
    })),
  };
}

async function registrarEvidencia(
  disputeId: string,
  kind: DisputeEvidenceKind,
  mediaUrl: string,
  caption?: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase.rpc('comprador_registrar_evidencia_disputa', {
    p_dispute_id: disputeId,
    p_kind: kind,
    p_media_url: mediaUrl,
    p_caption: caption ?? null,
  });

  if (error) {
    throw new Error(
      error.message.includes('comprador_registrar_evidencia_disputa')
        ? 'Execute a migration 061_admin_faturamento_buyer_disputes.sql no Supabase.'
        : error.message,
    );
  }
}

export async function abrirDisputaComprador(input: AbrirDisputaInput): Promise<{
  disputeId: string;
  alreadyExists: boolean;
}> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return { disputeId: `mock-dispute-${Date.now()}`, alreadyExists: false };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('abrir_disputa_comprador', {
    p_order_id: input.orderId,
    p_category: input.category,
    p_reason: input.reason.trim(),
  });

  if (error) {
    throw new Error(
      error.message.includes('abrir_disputa_comprador')
        ? 'Execute a migration 061_admin_faturamento_buyer_disputes.sql no Supabase.'
        : error.message,
    );
  }

  const payload = data as Record<string, unknown>;
  if (payload.ok !== true) {
    const msg = String(payload.message ?? payload.reason ?? 'Não foi possível abrir a disputa.');
    throw new Error(msg);
  }

  const disputeId = String(payload.disputeId);
  const alreadyExists = Boolean(payload.alreadyExists);

  for (let i = 0; i < input.mediaUris.length; i++) {
    const uri = input.mediaUris[i];
    const { url, kind } = await enviarEvidenciaDisputa(disputeId, 'comprador', uri, i);
    await registrarEvidencia(disputeId, kind, url);
  }

  return { disputeId, alreadyExists };
}
