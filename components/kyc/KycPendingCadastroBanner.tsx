import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lightColors } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';

export function KycPendingCadastroBanner() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Ionicons name="document-text-outline" size={22} color={lightColors.accent} />
      <View style={styles.body}>
        <Text style={styles.title}>Verificação de identidade pendente</Text>
        <Text style={styles.desc}>
          Para dar lances ou publicar leilões, conclua o cadastro com CPF e documentos. O mesmo
          cadastro vale para comprar e vender na plataforma.
        </Text>
      </View>
      <Pressable
        style={styles.btn}
        onPress={() => router.push('/kyc/cadastro')}
        accessibilityRole="button"
        accessibilityLabel="Iniciar cadastro completo KYC">
        <Text style={styles.btnText}>Iniciar cadastro KYC</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  body: { gap: 4 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: lightColors.textPrimary,
  },
  desc: {
    fontSize: 12,
    lineHeight: 17,
    color: lightColors.textSecondary,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: lightColors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: spacing.xs,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
