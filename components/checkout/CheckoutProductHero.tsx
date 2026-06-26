import { Ionicons } from '@expo/vector-icons';

import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatBRL } from '@/src/lib/bids';

import { checkoutC } from './checkoutTheme';



type Props = {

  title: string;

  imageUrl: string;

  imageCount: number;

  priceCents: number;

  onPressPhotos: () => void;

};



export function CheckoutProductHero({

  title,

  imageUrl,

  imageCount,

  priceCents,

  onPressPhotos,

}: Props) {

  return (

    <View style={styles.wrap}>

      <View style={styles.badge}>

        <Ionicons name="trophy" size={14} color={checkoutC.gold} />

        <Text style={styles.badgeText}>Arremate confirmado</Text>

      </View>



      <View style={styles.row}>

        <Pressable

          style={styles.thumbPress}

          onPress={onPressPhotos}

          accessibilityRole="button"

          accessibilityLabel="Ver fotos do item">

          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />

          <View style={styles.thumbOverlay}>

            <Ionicons name="expand-outline" size={16} color="#FFFFFF" />

          </View>

          {imageCount > 1 ? (

            <View style={styles.countBadge}>

              <Text style={styles.countBadgeText}>{imageCount}</Text>

            </View>

          ) : null}

        </Pressable>



        <View style={styles.info}>

          <Text style={styles.title} numberOfLines={2}>

            {title}

          </Text>

          <Text style={styles.priceLabel}>Valor do arremate</Text>

          <Text style={styles.price}>{formatBRL(priceCents)}</Text>

          <Pressable style={styles.verFotosBtn} onPress={onPressPhotos} hitSlop={8}>

            <Ionicons name="images-outline" size={13} color={checkoutC.accent} />

            <Text style={styles.verFotosText}>

              {imageCount > 1 ? `Ver ${imageCount} fotos` : 'Ampliar foto'}

            </Text>

          </Pressable>

        </View>

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    backgroundColor: checkoutC.card,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: checkoutC.cardBorder,

    padding: 16,

    shadowColor: checkoutC.shadow,

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 1,

    shadowRadius: 20,

    elevation: 6,

    gap: 14,

  },

  badge: {

    flexDirection: 'row',

    alignItems: 'center',

    alignSelf: 'flex-start',

    gap: 6,

    backgroundColor: checkoutC.goldSoft,

    borderWidth: 1,

    borderColor: checkoutC.goldBorder,

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 999,

  },

  badgeText: {

    fontSize: 11,

    fontWeight: '700',

    color: checkoutC.gold,

    letterSpacing: 0.3,

  },

  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },

  thumbPress: {

    position: 'relative',

    borderRadius: 16,

    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),

  },

  thumb: {

    width: 88,

    height: 88,

    borderRadius: 16,

    backgroundColor: '#F3F4F6',

    borderWidth: 1,

    borderColor: checkoutC.divider,

  },

  thumbOverlay: {

    position: 'absolute',

    right: 6,

    bottom: 6,

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: 'rgba(30, 27, 46, 0.55)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  countBadge: {

    position: 'absolute',

    top: 6,

    left: 6,

    minWidth: 20,

    height: 20,

    borderRadius: 10,

    paddingHorizontal: 5,

    backgroundColor: checkoutC.accent,

    alignItems: 'center',

    justifyContent: 'center',

  },

  countBadgeText: {

    fontSize: 10,

    fontWeight: '800',

    color: '#FFFFFF',

  },

  info: { flex: 1, gap: 4 },

  title: {

    fontSize: 16,

    fontWeight: '800',

    color: checkoutC.text,

    lineHeight: 22,

  },

  priceLabel: { fontSize: 11, color: checkoutC.textMuted, fontWeight: '600' },

  price: { fontSize: 22, fontWeight: '800', color: checkoutC.accent },

  verFotosBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    marginTop: 4,

    alignSelf: 'flex-start',

  },

  verFotosText: {

    fontSize: 12,

    fontWeight: '700',

    color: checkoutC.accent,

  },

});


