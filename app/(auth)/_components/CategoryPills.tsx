import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { AuctionCategoryId } from '@/src/mocks/auctions';
import { MOCK_CATEGORIES } from '@/src/mocks/auctions';
import { lightColors } from '@/src/theme/lightTokens';
import { spacing } from '@/src/theme/tokens';

type CategoryPillsProps = {
  selected: AuctionCategoryId;
  onSelect: (id: AuctionCategoryId) => void;
};

export function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {MOCK_CATEGORIES.map((cat) => {
        const active = selected === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.lg,
    flexGrow: 0,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  pillActive: {
    backgroundColor: lightColors.accent,
    borderColor: lightColors.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
