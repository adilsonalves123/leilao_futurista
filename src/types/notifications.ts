export type NotificationKind = 'outbid' | 'listing_bid' | 'payment_confirmed';

export type UserNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAtMs: number;
  unread: boolean;
  auctionId?: string;
  orderId?: string;
};

export type NotificationFeedEvent = {
  id: string;
  kind: NotificationKind;
  createdAtMs: number;
  auctionId?: string;
  auctionTitle?: string;
  orderId?: string;
  amountCents?: number;
  /** Usuário que deve ver a notificação de lance no anúncio */
  sellerId?: string;
  /** Usuário superado no lance */
  bidderId?: string;
  /** Vendedor que recebeu pagamento */
  vendorId?: string;
};
