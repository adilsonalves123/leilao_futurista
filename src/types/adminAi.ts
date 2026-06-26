export type AdminAiAlert = {
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
};

export type AdminAiResumo = {
  hours: number;
  kyc_pendente: number;
  kyc_em_analise: number;
  disputas_abertas: number;
  pedidos_pendentes_pagamento: number;
  pix_recargas_pendentes: number;
  pix_recargas_pendentes_mais_24h: number;
  push_falhas_periodo: number;
  erros_nao_resolvidos: number;
  erros_criticos_periodo: number;
  erros_pix_periodo: number;
  suporte_atendimento_humano: number;
};

export type AdminAiErrorLog = {
  id: string;
  source: string;
  severity: string;
  category: string;
  code: string | null;
  message: string;
  created_at: string;
};

export type AdminAiContextBundle = {
  generated_at: string;
  hours: number;
  resumo: AdminAiResumo;
  erros_recentes: AdminAiErrorLog[];
  alertas: AdminAiAlert[];
};

export type AdminAiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminAiAssistantResponse = {
  ok: boolean;
  sessionId?: string;
  context?: AdminAiContextBundle;
  reply?: string | null;
  model?: string | null;
  fromHistory?: boolean;
  error?: string;
};

export type AdminSystemErrorRow = {
  id: string;
  source: string;
  severity: string;
  category: string;
  code: string | null;
  message: string;
  userEmail: string | null;
  resolved: boolean;
  createdAt: string;
};

export const ADMIN_AI_SUGGESTIONS = [
  'Resumo operacional das últimas 24h',
  'Quantos erros Pix tivemos?',
  'O que precisa de atenção agora?',
  'Situação das disputas abertas',
] as const;
