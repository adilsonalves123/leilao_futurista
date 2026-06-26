export type Review = {
  id: string;
  orderId: string;
  auctionId: string;
  buyerId: string;
  vendorId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  buyerName?: string;
  auctionTitle?: string;
};

export type CreateReviewInput = {
  orderId: string;
  auctionId: string;
  vendorId: string;
  buyerId: string;
  rating: number;
  comment: string;
  imageUris: string[];
};

export const MAX_REVIEW_PHOTOS = 4;
