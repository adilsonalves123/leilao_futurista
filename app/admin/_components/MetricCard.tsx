import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { formatBRL } from '@/src/lib/bids';
import { MiniSparkline } from './charts';
import { adminTheme } from './adminTheme';

type MetricCardProps = {
  label: string;
  valorCents: number;
  variacao: string;
  hint: string;
  accent: 'green' | 'blue';
  icon: keyof typeof Ionicons.glyphMap;
  sparklineValues: number[];
  sparklineId: string;
};

const ACCENTS = {
  green: {
    value: adminTheme.neon,
    badgeBg: adminTheme.successSoft,
    badgeBorder: 'rgba(5,255,155,0.28)',
    badgeText: adminTheme.neon,
    iconBg: adminTheme.successSoft,
    spark: adminTheme.neon,
  },
  blue: {
    value: adminTheme.textPrimary,
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeBorder: 'rgba(16,185,129,0.25)',
    badgeText: adminTheme.neonDim,
    iconBg: 'rgba(16,185,129,0.12)',
    spark: adminTheme.neonDim,
  },
};

export function MetricCard({
  label,
  valorCents,
  variacao,
  hint,
  accent,
  icon,
  sparklineValues,
  sparklineId,
}: MetricCardProps) {
  const theme = ACCENTS[accent];

  return (
    <View
      style={[
        styles.card,
        Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {},
      ]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={icon} size={18} color={theme.spark} />
        </View>
        <View style={[styles.badge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
          <Ionicons name="trending-up" size={12} color={theme.badgeText} />
          <Text style={[styles.badgeText, { color: theme.badgeText }]}>{variacao}</Text>
        </View>
      </View>

      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent === 'green' && { color: theme.value }]}>
        {formatBRL(valorCents)}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.hint}>{hint}</Text>
        <MiniSparkline
          values={sparklineValues}
          color={theme.spark}
          gradientId={sparklineId}
          width={110}
          height={44}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
    backgroundColor: adminTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminTheme.border,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 14,
    fontVariant: ['tabular-nums'],
    color: adminTheme.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  hint: {
    flex: 1,
    fontSize: 12,
    color: adminTheme.textMuted,
    paddingRight: 12,
  },
});
