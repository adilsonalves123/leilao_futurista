import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatBRL } from '@/src/lib/bids';
import { checkoutC } from './checkoutTheme';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  visible: boolean;
  title: string;
  priceCents: number;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function CheckoutPhotoGalleryModal({
  visible,
  title,
  priceCents,
  imageUrls,
  initialIndex = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      requestAnimationFrame(() => {
        if (initialIndex > 0) {
          listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        }
      });
    }
  }, [visible, initialIndex]);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  }

  const urls = imageUrls.length ? imageUrls : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerHint}>Confira o item antes de pagar</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          ref={listRef}
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item }} style={styles.heroImage} resizeMode="contain" />
            </View>
          )}
        />

        {urls.length > 1 ? (
          <View style={styles.dots}>
            {urls.map((url, i) => (
              <View
                key={`dot-${url}-${i}`}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        {urls.length > 1 ? (
          <FlatList
            data={urls}
            keyExtractor={(url, i) => `thumb-${url}-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbStrip}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => {
                  setActiveIndex(index);
                  listRef.current?.scrollToIndex({ index, animated: true });
                }}
                style={[styles.thumbWrap, index === activeIndex && styles.thumbWrapActive]}>
                <Image source={{ uri: item }} style={styles.thumb} resizeMode="cover" />
              </Pressable>
            )}
          />
        ) : null}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.footerTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.footerPrice}>{formatBRL(priceCents)}</Text>
          <Pressable style={styles.backPayBtn} onPress={onClose}>
            <Text style={styles.backPayBtnText}>Voltar ao pagamento</Text>
            <Ionicons name="arrow-down" size={16} color={checkoutC.accent} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 28, 0.92)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  headerSpacer: { width: 40 },
  slide: {
    width: SCREEN_W,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroImage: {
    width: SCREEN_W - 32,
    height: SCREEN_W - 32,
    maxHeight: '70%' as unknown as number,
    borderRadius: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  thumbStrip: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 14,
  },
  thumbWrap: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbWrapActive: {
    borderColor: checkoutC.accentBright,
  },
  thumb: {
    width: 52,
    height: 52,
    backgroundColor: '#1F2937',
  },
  footer: {
    marginTop: 'auto' as unknown as number,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: checkoutC.accentBright,
    marginBottom: 8,
  },
  backPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
  },
  backPayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: checkoutC.accent,
  },
});
