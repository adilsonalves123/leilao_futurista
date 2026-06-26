import type { Ionicons } from '@expo/vector-icons';

export type BuyerJarvisAlert = {
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  action_url?: string;
};

export type BuyerJarvisContext = {
  ok?: boolean;
  generated_at: string;
  route: string;
  user: {
    display_name: string | null;
    kyc_status: string;
  };
  wallet: {
    available_cents: number;
    hold_cents: number;
    pix_pending_count: number;
  };
  bids: {
    winning_live_count: number;
  };
  kyc?: {
    status: string;
    pode_dar_lance: boolean;
  };
  pedidos?: {
    pending_payment_count: number;
    in_transit_count: number;
  };
  leiloes_oportunidades?: {
    live_com_mercado_estimado: number;
    abaixo_mercado_compensa: number;
    abaixo_mercado_atencao: number;
    melhores: Array<{
      id?: string;
      title?: string;
      current_price_cents?: number;
      market_cents?: number;
      discount_pct?: number;
      verdict?: string;
      category?: string | null;
      conservation_state?: string | null;
    }>;
  };
  alertas: BuyerJarvisAlert[];
};

export type BuyerJarvisMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BuyerJarvisResponse = {
  ok: boolean;
  sessionId?: string;
  reply?: string;
  context?: BuyerJarvisContext;
  model?: string;
  provider?: 'gemini' | 'openai' | 'none';
  aiOffline?: boolean;
  aiOfflineReason?: string;
  error?: string;
};

export const BUYER_JARVIS_SUGGESTIONS = [
  'Como funciona o leilão?',
  'Tem lote abaixo do mercado agora?',
  'Como depositar e sacar via Pix?',
  'Por que meu lance está bloqueado?',
] as const;

export const BUYER_JARVIS_SUGGESTION_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  'Como funciona o leilão?': 'help-circle-outline',
  'Tem lote abaixo do mercado agora?': 'trending-down-outline',
  'Como depositar e sacar via Pix?': 'flash-outline',
  'Por que meu lance está bloqueado?': 'id-card-outline',
};
