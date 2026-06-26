import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { adminTheme } from './adminTheme';

export type AttentionItem = {
  id: string;
  message: string;
  tone: 'warning' | 'danger' | 'info';
  href?: string;
  actionLabel?: string;
};

const TONE = {
  warning: { bg: adminTheme.warningSoft, border: 'rgba(251,191,36,0.3)', icon: adminTheme.gold, text: '#FDE68A' },
  danger: { bg: adminTheme.dangerSoft, border: 'rgba(248,113,113,0.3)', icon: adminTheme.danger, text: '#FECACA' },
  info: { bg: adminTheme.infoSoft, border: adminTheme.borderStrong, icon: adminTheme.neon, text: '#A7F3D0' },
} as const;

type Props = {
  items: AttentionItem[];
};

export function AdminAttentionStrip({ items }: Props) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Atenção imediata</Text>
      <View style={styles.list}>
        {items.map((item) => {
          const tone = TONE[item.tone];
          return (
            <View
              key={item.id}
              style={[
                styles.row,
                { backgroundColor: tone.bg, borderColor: tone.border },
                Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {},
              ]}>
              <Ionicons name="alert-circle-outline" size={18} color={tone.icon} />
              <Text style={[styles.message, { color: tone.text }]}>{item.message}</Text>
              {item.href && item.actionLabel ? (
                <Pressable
                  style={styles.action}
                  onPress={() => router.push(item.href as never)}>
                  <Text style={[styles.actionText, { color: tone.icon }]}>{item.actionLabel}</Text>
                  <Ionicons name="chevron-forward" size={14} color={tone.icon} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    minWidth: 200,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
