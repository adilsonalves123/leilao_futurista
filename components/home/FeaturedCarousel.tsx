import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuctionSellerLine } from '@/components/seller/AuctionSellerLine';
import { useCountdown } from '@/src/hooks/useCountdown';
import {
  formatEngagementLabel,
  formatFeaturedPlusPrice,
} from '@/src/lib/featuredPlusFormatters';
import { lightColors } from '@/src/theme/lightTokens';
import type { FeaturedPlusCarouselItem } from '@/src/types/featuredPlus';

const BANNER_H_MARGIN = 8;
const BANNER_ASPECT = 2;
const SCREEN_W = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_W - BANNER_H_MARGIN * 2;
const BANNER_HEIGHT = BANNER_WIDTH / BANNER_ASPECT;

export type FeaturedCarouselProps = {
  items: FeaturedPlusCarouselItem[];
  autoplayIntervalMs?: number;
  loading?: boolean;
};

type SlideShellProps = {
  item: FeaturedPlusCarouselItem;
  onParticipate: () => void;
};

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownDigit}>{value}</Text>
      <Text style={styles.countdownUnitLabel}>{label}</Text>
    </View>
  );
}

/** Casca visual fixa renderizada sobre a foto limpa do anunciante. */
function FeaturedCarouselSlideShell({ item, onParticipate }: SlideShellProps) {
  const countdown = useCountdown(item.endsAtMs);
  const engagement = formatEngagementLabel(item.watchersCount, item.participantsCount);

  return (
    <>
      <Image
        source={{ uri: item.imageUrl } as ImageSourcePropType}
        style={styles.heroImage}
        resizeMode="cover"
      />

      <View style={styles.heroOverlayTop} pointerEvents="none" />
      <View style={styles.bottomFade} pointerEvents="none">
        <View style={styles.fadeStepClear} />
        <View style={[styles.fadeStep, styles.fadeStepLight]} />
        <View style={[styles.fadeStep, styles.fadeStepMid]} />
        <View style={[styles.fadeStep, styles.fadeStepStrong]} />
      </View>

      <View style={styles.heroTopRow} pointerEvents="box-none">
        <View style={styles.heroTopLeft}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>🔥 LEILÃO EM DESTAQUE</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.seller ? (
            <View style={styles.heroSeller}>
              <AuctionSellerLine seller={item.seller} compact variant="onDark" />
            </View>
          ) : null}
        </View>

        <View style={styles.countdownPanel}>
          <Text style={styles.countdownLabel}>TERMINA EM</Text>
          <View style={styles.countdownRow}>
            <CountdownUnit value={countdown.hours} label="h" />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={countdown.minutes} label="min" />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={countdown.seconds} label="seg" />
          </View>
        </View>
      </View>

      <View style={styles.heroBottomRow} pointerEvents="box-none">
        <View style={styles.heroBottomLeft}>
          <Text style={styles.priceLabel}>LANCE ATUAL</Text>
          <Text style={styles.priceValue}>
            {formatFeaturedPlusPrice(item.currentPriceCents)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name="eye" size={11} color="#FCD34D" />
              </View>
              <Text style={styles.statText}>{engagement.watching}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name="people" size={11} color="#FCD34D" />
              </View>
              <Text style={styles.statText}>{engagement.participants}</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.participateBtn}
          onPress={(e) => {
            e?.stopPropagation?.();
            onParticipate();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Participar do leilão ${item.title}`}>
          <Text style={styles.participateBtnText}>Participar</Text>
          <Ionicons name="arrow-forward" size={16} color="#1A1625" />
        </Pressable>
      </View>
    </>
  );
}

/**
 * Carrossel Destaque Plus — consome array tipado do Supabase (is_featured_plus).
 * Apenas a imagem vem do anunciante; UI padronizada pelo app.
 */
export function FeaturedCarousel({
  items,
  autoplayIntervalMs = 3500,
  loading = false,
}: FeaturedCarouselProps) {
  const router = useRouter();
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [items]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndiceAtivo((atual) => (atual + 1) % items.length);
    }, autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [items, items.length, autoplayIntervalMs]);

  if (loading) {
    return <View style={[styles.hero, styles.heroPlaceholder]} />;
  }

  if (items.length === 0) {
    return null;
  }

  const slide = items[indiceAtivo];

  const abrirLeilao = () => {
    router.push(`/auction/${slide.id}` as never);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.hero}
        onPress={abrirLeilao}
        accessibilityRole="button"
        accessibilityLabel={`Destaque Plus: ${slide.title}`}>
        <FeaturedCarouselSlideShell item={slide} onParticipate={abrirLeilao} />
      </Pressable>

      {items.length > 1 ? (
        <View style={styles.heroIndicators}>
          {items.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => setIndiceAtivo(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Ir para destaque ${i + 1}`}>
              <View
                style={[
                  styles.heroIndicator,
                  i === indiceAtivo
                    ? styles.heroIndicatorActive
                    : styles.heroIndicatorInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  hero: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    alignSelf: 'center',
    marginHorizontal: BANNER_H_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1625',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  heroPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 7, 28, 0.08)',
    zIndex: 1,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
    zIndex: 1,
  },
  fadeStep: { flex: 1 },
  fadeStepClear: { flex: 2 },
  fadeStepLight: { backgroundColor: 'rgba(9, 7, 28, 0.12)' },
  fadeStepMid: { backgroundColor: 'rgba(9, 7, 28, 0.38)' },
  fadeStepStrong: { backgroundColor: 'rgba(9, 7, 28, 0.62)' },
  heroTopRow: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 2,
  },
  heroTopLeft: {
    flex: 1,
    minWidth: 0,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 5,
  },
  featuredBadgeText: {
    color: '#FCD34D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 20,
    textShadowColor: 'rgba(9, 7, 28, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSeller: { marginTop: 4 },
  countdownPanel: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(9, 7, 28, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 26,
  },
  countdownDigit: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
    textShadowColor: 'rgba(9, 7, 28, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countdownUnitLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'lowercase',
  },
  countdownSep: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 1,
    marginTop: 1,
    lineHeight: 20,
  },
  heroBottomRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 2,
  },
  heroBottomLeft: {
    flex: 1,
    minWidth: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(9, 7, 28, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  priceValue: {
    color: lightColors.accent,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 24,
    textShadowColor: 'rgba(9, 7, 28, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  participateBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B942',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  participateBtnText: {
    color: '#1A1625',
    fontSize: 13,
    fontWeight: '800',
  },
  heroIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  heroIndicator: { height: 6, borderRadius: 3 },
  heroIndicatorActive: { width: 22, backgroundColor: lightColors.accent },
  heroIndicatorInactive: { width: 6, backgroundColor: '#D1D5DB' },
});
