import type { MarketDealVerdict } from '@/src/lib/marketDealMath';

export type AuctionAiConsultaInput = {
  auctionId: string;
  sessionId?: string | null;
  message?: string;
  bidCents: number;
  marketCents: number | null;
  title: string;
  description?: string;
  conservationState?: string | null;
  category?: string | null;
};

export type AuctionAiAdvisorResponse = {
  ok: boolean;
  sessionId?: string;
  verdict?: MarketDealVerdict;
  discountPct?: number | null;
  marketCents?: number | null;
  bidCents?: number;
  reply?: string;
  fromCache?: boolean;
  model?: string;
  provider?: 'gemini' | 'openai' | 'none';
  aiOffline?: boolean;
  aiOfflineReason?: string;
  error?: string;
};

export type AuctionAiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  body: string;
  verdict?: MarketDealVerdict | null;
  discountPct?: number | null;
  marketCents?: number | null;
  bidCents?: number | null;
  createdAt: string;
};

export const AUCTION_AI_SUGGESTIONS = [
  'Compensa dar lance agora?',
  'Qual teto máximo você sugere?',
  'Quanto de caução preciso?',
  'Como comparar com o mercado?',
] as const;
