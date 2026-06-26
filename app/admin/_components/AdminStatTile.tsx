import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { adminTheme } from './adminTheme';

type Accent = 'navy' | 'green' | 'blue' | 'gold' | 'live';

const ACCENTS: Record<
  Accent,
  { iconBg: string; icon: string; border: string }
> = {
  navy: { iconBg: 'rgba(5,255,155,0.12)', icon: adminTheme.neon, border: adminTheme.borderStrong },
  green: { iconBg: adminTheme.successSoft, icon: adminTheme.neon, border: 'rgba(5,255,155,0.28)' },
  blue: { iconBg: 'rgba(16,185,129,0.12)', icon: adminTheme.neonDim, border: 'rgba(16,185,129,0.25)' },
  gold: { iconBg: adminTheme.goldSoft, icon: adminTheme.gold, border: 'rgba(251,191,36,0.25)' },
  live: { iconBg: 'rgba(239,68,68,0.12)', icon: adminTheme.live, border: 'rgba(239,68,68,0.25)' },
};

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: Accent;
};

export function AdminStatTile({ label, value, hint, icon, accent = 'navy' }: Props) {
  const theme = ACCENTS[accent];

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.border },
        Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {},
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={icon} size={18} color={theme.icon} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
    backgroundColor: adminTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    color: adminTheme.textMuted,
    lineHeight: 15,
  },
});
