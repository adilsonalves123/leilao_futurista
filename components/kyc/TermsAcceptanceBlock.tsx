import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { parseSecoesPolitica } from '@/components/policies/policyContent';
import type { AppPolicy } from '@/src/types/appPolicy';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type TermsAcceptanceBlockProps = {
  aceito: boolean;
  onToggle: () => void;
  policy: AppPolicy | null;
  carregando?: boolean;
};

export function TermsAcceptanceBlock({
  aceito,
  onToggle,
  policy,
  carregando,
}: TermsAcceptanceBlockProps) {
  const secoes = policy ? parseSecoesPolitica(policy.content) : [];
  const intro = secoes[0]?.corpo && !secoes[0]?.titulo ? secoes[0].corpo : null;
  const clausulas = intro ? secoes.slice(1) : secoes;

  return (
    <View style={styles.wrap}>
      {carregando ? (
        <ActivityIndicator color={lightColors.accent} style={styles.loader} />
      ) : null}

      <Text style={styles.heading}>
        {policy?.title ?? 'Termo Vinculante de Arremate'}
      </Text>

      {policy ? (
        <>
          {intro ? <Text style={styles.legalIntro}>{intro}</Text> : null}

          <View style={styles.clauseList}>
            {clausulas.map((secao, index) => (
              <View key={`${secao.titulo ?? 'sec'}-${index}`} style={styles.clause}>
                <Ionicons
                  name={iconParaSecao(secao.titulo)}
                  size={18}
                  color={lightColors.accent}
                  style={styles.clauseIcon}
                />
                <View style={styles.clauseText}>
                  {secao.titulo ? (
                    <Text style={styles.clauseTitle}>{secao.titulo}</Text>
                  ) : null}
                  <Text style={styles.clauseBody}>{secao.corpo}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.versionBadge}>
            <Ionicons name="document-lock-outline" size={14} color={lightColors.textMuted} />
            <Text style={styles.versionText}>Versão {policy.version}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.legalIntro}>
          Não foi possível carregar os termos. Tente novamente em instantes.
        </Text>
      )}

      <Pressable
        style={[styles.checkRow, aceito && styles.checkRowActive]}
        onPress={onToggle}
        disabled={!policy || carregando}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceito, disabled: !policy }}>
        <View style={[styles.checkbox, aceito && styles.checkboxOn]}>
          {aceito ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text style={styles.checkLabel}>
          Li e aceito integralmente os termos descritos acima
          {policy ? ` (versão ${policy.version})` : ''}.
        </Text>
      </Pressable>
    </View>
  );
}

function iconParaSecao(titulo?: string): keyof typeof Ionicons.glyphMap {
  const t = (titulo ?? '').toLowerCase();
  if (t.includes('comissão') || t.includes('comissao')) return 'cash-outline';
  if (t.includes('multa')) return 'warning-outline';
  if (t.includes('veracidade') || t.includes('document')) return 'document-text-outline';
  return 'hammer-outline';
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  loader: { marginBottom: spacing.sm },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    color: lightColors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: fonts.timerRegular,
  },
  legalIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: lightColors.textSecondary,
    marginBottom: spacing.md,
  },
  clauseList: { gap: spacing.md, marginBottom: spacing.md },
  clause: { flexDirection: 'row', gap: spacing.sm },
  clauseIcon: { marginTop: 2 },
  clauseText: { flex: 1 },
  clauseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 2,
  },
  clauseBody: { fontSize: 11, lineHeight: 16, color: lightColors.textMuted },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '600',
    color: lightColors.textMuted,
    letterSpacing: 0.4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  checkRowActive: {
    borderColor: lightColors.accent,
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: lightColors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: lightColors.accent,
    borderColor: lightColors.accent,
  },
  checkLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: lightColors.textPrimary,
    fontWeight: '600',
  },
});
