export type NotificationCategory = 'auction' | 'order' | 'chat' | 'account' | 'marketing';

export type NotificationPreference = {
  category: NotificationCategory;
  enabled: boolean;
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  { title: string; description: string; locked?: boolean }
> = {
  auction: {
    title: 'Leilões',
    description: 'Lance superado, vitória, leilão encerrando e anúncios aprovados.',
  },
  order: {
    title: 'Pedido e envio',
    description: 'Pagamento, postagem, entrega e disputas.',
    locked: true,
  },
  chat: {
    title: 'Chat do lote',
    description: 'Mensagens do suporte e do vendedor.',
  },
  account: {
    title: 'Conta e KYC',
    description: 'Aprovação ou pendências do seu cadastro.',
    locked: true,
  },
  marketing: {
    title: 'Oportunidades',
    description: 'Achados com preço abaixo do mercado (opt-in).',
  },
};

export type PushNotificationData = {
  url?: string;
  auctionId?: string;
  orderId?: string;
  notificationType?: string;
  outboxId?: string;
};

export type PushSyncMotivo =
  | 'registrado'
  | 'sem_sessao'
  | 'sem_permissao'
  | 'sem_config'
  | 'nao_dispositivo'
  | 'falha_registro'
  | 'erro';

export type PushSyncStatus = {
  atualizadoEm: string;
  ok: boolean;
  motivo: PushSyncMotivo;
  mensagem: string;
  tokenResumo: string | null;
};

export type PushSyncResult = PushSyncStatus & {
  token: string | null;
};
