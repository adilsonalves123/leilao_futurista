export type AdminPushOutboxStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type AdminPushResumo = {
  days: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  activeTokens: number;
  marketingOptIn: number;
  inboxUnread: number;
  fonte: 'supabase' | 'mock';
};

export type AdminPushOutboxRow = {
  id: string;
  userId: string;
  userEmail: string;
  notificationType: string;
  title: string;
  body: string;
  status: AdminPushOutboxStatus;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type AdminProcessarFilaResult = {
  ok: boolean;
  processed?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
  erro?: string;
};

export const ADMIN_PUSH_TYPE_LABELS: Record<string, string> = {
  bid_outbid: 'Lance superado',
  auction_won: 'Vitória no leilão',
  auction_lost: 'Leilão perdido',
  auction_ending_soon: 'Leilão encerrando',
  listing_approved: 'Anúncio aprovado',
  listing_rejected: 'Anúncio rejeitado',
  payment_confirmed: 'Pagamento confirmado',
  shipment_posted: 'Envio postado',
  delivery_confirm: 'Confirmar entrega',
  order_delivered: 'Pedido entregue',
  order_dispute: 'Disputa',
  payment_pending: 'Pagamento pendente',
  admin_chat_message: 'Chat suporte',
  vendor_chat_message: 'Chat vendedor',
  kyc_submitted: 'KYC enviado',
  kyc_approved: 'KYC aprovado',
  kyc_rejected: 'KYC rejeitado',
  deal_alert: 'Oportunidade (achado)',
};

export const ADMIN_PUSH_STATUS_LABELS: Record<AdminPushOutboxStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  failed: 'Falhou',
  skipped: 'Ignorada',
};
