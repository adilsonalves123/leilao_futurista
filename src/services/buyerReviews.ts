import AsyncStorage from '@react-native-async-storage/async-storage';

const BUYER_REVIEWS_KEY = '@aetherion/buyer_reviews_vendor';

export type BuyerReviewByVendor = {
  id: string;
  orderId: string;
  auctionId: string;
  buyerId: string;
  vendorId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

async function lerTodas(): Promise<BuyerReviewByVendor[]> {
  try {
    const raw = await AsyncStorage.getItem(BUYER_REVIEWS_KEY);
    return raw ? (JSON.parse(raw) as BuyerReviewByVendor[]) : [];
  } catch {
    return [];
  }
}

async function salvarTodas(reviews: BuyerReviewByVendor[]): Promise<void> {
  await AsyncStorage.setItem(BUYER_REVIEWS_KEY, JSON.stringify(reviews));
}

export async function jaAvaliouComprador(orderId: string): Promise<boolean> {
  const todas = await lerTodas();
  return todas.some((r) => r.orderId === orderId);
}

export async function salvarAvaliacaoComprador(input: {
  orderId: string;
  auctionId: string;
  buyerId: string;
  vendorId: string;
  rating: number;
  comment: string;
}): Promise<BuyerReviewByVendor> {
  const todas = await lerTodas();
  if (todas.some((r) => r.orderId === input.orderId)) {
    throw new Error('Você já avaliou este comprador.');
  }

  const review: BuyerReviewByVendor = {
    id: `brev-${Date.now()}`,
    ...input,
    createdAt: new Date().toISOString(),
  };

  await salvarTodas([review, ...todas]);
  return review;
}
