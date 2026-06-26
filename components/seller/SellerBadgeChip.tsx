import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SELLER_BADGE_COLORS,
  SELLER_BADGE_SHORT,
  type SellerBadge,
} from '@/src/constants/sellerBadge';

type Props = {
  badge: SellerBadge;
  compact?: boolean;
};

const ICONS: Record<SellerBadge, keyof typeof Ionicons.glyphMap> = {
  particular: 'person-outline',
  empresa_verificada: 'business-outline',
  loja_oficial: 'shield-checkmark',
};

export function SellerBadgeChip({ badge, compact }: Props) {
  const colors = SELLER_BADGE_COLORS[badge];
  return (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}>
      <Ionicons name={ICONS[badge]} size={compact ? 12 : 14} color={colors.text} />
      <Text style={[styles.text, compact && styles.textCompact, { color: colors.text }]}>
        {SELLER_BADGE_SHORT[badge]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textCompact: {
    fontSize: 11,
  },
});
