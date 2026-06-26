import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { lightColors, lightEffects } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';

type LightFrostCardProps = PropsWithChildren<{
  style?: ViewStyle;
  compact?: boolean;
  /** Remove padding interno (imagens full-bleed) */
  flush?: boolean;
}>;

export function LightFrostCard({ children, style, compact, flush }: LightFrostCardProps) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={[styles.card, compact && styles.cardCompact, flush && styles.flush]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii.lg,
    shadowColor: lightColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  card: {
    backgroundColor: lightColors.frostGlass,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightColors.frostBorder,
    padding: spacing.md,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: `blur(${lightEffects.glassBlurPx}px)`,
          WebkitBackdropFilter: `blur(${lightEffects.glassBlurPx}px)`,
        } as object)
      : {}),
  },
  cardCompact: {
    padding: spacing.sm,
  },
  flush: {
    padding: 0,
  },
});
