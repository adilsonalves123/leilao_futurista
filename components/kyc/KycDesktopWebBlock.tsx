import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://levou.app.br';

export function KycDesktopWebBlock() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={36} color={lightColors.accent} />
      </View>

      <Text style={styles.title}>Cadastro no celular</Text>
      <Text style={styles.body}>
        Por segurança, a verificação facial com selfie ao vivo só pode ser feita no{' '}
        <Text style={styles.bold}>app Levou</Text> ou no navegador do seu smartphone.
      </Text>
      <Text style={styles.bodySecondary}>
        No computador não é possível garantir que a foto seja tirada na hora — isso protege você e
        todos os participantes dos leilões.
      </Text>

      <View style={styles.steps}>
        <View style={styles.step}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepText}>Abra levou.app.br no celular ou baixe o app</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepText}>Faça login com a mesma conta</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>3</Text>
          <Text style={styles.stepText}>Conclua o cadastro KYC com a câmera frontal</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={() => void Linking.openURL(APP_URL)}
        accessibilityRole="link">
        <Ionicons name="open-outline" size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Abrir {APP_URL.replace(/^https?:\/\//, '')}</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => router.back()}
        accessibilityRole="button">
        <Text style={styles.secondaryBtnText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: lightColors.accentMuted,
    borderWidth: 1,
    borderColor: lightColors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: lightColors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: lightColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bodySecondary: {
    fontSize: 13,
    lineHeight: 19,
    color: lightColors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  bold: { fontWeight: '700', color: lightColors.textPrimary },
  steps: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: lightColors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: spacing.md,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: lightColors.accentMuted,
    color: lightColors.accent,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: lightColors.textPrimary,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? ({ paddingTop: 2 } as object) : {}),
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: lightColors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textMuted,
    fontFamily: fonts.timerRegular,
  },
});
