/** Leilões mockados — Home Dashboard */

import type { AuctionSellerSnippet } from '@/src/services/auctionSellerSnippet';

export type AuctionCategoryId =
  | 'todos'
  | 'eletronicos'
  | 'veiculos'
  | 'arte_digital'
  | 'colecionaveis'
  | 'imoveis';

export type MockAuction = {
  id: string;
  title: string;
  category: Exclude<AuctionCategoryId, 'todos'>;
  priceCents: number;
  imageUrl: string;
  featured: boolean;
  /** Equivalente ao is_featured_plus no Supabase (Destaque Plus pago) */
  isFeaturedPlus?: boolean;
  /** Timestamp (ms) em que o leilão encerra */
  endsAt: number;
  /** Vendedor exibido nos cards (fase 3) */
  seller?: AuctionSellerSnippet;
};

export const MOCK_CATEGORIES: { id: AuctionCategoryId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'eletronicos', label: 'Eletrônicos' },
  { id: 'veiculos', label: 'Veículos' },
  { id: 'arte_digital', label: 'Arte Digital' },
  { id: 'colecionaveis', label: 'Colecionáveis' },
  { id: 'imoveis', label: 'Imóveis' },
];

const now = Date.now();
const min = 60 * 1000;
const hour = 60 * min;

function endsIn(msFromNow: number) {
  return now + msFromNow;
}

export const MOCK_AUCTION_LIST: MockAuction[] = [
  {
    id: '1',
    title: 'MacBook Pro M3 Max — Lote Único',
    category: 'eletronicos',
    priceCents: 1899000,
    imageUrl:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
    featured: true,
    isFeaturedPlus: true,
    endsAt: endsIn(2 * hour + 14 * min + 33 * 1000),
    seller: { sellerId: 'v-tech', sellerName: 'Tech Store BR', sellerBadge: 'empresa_verificada' },
  },
  {
    id: '2',
    title: 'Tesla Model S Plaid 2024',
    category: 'veiculos',
    priceCents: 42500000,
    imageUrl:
      'https://images.unsplash.com/photo-1560958089-b871ba4276f7?q=80&w=1200&auto=format&fit=crop',
    featured: true,
    isFeaturedPlus: true,
    endsAt: endsIn(5 * hour + 42 * min),
    seller: { sellerId: 'v-garage', sellerName: 'Garage Premium', sellerBadge: 'empresa_verificada' },
  },
  {
    id: '3',
    title: 'NFT Genesis — Série Levou',
    category: 'arte_digital',
    priceCents: 125000,
    imageUrl:
      'https://images.unsplash.com/photo-1620641788421-7aacb878bd58?q=80&w=1200&auto=format&fit=crop',
    featured: true,
    endsAt: endsIn(28 * min + 12 * 1000),
    seller: { sellerId: 'levou-oficial', sellerName: 'Levou Oficial', sellerBadge: 'loja_oficial' },
  },
  {
    id: '4',
    title: 'iPhone 16 Pro Max 1TB',
    category: 'eletronicos',
    priceCents: 749900,
    imageUrl:
      'https://images.unsplash.com/photo-1695048133142-9489986533c8?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(3 * hour + 8 * min),
    seller: { sellerId: 'v-tech', sellerName: 'Tech Store BR', sellerBadge: 'empresa_verificada' },
  },
  {
    id: '5',
    title: 'Porsche 911 Carrera — Placa Zero',
    category: 'veiculos',
    priceCents: 89000000,
    imageUrl:
      'https://images.unsplash.com/photo-1503376780353-7ad717bf64cc?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(1 * hour + 55 * min),
  },
  {
    id: '6',
    title: 'Relógio Vintage Omega Seamaster',
    category: 'colecionaveis',
    priceCents: 3200000,
    imageUrl:
      'https://images.unsplash.com/photo-1524593232313-ab908d757311?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(45 * min),
  },
  {
    id: '7',
    title: 'Cobertura Duplex — Vista Mar',
    category: 'imoveis',
    priceCents: 185000000,
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(8 * hour),
  },
  {
    id: '8',
    title: 'Kit VR Apple Vision Pro',
    category: 'eletronicos',
    priceCents: 2899000,
    imageUrl:
      'https://images.unsplash.com/photo-1592478411213-615de54f0a16?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(22 * min),
  },
  {
    id: '9',
    title: 'Escultura Digital Lumina #07',
    category: 'arte_digital',
    priceCents: 89000,
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd657f6?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(1 * hour + 12 * min),
  },
  {
    id: '10',
    title: 'Harley-Davidson LiveWire 2025',
    category: 'veiculos',
    priceCents: 11200000,
    imageUrl:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28ea?q=80&w=1200&auto=format&fit=crop',
    featured: false,
    endsAt: endsIn(4 * hour + 30 * min),
  },
];

export function getFeaturedAuctions(): MockAuction[] {
  return MOCK_AUCTION_LIST.filter((a) => a.isFeaturedPlus ?? a.featured);
}

export function getAuctionsByCategory(category: AuctionCategoryId): MockAuction[] {
  const base =
    category === 'todos'
      ? MOCK_AUCTION_LIST
      : MOCK_AUCTION_LIST.filter((a) => a.category === category);
  return base.filter((a) => !(a.isFeaturedPlus ?? a.featured));
}

export type LeiloesAuctionBuckets = {
  featuredPlus: MockAuction[];
  featured: MockAuction[];
  organic: MockAuction[];
  all: MockAuction[];
};

export function partitionLeiloesAuctions(
  category: AuctionCategoryId,
  searchQuery: string,
): LeiloesAuctionBuckets {
  const base =
    category === 'todos'
      ? MOCK_AUCTION_LIST
      : MOCK_AUCTION_LIST.filter((a) => a.category === category);

  const q = searchQuery.trim().toLowerCase();
  const all = q ? base.filter((a) => a.title.toLowerCase().includes(q)) : base;

  const featuredPlus = all.filter((a) => a.isFeaturedPlus);
  const featured = all.filter((a) => a.featured && !a.isFeaturedPlus);
  const organic = all.filter((a) => !a.featured && !a.isFeaturedPlus);

  return { featuredPlus, featured, organic, all };
}

export function getAuctionById(id: string): MockAuction | undefined {
  return MOCK_AUCTION_LIST.find((a) => a.id === id);
}
