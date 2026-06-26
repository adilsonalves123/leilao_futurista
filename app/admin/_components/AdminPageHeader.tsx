import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { adminTheme } from './adminTheme';

type Action = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: Action[];
};

export function AdminPageHeader({ title, subtitle, meta, actions }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={[styles.actionBtn, (action.loading || action.disabled) && styles.actionBtnBusy]}
              onPress={action.onPress}
              disabled={action.loading || action.disabled}>
              {action.loading ? (
                <ActivityIndicator size="small" color={adminTheme.neon} />
              ) : action.icon ? (
                <Ionicons name={action.icon} size={16} color={adminTheme.neon} />
              ) : null}
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  textCol: { flex: 1, minWidth: 240 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: adminTheme.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
    ...(Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {}),
  },
  actionBtnBusy: { opacity: 0.65 },
  actionBtnText: {
    color: adminTheme.neon,
    fontWeight: '600',
    fontSize: 13,
  },
});
