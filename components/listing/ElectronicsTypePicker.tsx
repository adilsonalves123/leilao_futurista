import {
  Camera,
  Gamepad2,
  Headphones,
  Laptop,
  MoreHorizontal,
  Plug,
  Smartphone,
  Speaker,
  Tv,
  Watch,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  ListingPickerBackRow,
  ListingPickerCardFooter,
  ListingPickerHero,
  ListingPickerSearch,
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
  ELECTRONICS_CATALOG,
  filterElectronicsCatalog,
  getElectronicTagLabel,
  type ElectronicType,
  type ElectronicTypeId,
} from '@/src/constants/electronicsCatalog';

const ICON_SIZE = 22;
const CARD_HEIGHT = 112;
const FEATURED_HEIGHT = 120;

const ELECTRONIC_ICONS: Record<ElectronicTypeId, LucideIcon> = {
  celular: Smartphone,
  computador: Laptop,
  videogames: Gamepad2,
  smartwatches: Watch,
  fones: Headphones,
  caixa_som: Speaker,
  smart_tv: Tv,
  cameras_drones: Camera,
  acessorios: Plug,
  outros: MoreHorizontal,
};

type Props = {
  onSelect: (id: ElectronicTypeId) => void;
  onBack: () => void;
};

function ElectronicTypeCard({
  item,
  width,
  onPress,
}: {
  item: ElectronicType;
  width: number;
  onPress: () => void;
}) {
  const Icon = ELECTRONIC_ICONS[item.id];
  const tag = getElectronicTagLabel(item.identification);
  const isImei = tag === 'IMEI';
  const isFeatured = item.id === 'celular';

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
              size={ICON_SIZE}
              color={isFeatured ? pickerColors.accentDeep : pickerColors.accent}
              strokeWidth={PICKER_ICON_STROKE}
            />
          </View>
          <Text style={[styles.cardLabel, isFeatured && styles.cardLabelFeatured]} numberOfLines={2}>
            {item.label}
          </Text>
          <View style={[styles.tagPill, isImei ? styles.tagPillImei : styles.tagPillSerial]}>
            <Text style={[styles.cardTag, isImei ? styles.cardTagImei : styles.cardTagSerial]}>
              {tag}
            </Text>
          </View>
          <ListingPickerCardFooter />
        </View>
      )}
    </Pressable>
  );
}

export function ElectronicsTypePicker({ onSelect, onBack }: Props) {
  const [query, setQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - PICKER_H_PADDING * 2 - PICKER_GRID_GAP) / 2);

  const filtered = useMemo(() => filterElectronicsCatalog(query), [query]);

  return (
    <View style={styles.root}>
      <ListingPickerBackRow label="Categorias" onPress={onBack} />

      <ListingPickerHero
        icon={Smartphone}
        eyebrow="Eletrônicos"
        title="Qual tipo de item?"
        subtitle="Celular pede IMEI; demais tipos pedem número de série. A ficha técnica vem na próxima etapa."
      />

      <ListingPickerSearch
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar: celular, notebook, TV..."
      />

      <ListingPickerSectionHead
        title="Tipos"
        countLabel={`${filtered.length} opções`}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum tipo encontrado para “{query}”.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.columnRow}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ElectronicTypeCard
              item={item}
              width={cardWidth}
              onPress={() => onSelect(item.id)}
            />
          )}
        />
      )}

      <ListingPickerTrustNote text="IMEI validado em celulares. Notebook, TV e games usam número de série." />
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
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
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
    width: 40,
    height: 40,
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
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: pickerColors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 4,
  },
  cardLabelFeatured: {
    fontSize: 13,
    color: pickerColors.accentDeep,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  tagPillImei: {
    backgroundColor: pickerColors.badgeBg,
  },
  tagPillSerial: {
    backgroundColor: pickerColors.cardMutedFill,
    borderWidth: 1,
    borderColor: pickerColors.border,
  },
  cardTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardTagImei: { color: pickerColors.badgeText },
  cardTagSerial: { color: pickerColors.textMuted },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: pickerColors.textMuted, textAlign: 'center' },
});
