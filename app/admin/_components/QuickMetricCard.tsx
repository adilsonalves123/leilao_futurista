import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { adminC } from './adminStyles';

type QuickMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: 'purple' | 'green' | 'blue' | 'cyan';
};

const ACCENTS = {
  purple: {
    iconBg: 'rgba(139, 92, 246, 0.18)',
    icon: '#A78BFA',
    value: '#F9FAFB',
    glow: 'rgba(139, 92, 246, 0.14)',
  },
  green: {
    iconBg: 'rgba(16, 185, 129, 0.15)',
    icon: '#34D399',
    value: adminC.success,
    glow: 'rgba(16, 185, 129, 0.12)',
  },
  blue: {
    iconBg: 'rgba(59, 130, 246, 0.15)',
    icon: '#60A5FA',
    value: '#F9FAFB',
    glow: 'rgba(59, 130, 246, 0.12)',
  },
  cyan: {
    iconBg: 'rgba(6, 182, 212, 0.15)',
    icon: '#22D3EE',
    value: '#F9FAFB',
    glow: 'rgba(6, 182, 212, 0.12)',
  },
};

export function QuickMetricCard({
  label,
  value,
  hint,
  icon,
  accent = 'purple',
}: QuickMetricCardProps) {
  const theme = ACCENTS[accent];

  return (
    <View
      style={[
        styles.card,
        Platform.OS === 'web'
          ? ({
              backgroundImage:
                'linear-gradient(145deg, rgba(31,41,55,0.88) 0%, rgba(17,24,39,0.94) 100%)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)',
            } as object)
          : null,
      ]}>
      <View style={[styles.glow, { backgroundColor: theme.glow }]} />
      <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={icon} size={17} color={theme.icon} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: theme.value }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    color: adminC.textMuted,
  },
});
