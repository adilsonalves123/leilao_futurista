import type { FeaturedPlusCarouselItem, FeaturedPlusCarouselItemInput } from '@/src/types/featuredPlus';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=1200&auto=format&fit=crop';

export function formatFeaturedPlusPrice(cents: number | null | undefined): string {
  const value = typeof cents === 'number' && cents >= 0 ? cents / 100 : 0;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCountdownParts(endsAtMs: number, nowMs = Date.now()): {
  hours: string;
  minutes: string;
  seconds: string;
  expired: boolean;
} {
  const diff = Math.max(0, endsAtMs - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    expired: diff <= 0,
  };
}

export function normalizeFeaturedPlusItem(
  input: FeaturedPlusCarouselItemInput,
): FeaturedPlusCarouselItem {
  const endsAtMs =
    typeof input.endsAtMs === 'number' && input.endsAtMs > 0
      ? input.endsAtMs
      : input.endsAt
        ? new Date(input.endsAt).getTime()
        : Date.now() + 3600_000;

  const imageFromList = input.imageUrls?.find(Boolean);
  const imageUrl = input.imageUrl?.trim() || imageFromList?.trim() || FALLBACK_IMAGE;

  const subtitle =
    input.subtitle?.trim() ||
    (input.description?.trim() ? input.description.trim().split('\n')[0] : null) ||
    null;

  return {
    id: input.id,
    title: input.title?.trim() || 'Leilão em destaque',
    subtitle,
    imageUrl,
    currentPriceCents:
      typeof input.currentPriceCents === 'number' && input.currentPriceCents >= 0
        ? input.currentPriceCents
        : 0,
    endsAtMs,
    watchersCount: Math.max(0, input.watchersCount ?? 0),
    participantsCount: Math.max(0, input.participantsCount ?? 0),
    seller: input.seller,
  };
}

export function formatEngagementLabel(watchers: number, participants: number): {
  watching: string;
  participants: string;
} {
  return {
    watching: `${watchers} assistindo`,
    participants: `${participants} participantes`,
  };
}
