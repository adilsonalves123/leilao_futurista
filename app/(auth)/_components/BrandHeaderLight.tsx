import { StyleSheet, Text, View } from 'react-native';
import { levouColors } from '@/src/constants/levouBranding';
import { spacing } from '@/src/theme/tokens';

export function BrandHeaderLight() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>LEVOU</Text>
      </View>
      <Text style={styles.title}>Crie sua conta</Text>
      <Text style={styles.subtitle}>
        Lance em tempo real · custódia segura · leilões verificados
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '800',
    color: levouColors.purple,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1625',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 320,
  },
});
