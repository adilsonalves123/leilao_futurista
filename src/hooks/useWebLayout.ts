import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { WEB_LAYOUT } from '@/src/theme/webLayout';

function readViewportWidth(): number {
  if (typeof window !== 'undefined') return window.innerWidth;
  return WEB_LAYOUT.wideBreakpoint;
}

function readViewportHeight(): number {
  if (typeof window !== 'undefined') return window.innerHeight;
  return 800;
}

export function useWebLayout() {
  const { width: rnWidth, height: rnHeight } = useWindowDimensions();
  const [viewport, setViewport] = useState(() => ({
    width: Platform.OS === 'web' ? readViewportWidth() : rnWidth,
    height: Platform.OS === 'web' ? readViewportHeight() : rnHeight,
  }));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const sync = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setViewport({ width: rnWidth, height: rnHeight });
  }, [rnWidth, rnHeight]);

  const width = viewport.width;
  const height = viewport.height;
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= WEB_LAYOUT.wideBreakpoint;
  const isNarrowWeb = isWeb && !isWideWeb;

  const contentWidth = isWeb
    ? Math.min(width, WEB_LAYOUT.maxContentWidth)
    : width;

  const homeHeroWidth = isWideWeb
    ? Math.min(contentWidth - WEB_LAYOUT.sidebarWidth - 56, 920)
    : Math.max(width - 16, 280);

  const homeHeroHeight = isWideWeb
    ? Math.min(homeHeroWidth / 2.75, WEB_LAYOUT.homeHeroMaxHeight)
    : homeHeroWidth / 2;

  const auctionCardWidth = isWideWeb
    ? Math.min(240, (contentWidth - 80) / 4)
    : Math.min(160, (width - 48) / 2.2);

  return {
    isWeb,
    isWideWeb,
    isNarrowWeb,
    windowWidth: width,
    windowHeight: height,
    contentWidth,
    maxContentWidth: WEB_LAYOUT.maxContentWidth,
    homeHeroWidth,
    homeHeroHeight,
    auctionCardWidth,
  };
}
