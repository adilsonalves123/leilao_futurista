import { FeaturedCarousel } from '@/components/home/FeaturedCarousel';
import { HomeBannerCarousel } from '@/src/components/HomeBannerCarousel';
import { useFeaturedPlusCarousel } from '@/src/hooks/useFeaturedPlusCarousel';

/**
 * Hero da Home: Destaque Plus (leilões) com fallback para banners admin legados.
 */
export function HomeFeaturedHero() {
  const { items, loading, autoplayIntervalMs } = useFeaturedPlusCarousel();
  const temDestaquePlus = items.length > 0;

  if (temDestaquePlus) {
    return (
      <FeaturedCarousel
        items={items}
        loading={loading}
        autoplayIntervalMs={autoplayIntervalMs}
      />
    );
  }

  if (loading) {
    return null;
  }

  return <HomeBannerCarousel />;
}
