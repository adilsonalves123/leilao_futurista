import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '@/src/theme/tokens';

type Props = {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
};

export function StarRatingInput({ value, onChange, size = 32, disabled }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            onPress={() => !disabled && onChange(star)}
            disabled={disabled}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} estrela${star > 1 ? 's' : ''}`}>
            <Animated.View style={styles.starWrap}>
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={size}
                color={filled ? '#FBBF24' : colors.glassBorder}
              />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  starWrap: {
    padding: 2,
  },
});
