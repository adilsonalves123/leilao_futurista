import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { parseSecoesPolitica } from '@/components/policies/policyContent';
import type { AppPolicy } from '@/src/types/appPolicy';
import { lightColors } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';

type PolicySectionsScrollProps = {
  policies: AppPolicy[];
  carregando?: boolean;
  erro?: string | null;
  maxHeight?: number;
  accentColor?: string;
  cardStyle?: StyleProp<ViewStyle>;
};

export function PolicySectionsScroll({
  policies,
  carregando,
  erro,
  maxHeight = 280,
  accentColor = lightColors.accent,
  cardStyle,
}: PolicySectionsScrollProps) {
  const cardBase = [styles.card, { height: maxHeight }, cardStyle];

  if (carregando) {
    return (
      <View style={cardBase}>
        <ActivityIndicator color={accentColor} style={styles.loader} />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={[styles.card, styles.errorCard, { minHeight: 120 }, cardStyle]}>
        <Text style={styles.errorText}>{erro}</Text>
      </View>
    );
  }

  return (
    <View style={cardBase}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
        {policies.map((policy) => {
          const secoes = parseSecoesPolitica(policy.content);
          return (
            <View key={policy.type} style={styles.policyBlock}>
              <View style={styles.policyHeader}>
                <Text style={[styles.policyTitle, { color: accentColor }]}>{policy.title}</Text>
                <Text style={styles.versionTag}>v{policy.version}</Text>
              </View>
              {secoes.map((secao, index) => (
                <View key={`${policy.type}-${index}`} style={styles.section}>
                  {secao.titulo ? (
                    <Text style={styles.sectionTitle}>{secao.titulo}</Text>
                  ) : null}
                  <Text style={styles.sectionBody}>{secao.corpo}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loader: { flex: 1, alignSelf: 'center' },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 18,
  },
  scroll: { padding: spacing.md },
  policyBlock: { marginBottom: spacing.lg },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  policyTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  versionTag: {
    fontSize: 10,
    fontWeight: '700',
    color: lightColors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  section: { marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: lightColors.textSecondary,
  },
});
