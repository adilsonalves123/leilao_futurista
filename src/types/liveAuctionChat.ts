export type LiveAuctionMessage = {
  id: string;
  auctionId: string;
  userId: string | null;
  username: string;
  message: string;
  isSystemMessage: boolean;
  createdAt: string;
};

export type LiveChatBroadcastPayload = LiveAuctionMessage;
