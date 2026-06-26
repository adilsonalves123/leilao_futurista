export const COMMISSION_RATE = 0.1;
export const POSTING_DEADLINE_BUSINESS_HOURS = 72;
export const DISPUTE_WINDOW_HOURS = 48;
/** Prazo para o vencedor pagar após o leilão encerrar (cron confisca caução depois). */
export const WINNER_PAYMENT_DEADLINE_HOURS = 48;

export const PAYMENT_METHOD_LABELS = {
  CARTAO: 'Cartão de Crédito',
  PIX: 'Pix',
  CRIPTO: 'Criptomoedas',
} as const;

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  RETIDO_EM_CUSTODIA: 'Retido em custódia',
  EM_TRANSITO: 'Em trânsito',
  ENTREGUE: 'Entregue',
  AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
  LIQUIDADO: 'Liquidado',
  EM_DISPUTA: 'Em disputa',
  EXPIRADO: 'Expirado',
  ESTORNADO: 'Estornado',
};

export const MOCK_VENDOR_ID = 'mock-vendor-1';
export const MOCK_BUYER_ID = 'mock-buyer-1';
