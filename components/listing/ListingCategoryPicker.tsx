import { Sparkles } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  ListingPickerCardFooter,
  ListingPickerHero,
  ListingPickerSectionHead,
  ListingPickerTrustNote,
} from '@/components/listing/ListingPickerChrome';
import {
  PICKER_GRID_GAP,
  PICKER_H_PADDING,
  PICKER_ICON_STROKE,
  pickerColors,
  pickerShadowCard,
  pickerShadowFeatured,
} from '@/components/listing/listingPickerTheme';
import {
  LISTING_CATEGORY_CARDS,
  type ListingCategoryCard,
} from '@/src/constants/listingCategoriesUi';
import type { ListingCategoryId } from '@/src/lib/listingPublishValidation';

const ICON_SIZE_FEATURED = 26;
const ICON_SIZE_STANDARD = 22;
const CARD_HEIGHT = 116;
const FEATURED_HEIGHT = 126;

type Props = {
  onSelect: (id: ListingCategoryId) => void;
};

function CategoryCard({
  item,
  width,
  onPress,
}: {
  item: ListingCategoryCard;
  width: number;
  onPress: () => void;
}) {
  const Icon = item.icon;
  const isFeatured = item.featured === true;

  return (
    <Pressable onPress={onPress} style={{ width }}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            { width, minHeight: isFeatured ? FEATURED_HEIGHT : CARD_HEIGHT },
            isFeatured ? styles.cardFeatured : styles.cardStandard,
            pressed && styles.cardPressed,
            isFeatured ? pickerShadowFeatured : pickerShadowCard,
          ]}>
          {isFeatured ? <View style={styles.featuredAccent} /> : null}
          <View style={[styles.iconRing, isFeatured && styles.iconRingFeatured]}>
            <Icon
              size={isFeatured ? ICON_SIZE_FEATURED : ICON_SIZE_STANDARD}
              color={isFeatured ? pickerColors.accentDeep : pickerColors.accent}
              strokeWidth={PICKER_ICON_STROKE}
            />
          </View>
          <Text style={[styles.cardTitle, isFeatured && styles.cardTitleFeatured]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.cardHint} numberOfLines={2}>
            {item.hint}
          </Text>
          {item.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}
          <ListingPickerCardFooter />
        </View>
      )}
    </Pressable>
  );
}

export function ListingCategoryPicker({ onSelect }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - PICKER_H_PADDING * 2 - PICKER_GRID_GAP) / 2);

  return (
    <View style={styles.root}>
      <ListingPickerHero
        icon={Sparkles}
        eyebrow="Novo anúncio"
        title="O que vamos leiloar?"
        subtitle="Escolha a categoria. Cada uma abre um fluxo otimizado — você pode voltar e trocar depois."
      />

      <ListingPickerSectionHead
        title="Categorias"
        countLabel={`${LISTING_CATEGORY_CARDS.length} opções`}
      />

      <FlatList
        data={LISTING_CATEGORY_CARDS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.columnRow}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <CategoryCard item={item} width={cardWidth} onPress={() => onSelect(item.id)} />
        )}
      />

      <ListingPickerTrustNote text="Cadastro guiado com validação de IMEI, frete e ficha técnica quando aplicável." />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grid: { paddingBottom: 2 },
  columnRow: { gap: PICKER_GRID_GAP, marginBottom: PICKER_GRID_GAP },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStandard: {
    backgroundColor: pickerColors.cardStandardBg,
    borderColor: pickerColors.cardStandardBorder,
    borderWidth: 1.5,
  },
  cardFeatured: {
    backgroundColor: pickerColors.cardFeaturedBg,
    borderColor: pickerColors.borderFeatured,
  },
  cardPressed: {
    backgroundColor: pickerColors.cardPressed,
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  featuredAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: pickerColors.accent,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: pickerColors.cardMutedFill,
    borderWidth: 1,
    borderColor: pickerColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconRingFeatured: {
    backgroundColor: pickerColors.heroBg,
    borderColor: pickerColors.heroBorder,
    width: 46,
    height: 46,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: pickerColors.textPrimary,
    textAlign: 'center',
  },
  cardTitleFeatured: {
    fontSize: 14,
    color: pickerColors.accentDeep,
  },
  cardHint: {
    fontSize: 10,
    lineHeight: 14,
    color: pickerColors.textMuted,
    textAlign: 'center',
    minHeight: 28,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: pickerColors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: pickerColors.badgeText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
