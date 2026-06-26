import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LightFrostCard } from '@/components/ui/LightFrostCard';
import { formatBRL } from '@/src/lib/bids';
import { useCountdown } from '@/src/hooks/useCountdown';
import type { MockAuction } from '@/src/mocks/auctions';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type AuctionGridCardProps = {
  auction: MockAuction;
};

export function AuctionGridCard({ auction }: AuctionGridCardProps) {
  const router = useRouter();
  const { formatted, isEndingSoon } = useCountdown(auction.endsAt);

  return (
    <View style={styles.cell}>
      <LightFrostCard flush>
        <Image source={{ uri: auction.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {auction.title}
          </Text>
          <Text style={styles.price}>{formatBRL(auction.priceCents)}</Text>
          <Text style={[styles.timer, isEndingSoon && styles.timerUrgent]}>{formatted}</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push(`/auction/${auction.id}`)}>
            <Text style={styles.buttonText}>Ver leilão</Text>
          </Pressable>
        </View>
      </LightFrostCard>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: radii.lg - 1,
    borderTopRightRadius: radii.lg - 1,
    backgroundColor: lightColors.inputBorder,
  },
  body: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.textPrimary,
    minHeight: 36,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: lightColors.accent,
    marginBottom: 4,
  },
  timer: {
    fontFamily: fonts.timerRegular,
    fontSize: 11,
    letterSpacing: 1,
    color: lightColors.textMuted,
    marginBottom: spacing.sm,
  },
  timerUrgent: {
    color: '#DC2626',
  },
  button: {
    backgroundColor: lightColors.accent,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
