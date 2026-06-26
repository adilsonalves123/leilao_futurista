export type SupportConversationStatus = 'bot_ativo' | 'atendimento_humano' | 'encerrado';

export type SupportMessageRole = 'user' | 'bot' | 'admin';

export type SupportMessage = {
  id: string;
  role: SupportMessageRole;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

export type AdminConversaSuporte = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  status: SupportConversationStatus;
  ultimaMensagemPreview: string | null;
  ultimaAtividadeEm: string;
  assumidoPor: string | null;
  assumidoEm: string | null;
};

export const SUPPORT_STATUS_LABELS: Record<SupportConversationStatus, string> = {
  bot_ativo: 'Robô ativo',
  atendimento_humano: 'Atendimento humano',
  encerrado: 'Encerrado',
};
