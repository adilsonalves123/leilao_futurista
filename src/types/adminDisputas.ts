export type DisputeStatus =
  | 'aberta'
  | 'em_analise'
  | 'aguardando_resposta'
  | 'resolvida_comprador'
  | 'resolvida_vendedor'
  | 'cancelada';

export type DisputeCategory =
  | 'produto_diferente'
  | 'produto_danificado'
  | 'nao_recebido'
  | 'incompleto'
  | 'outro';

export type DisputeParty = 'comprador' | 'vendedor' | 'admin';

export type DisputeEvidenceKind = 'foto' | 'video' | 'documento' | 'nota_admin';

export type AdminDisputaResumo = {
  disputeId: string;
  orderId: string;
  orderCode: string;
  auctionTitle: string;
  auctionImage: string;
  buyerName: string;
  vendorName: string;
  totalCents: number;
  category: DisputeCategory;
  reason: string;
  status: DisputeStatus;
  evidenceCount: number;
  openedAt: string;
  updatedAt: string;
  fonte: 'supabase' | 'mock';
};

export type AdminDisputaEvidence = {
  id: string;
  party: DisputeParty;
  kind: DisputeEvidenceKind;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
};

export type AdminDisputaDetalhe = {
  disputeId: string;
  orderId: string;
  orderCode: string;
  orderStatus: string;
  totalCents: number;
  itemCents: number;
  shippingCents: number;
  trackingCode: string | null;
  category: DisputeCategory;
  reason: string;
  status: DisputeStatus;
  adminNotes: string | null;
  resolutionNotes: string | null;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  auctionTitle: string;
  auctionImage: string;
  buyer: { id: string; nome: string; email: string };
  vendor: { id: string; nome: string; email: string };
  evidence: AdminDisputaEvidence[];
  fonte: 'supabase' | 'mock';
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  aguardando_resposta: 'Aguardando partes',
  resolvida_comprador: 'Favor comprador',
  resolvida_vendedor: 'Favor vendedor',
  cancelada: 'Cancelada',
};

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  produto_diferente: 'Produto diferente',
  produto_danificado: 'Produto danificado',
  nao_recebido: 'Não recebido',
  incompleto: 'Incompleto / faltando peças',
  outro: 'Outro',
};

export const DISPUTE_PARTY_LABELS: Record<DisputeParty, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  admin: 'Mediador Levou',
};
