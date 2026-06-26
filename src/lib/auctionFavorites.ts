import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@levou/auction_favorites_v1';

export type FavoriteAuction = {
  id: string;
  title: string;
  price: string;
  timer: string;
  img: string;
};

async function readAll(): Promise<FavoriteAuction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteAuction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: FavoriteAuction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listFavoriteAuctions(): Promise<FavoriteAuction[]> {
  return readAll();
}

export async function isFavoriteAuction(id: string): Promise<boolean> {
  const items = await readAll();
  return items.some((item) => item.id === id);
}

export async function toggleFavoriteAuction(item: FavoriteAuction): Promise<boolean> {
  const items = await readAll();
  const exists = items.some((f) => f.id === item.id);
  if (exists) {
    await writeAll(items.filter((f) => f.id !== item.id));
    return false;
  }
  await writeAll([item, ...items.filter((f) => f.id !== item.id)]);
  return true;
}

export async function removeFavoriteAuction(id: string): Promise<void> {
  const items = await readAll();
  await writeAll(items.filter((f) => f.id !== id));
}

export async function favoriteIdsSet(): Promise<Set<string>> {
  const items = await readAll();
  return new Set(items.map((i) => i.id));
}
