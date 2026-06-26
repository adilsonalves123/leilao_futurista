import { StyleSheet, Text, View } from 'react-native';
import { SocialLoginButton } from './SocialLoginButton';
import type { SocialProvider } from '@/src/lib/auth';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, spacing } from '@/src/theme/tokens';

type SocialLoginSectionProps = {
  onSocial: (provider: SocialProvider) => void;
  socialLoading: SocialProvider | null;
  disabled: boolean;
};

export function SocialLoginSection({
  onSocial,
  socialLoading,
  disabled,
}: SocialLoginSectionProps) {
  const providers: SocialProvider[] = ['google', 'apple', 'facebook'];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLine} />
        <Text style={styles.headerLabel}>Acesso rápido</Text>
        <View style={styles.headerLine} />
      </View>
      <Text style={styles.sub}>
        Continue com sua identidade verificada no ecossistema de leilões
      </Text>
      <View style={styles.buttons}>
        {providers.map((provider) => (
          <SocialLoginButton
            key={provider}
            provider={provider}
            onPress={() => onSocial(provider)}
            loading={socialLoading === provider}
            disabled={disabled && socialLoading !== provider}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: lightColors.divider,
  },
  headerLabel: {
    fontFamily: fonts.timerRegular,
    fontSize: 10,
    letterSpacing: 2,
    color: lightColors.accent,
    textTransform: 'uppercase',
  },
  sub: {
    fontSize: 12,
    color: lightColors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  buttons: {
    gap: spacing.sm,
  },
});
