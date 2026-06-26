import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatBRL } from '@/src/lib/bids';
import { useCountdown } from '@/src/hooks/useCountdown';
import { AuctionSellerLine } from '@/components/seller/AuctionSellerLine';
import {
  MOCK_CATEGORIES,
  type AuctionCategoryId,
  type LeiloesAuctionBuckets,
  type MockAuction,
} from '@/src/mocks/auctions';
import { lightColors } from '@/src/theme/lightTokens';
import { uriImagemExibivelNoApp } from '@/src/utils/bannerImageUri';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 24;
const PLUS_H = 380;
const FEATURED_CARD_W = SCREEN_W - H_PAD * 2 - 28;
const FEATURED_GAP = 14;

function ImageBottomFade() {
  return (
    <View style={styles.imageFade} pointerEvents="none">
      <View style={styles.fadeA} />
      <View style={styles.fadeB} />
      <View style={styles.fadeC} />
    </View>
  );
}

function PlusFullBleedSlide({
  item,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  item: MockAuction;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  const c = useCountdown(item.endsAt);

  return (
    <TouchableOpacity
      style={styles.plusSlide}
      onPress={onPress}
      activeOpacity={0.95}
      accessibilityRole="button">
      <Image source={{ uri: item.imageUrl }} style={styles.plusSlideImage} />
      <ImageBottomFade />
      <View style={styles.plusSlideTop}>
        <Text style={styles.plusKicker}>Seleção Levou · Plus</Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
          hitSlop={10}
          activeOpacity={0.7}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.plusSlideBottom}>
        <Text style={styles.plusSlideTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.seller ? (
          <AuctionSellerLine seller={item.seller} compact variant="onDark" linkToProfile={false} />
        ) : null}
        <View style={styles.plusSlideMeta}>
          <Text style={styles.plusSlidePrice}>{formatBRL(item.priceCents)}</Text>
          <Text style={styles.plusSlideTimer}>
            {c.hours}:{c.minutes}:{c.seconds}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCarouselCard({
  item,
  onPress,
}: {
  item: MockAuction;
  onPress: () => void;
}) {
  const c = useCountdown(item.endsAt);

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} />
      <View style={styles.featuredBody}>
        <Text style={styles.featuredKicker}>Em destaque</Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.seller ? <AuctionSellerLine seller={item.seller} compact /> : null}
        <View style={styles.featuredFooter}>
          <Text style={styles.featuredPrice}>{formatBRL(item.priceCents)}</Text>
          <View style={styles.featuredTimer}>
            <Ionicons name="time-outline" size={12} color={C.muted} />
            <Text style={styles.featuredTimerText}>
              {c.hours}:{c.minutes}:{c.seconds}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LiveAuctionRow({
  item,
  onPress,
}: {
  item: MockAuction;
  onPress: () => void;
}) {
  const c = useCountdown(item.endsAt);

  return (
    <TouchableOpacity style={styles.liveRow} onPress={onPress} activeOpacity={0.78}>
      <Image source={{ uri: item.imageUrl }} style={styles.liveThumb} />
      <View style={styles.liveInfo}>
        <Text style={styles.liveTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.seller ? (
          <AuctionSellerLine seller={item.seller} compact linkToProfile={false} />
        ) : null}
        <Text style={styles.livePrice}>{formatBRL(item.priceCents)}</Text>
      </View>
      <View style={styles.liveTimerWrap}>
        <Text style={styles.liveTimerLabel}>encerra</Text>
        <Text style={styles.liveTimer}>
          {c.hours}:{c.minutes}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export type LeiloesLiveContentProps = {
  category: AuctionCategoryId;
  onCategoryChange: (id: AuctionCategoryId) => void;
  buckets: LeiloesAuctionBuckets;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  sponsoredSlides: { id: string; image: string; title: string; subtitle: string }[];
  sponsoredIndex: number;
  onSponsoredIndexChange: (i: number) => void;
};

/**
 * Layout oficial da aba Ao Vivo: Plus full-bleed, destaques em carrossel,
 * leilões orgânicos com foto.
 */
export function LeiloesLiveContent({
  category,
  onCategoryChange,
  buckets,
  favoriteIds,
  onToggleFavorite,
  sponsoredSlides,
  sponsoredIndex,
  onSponsoredIndexChange,
}: LeiloesLiveContentProps) {
  const router = useRouter();
  const [plusIndex, setPlusIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const go = (id: string) => router.push(`/auction/${id}`);

  const hasAny =
    buckets.featuredPlus.length > 0 ||
    buckets.featured.length > 0 ||
    buckets.organic.length > 0;

  function onPlusScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPlusIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  }

  function onFeaturedScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const step = FEATURED_CARD_W + FEATURED_GAP;
    setFeaturedIndex(Math.round(e.nativeEvent.contentOffset.x / step));
  }

  return (
    <>
      {buckets.featuredPlus.length > 0 ? (
        <View style={styles.plusZone}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPlusScroll}
            decelerationRate="fast">
            {buckets.featuredPlus.map((item) => (
              <PlusFullBleedSlide
                key={item.id}
                item={item}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={() => onToggleFavorite(item.id)}
                onPress={() => go(item.id)}
              />
            ))}
          </ScrollView>
          {buckets.featuredPlus.length > 1 ? (
            <View style={styles.dotsRow}>
              {buckets.featuredPlus.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.dot, i === plusIndex && styles.dotActiveDark]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.catPillsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catPills}>
          {MOCK_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => onCategoryChange(cat.id)}
                activeOpacity={0.8}>
                <Text style={[styles.catPillText, active && styles.catPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {buckets.featured.length > 0 ? (
        <View style={styles.featuredZone}>
          <Text style={styles.sectionTitle}>Em destaque</Text>
          <Text style={styles.sectionLead}>Somente lotes em curadoria editorial</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={FEATURED_CARD_W + FEATURED_GAP}
            decelerationRate="fast"
            onMomentumScrollEnd={onFeaturedScroll}
            contentContainerStyle={styles.featuredScroll}>
            {buckets.featured.map((item) => (
              <FeaturedCarouselCard key={item.id} item={item} onPress={() => go(item.id)} />
            ))}
          </ScrollView>
          {buckets.featured.length > 1 ? (
            <View style={styles.dotsRow}>
              {buckets.featured.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.dot, i === featuredIndex && styles.dotActiveAccent]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {buckets.organic.length > 0 ? (
        <View style={styles.liveZone}>
          <View style={styles.liveHead}>
            <Text style={styles.sectionTitle}>Leilões ao vivo</Text>
            <Text style={styles.liveCount}>{buckets.organic.length} lotes</Text>
          </View>
          <View style={styles.liveList}>
            {buckets.organic.map((item, index) => (
              <View key={item.id}>
                <LiveAuctionRow item={item} onPress={() => go(item.id)} />
                {index < buckets.organic.length - 1 ? <View style={styles.liveRule} /> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {hasAny && sponsoredSlides.length > 0 ? (
        <View style={styles.adZone}>
          <Text style={styles.adKicker}>Patrocínio da plataforma</Text>
          <TouchableOpacity style={styles.adFrame} activeOpacity={0.92}>
            {uriImagemExibivelNoApp(sponsoredSlides[sponsoredIndex]?.image) ? (
              <Image
                source={{ uri: sponsoredSlides[sponsoredIndex].image }}
                style={styles.adImg}
              />
            ) : (
              <View style={[styles.adImg, styles.adImgPh]} />
            )}
            <Text style={styles.adTitle} numberOfLines={2}>
              {sponsoredSlides[sponsoredIndex]?.title}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!hasAny ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhum leilão encontrado</Text>
          <Text style={styles.emptySub}>Experimente outra categoria ou busca.</Text>
        </View>
      ) : null}
    </>
  );
}

const C = {
  accent: lightColors.accent,
  bg: '#FFFFFF',
  text: '#111111',
  muted: '#8A8A8A',
  line: '#E8E8E8',
};

const styles = StyleSheet.create({
  plusZone: { marginBottom: 4 },
  plusSlide: {
    width: SCREEN_W,
    height: PLUS_H,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  plusSlideImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    flexDirection: 'column',
  },
  fadeA: { flex: 1, backgroundColor: 'rgba(0,0,0,0)' },
  fadeB: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  fadeC: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.55)' },
  plusSlideTop: {
    position: 'absolute',
    top: 16,
    left: H_PAD,
    right: H_PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plusKicker: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  plusSlideBottom: {
    position: 'absolute',
    left: H_PAD,
    right: H_PAD,
    bottom: 28,
  },
  plusSlideTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 12,
  },
  plusSlideMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  plusSlidePrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  plusSlideTimer: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    fontVariant: ['tabular-nums'],
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4D4D4',
  },
  dotActiveDark: { width: 20, backgroundColor: C.text },
  dotActiveAccent: { width: 20, backgroundColor: C.accent },

  catPillsWrap: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  catPills: { paddingHorizontal: H_PAD, gap: 8 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  catPillActive: { backgroundColor: C.text, borderColor: C.text },
  catPillText: { fontSize: 13, fontWeight: '500', color: C.muted },
  catPillTextActive: { color: '#FFFFFF' },

  featuredZone: { paddingTop: 32, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: C.text,
    letterSpacing: -0.5,
    paddingHorizontal: H_PAD,
  },
  sectionLead: {
    fontSize: 14,
    color: C.muted,
    paddingHorizontal: H_PAD,
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  featuredScroll: {
    paddingHorizontal: H_PAD,
    gap: FEATURED_GAP,
    paddingBottom: 4,
  },
  featuredCard: {
    width: FEATURED_CARD_W,
    backgroundColor: C.bg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
  },
  featuredImage: {
    width: '100%',
    height: 168,
    backgroundColor: '#EFEFEF',
  },
  featuredBody: { padding: 16 },
  featuredKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.accent,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: C.text,
    lineHeight: 22,
    minHeight: 44,
    marginBottom: 12,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  featuredTimer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredTimerText: {
    fontSize: 12,
    color: C.muted,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },

  liveZone: {
    paddingTop: 36,
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
  },
  liveHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  liveCount: { fontSize: 13, color: C.muted },
  liveList: { borderTopWidth: 1, borderTopColor: C.line },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  liveThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#EFEFEF',
  },
  liveInfo: { flex: 1, minWidth: 0 },
  liveTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: C.text,
    lineHeight: 21,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  livePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  liveTimerWrap: { alignItems: 'flex-end', minWidth: 52 },
  liveTimerLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: C.muted,
    marginBottom: 2,
  },
  liveTimer: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    fontVariant: ['tabular-nums'],
  },
  liveRule: { height: 1, backgroundColor: C.line },

  adZone: {
    marginHorizontal: H_PAD,
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginBottom: 8,
  },
  adKicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  adFrame: { gap: 10 },
  adImg: {
    width: '100%',
    height: 112,
    borderRadius: 4,
    backgroundColor: '#EFEFEF',
  },
  adImgPh: { backgroundColor: '#E5E5E5' },
  adTitle: { fontSize: 15, fontWeight: '500', color: C.text, lineHeight: 20 },

  empty: {
    paddingVertical: 64,
    paddingHorizontal: H_PAD,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '400', color: C.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
});
