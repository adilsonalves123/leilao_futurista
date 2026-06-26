import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import type { AuctionSellerSnippet } from '@/src/services/auctionSellerSnippet';

type Props = {
  seller: AuctionSellerSnippet;
  compact?: boolean;
  linkToProfile?: boolean;
  variant?: 'light' | 'onDark';
};

export function AuctionSellerLine({
  seller,
  compact,
  linkToProfile = true,
  variant = 'light',
}: Props) {
  const router = useRouter();
  const onDark = variant === 'onDark';

  const content = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Text
        style={[styles.prefix, compact && styles.prefixCompact, onDark && styles.prefixOnDark]}
        numberOfLines={1}>
        Vendido por{' '}
        <Text style={[styles.name, onDark && styles.nameOnDark]}>{seller.sellerName}</Text>
      </Text>
      {seller.sellerBadge ? <SellerBadgeChip badge={seller.sellerBadge} compact /> : null}
    </View>
  );

  if (!linkToProfile) {
    return content;
  }

  return (
    <Pressable
      onPress={() => router.push(`/vendor/${encodeURIComponent(seller.sellerId)}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${seller.sellerName}`}
      hitSlop={4}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  rowCompact: { marginTop: 4, gap: 4 },
  prefix: { fontSize: 12, color: '#6B7280', fontWeight: '500', flexShrink: 1 },
  prefixCompact: { fontSize: 11 },
  prefixOnDark: { color: 'rgba(255,255,255,0.85)' },
  name: { fontWeight: '700', color: '#374151' },
  nameOnDark: { color: '#FFFFFF' },
});
