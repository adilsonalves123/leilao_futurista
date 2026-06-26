import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { lightColors } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';
import type { StatusVerificacao } from '@/src/types/kyc';

type KycIdentityVerifiedCardProps = {
  status: StatusVerificacao;
};

export function KycIdentityVerifiedCard({ status }: KycIdentityVerifiedCardProps) {
  const aprovado = status === 'aprovado';

  return (
    <View style={[styles.card, aprovado ? styles.cardVerified : styles.cardPending]}>
      <View style={[styles.iconWrap, aprovado ? styles.iconVerified : styles.iconPending]}>
        <Ionicons
          name={aprovado ? 'shield-checkmark' : 'time-outline'}
          size={28}
          color={aprovado ? '#059669' : '#D97706'}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, aprovado ? styles.titleVerified : styles.titlePending]}>
          {aprovado ? 'Identidade Verificada' : 'Identidade em análise'}
        </Text>
        <Text style={styles.desc}>
          {aprovado
            ? 'Seus dados civis e documentos estão validados e protegidos. Por segurança, não podem ser alterados.'
            : 'Seus documentos foram recebidos. A verificação costuma levar até 48 horas úteis.'}
        </Text>
      </View>
      {aprovado ? (
        <Ionicons name="checkmark-circle" size={22} color="#059669" accessibilityLabel="Verificado" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  cardVerified: {
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
    borderColor: 'rgba(5, 150, 105, 0.28)',
  },
  cardPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.06)',
    borderColor: 'rgba(217, 119, 6, 0.22)',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconVerified: { backgroundColor: 'rgba(5, 150, 105, 0.12)' },
  iconPending: { backgroundColor: 'rgba(217, 119, 6, 0.12)' },
  body: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  titleVerified: { color: '#047857' },
  titlePending: { color: '#B45309' },
  desc: {
    fontSize: 12,
    lineHeight: 17,
    color: lightColors.textSecondary,
  },
});
