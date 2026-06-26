import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAuctionId } from '@/src/lib/auctionIds';

const STORAGE_KEY = '@aetherion/recently_viewed_auctions';
const MAX_ITEMS = 30;

export type RecentlyViewedAuction = {
  auctionId: string;
  title: string;
  imageUrl: string;
  viewedAtMs: number;
};

/** Lista fixa quando o usuário ainda não abriu nenhum leilão. */
export const RECENTLY_VIEWED_FALLBACK: RecentlyViewedAuction[] = [
  {
    auctionId: '3',
    title: 'PlayStation 5 Edição Digital',
    imageUrl:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=200',
    viewedAtMs: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    auctionId: '8',
    title: 'Smart-Glass Holográfico',
    imageUrl:
      'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=200',
    viewedAtMs: Date.now() - 26 * 60 * 60 * 1000,
  },
  {
    auctionId: '2',
    title: 'CyberCruiser Elétrico v4',
    imageUrl:
      'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=200',
    viewedAtMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

export function formatarVistoEm(viewedAtMs: number): string {
  const diffMs = Date.now() - viewedAtMs;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'Há 1 hora' : `Há ${h} horas`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ontem';
  if (d < 7) return `Há ${d} dias`;
  return new Date(viewedAtMs).toLocaleDateString('pt-BR');
}

export async function registrarLeilaoVisto(input: {
  auctionId: string;
  title: string;
  imageUrl: string;
}): Promise<void> {
  const auctionId = normalizeAuctionId(input.auctionId);
  if (!auctionId) return;

  const entry: RecentlyViewedAuction = {
    auctionId,
    title: input.title.trim() || 'Leilão',
    imageUrl: input.imageUrl,
    viewedAtMs: Date.now(),
  };

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let lista: RecentlyViewedAuction[] = [];
    if (raw) {
      try {
        lista = JSON.parse(raw) as RecentlyViewedAuction[];
      } catch {
        lista = [];
      }
    }

    const semDuplicata = lista.filter((i) => i.auctionId !== auctionId);
    const next = [entry, ...semDuplicata].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

export async function listarLeiloesVistosRecentemente(): Promise<RecentlyViewedAuction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [...RECENTLY_VIEWED_FALLBACK];
    const lista = JSON.parse(raw) as RecentlyViewedAuction[];
    if (!Array.isArray(lista) || lista.length === 0) {
      return [...RECENTLY_VIEWED_FALLBACK];
    }
    return lista.filter((i) => i?.auctionId);
  } catch {
    return [...RECENTLY_VIEWED_FALLBACK];
  }
}
