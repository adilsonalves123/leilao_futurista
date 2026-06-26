export type LotChatNivel = 'ia' | 'admin' | 'vendedor';

export type LotChatSenderRole = 'comprador' | 'ia' | 'admin' | 'vendedor';

export type LotChatMessage = {
  id: string;
  senderRole: LotChatSenderRole;
  senderUserId: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

export type LotChatStatus = {
  nivel: LotChatNivel;
  vendedorVisivel: boolean;
  orderId: string;
};

export const LOT_CHAT_NIVEL_LABELS: Record<LotChatNivel, string> = {
  ia: 'Assistente IA',
  admin: 'Atendimento da plataforma',
  vendedor: 'Vendedor incluído',
};
