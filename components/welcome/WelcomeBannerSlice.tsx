import { useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { levouBannerSlice } from '@/src/constants/levouBranding';

/**
 * Banner da Welcome — imagem do usuário em cover, preenchendo toda a área.
 */
export function WelcomeBannerSlice() {
  const [containerWidth, setContainerWidth] = useState(0);
  const bannerHeight = levouBannerSlice.height;

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { height: bannerHeight }]}
      accessibilityLabel="Banner Levou: leilões de produtos premium">
      {containerWidth > 0 ? (
        <Image
          source={levouBannerSlice.source}
          style={{ width: containerWidth, height: bannerHeight }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View pointerEvents="none" style={styles.borderOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#120e2e',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: 24,
  },
});
