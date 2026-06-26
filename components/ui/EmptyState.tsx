import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = 'albums-outline',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={appColors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.actionBtn} onPress={onAction} accessibilityRole="button">
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: appSpacing.xxl * 2,
    paddingHorizontal: appSpacing.lg,
    gap: appSpacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: appColors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: appSpacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: appColors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: appColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: appSpacing.md,
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.md,
    borderRadius: appRadii.md,
    backgroundColor: appColors.accent,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});
