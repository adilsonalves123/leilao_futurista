import { Platform, useWindowDimensions } from 'react-native';

import { WEB_LAYOUT } from '@/src/theme/webLayout';

export function useWebLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= WEB_LAYOUT.wideBreakpoint;
  const isNarrowWeb = isWeb && !isWideWeb;

  const contentWidth = isWeb
    ? Math.min(width, WEB_LAYOUT.maxContentWidth)
    : width;

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
    auctionCardWidth,
  };
}
