import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, spacing } from '@/src/theme/tokens';

type Props = {
  images: string[];
  title?: string;
  subtitle?: string;
  variant?: 'dark' | 'light';
  buyerNames?: string[];
};

const CARD_W = 140;
const { width: SCREEN_W } = Dimensions.get('window');

export function BuyerPhotosCarousel({
  images,
  title = 'Fotos reais de compradores',
  subtitle,
  variant = 'dark',
  buyerNames,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isDark = variant === 'dark';

  if (images.length === 0) return null;

  return (
    <View style={[styles.wrap, isDark ? styles.wrapDark : styles.wrapLight]}>
      <View style={styles.header}>
        <View style={[styles.badge, isDark ? styles.badgeDark : styles.badgeLight]}>
          <Ionicons name="shield-checkmark" size={14} color={isDark ? colors.cyberGreen : '#059669'} />
          <Text style={[styles.badgeText, isDark ? styles.badgeTextDark : styles.badgeTextLight]}>
            Verificado
          </Text>
        </View>
        <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}>
        {images.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}
            onPress={() => setLightboxIndex(index)}>
            <Image source={{ uri }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardOverlay}>
              <Ionicons name="expand-outline" size={16} color="#FFF" />
            </View>
            {buyerNames?.[index] ? (
              <Text style={styles.cardCaption} numberOfLines={1}>
                {buyerNames[index]}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={lightboxIndex !== null} transparent animationType="fade">
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxIndex(null)}>
          <Pressable style={styles.lightboxContent} onPress={(e) => e.stopPropagation()}>
            {lightboxIndex !== null ? (
              <Image
                source={{ uri: images[lightboxIndex] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
            <Pressable style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </Pressable>
            {lightboxIndex !== null && images.length > 1 ? (
              <View style={styles.lightboxNav}>
                <Pressable
                  disabled={lightboxIndex <= 0}
                  onPress={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}>
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
                </Pressable>
                <Text style={styles.lightboxCounter}>
                  {(lightboxIndex ?? 0) + 1} / {images.length}
                </Text>
                <Pressable
                  disabled={lightboxIndex >= images.length - 1}
                  onPress={() =>
                    setLightboxIndex((i) => Math.min(images.length - 1, (i ?? 0) + 1))
                  }>
                  <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.lg, padding: spacing.md, marginVertical: spacing.sm },
  wrapDark: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  wrapLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: { marginBottom: spacing.sm, gap: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeDark: { backgroundColor: 'rgba(5,255,155,0.12)' },
  badgeLight: { backgroundColor: '#ECFDF5' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  badgeTextDark: { color: colors.cyberGreen },
  badgeTextLight: { color: '#059669' },
  title: { fontSize: 16, fontWeight: '800' },
  titleDark: { color: colors.textPrimary },
  titleLight: { color: '#1A1625' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  subtitleDark: { color: colors.textMuted },
  subtitleLight: { color: '#6B7280' },
  carousel: { gap: spacing.sm, paddingRight: spacing.md },
  card: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  cardDark: { borderWidth: 1, borderColor: colors.glassBorder },
  cardLight: { borderWidth: 1, borderColor: '#E5E7EB' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContent: { width: SCREEN_W, alignItems: 'center' },
  lightboxImage: { width: SCREEN_W - 32, height: SCREEN_W - 32 },
  lightboxClose: {
    position: 'absolute',
    top: -SCREEN_W * 0.35,
    right: 16,
    padding: 8,
  },
  lightboxNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  lightboxCounter: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
