import { useCallback, useEffect, useState } from 'react';

import { fetchFeaturedPlusCarouselItems } from '@/src/services/featuredPlusCarousel';
import type { FeaturedPlusCarouselItem } from '@/src/types/featuredPlus';
import { CAROUSEL_AUTOPLAY_MS } from '@/src/store/banners';

export function useFeaturedPlusCarousel() {
  const [items, setItems] = useState<FeaturedPlusCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await fetchFeaturedPlusCarouselItems();
      setItems(lista);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return {
    items,
    loading,
    recarregar,
    autoplayIntervalMs: CAROUSEL_AUTOPLAY_MS,
  };
}
