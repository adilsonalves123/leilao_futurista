import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { levouColors } from '@/src/constants/levouBranding';
import { LevouLogo } from '@/src/components/LevouLogo';
import { GoogleLogoIcon } from '@/components/icons/GoogleLogoIcon';
import {
  isUsingMockBackend,
  signInWithSocial,
  signUpWithEmail,
  type SocialProvider,
} from '@/src/lib/auth';

const C = levouColors;

function Campo({
  label,
  ...props
}: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={C.gray400}
        style={styles.fieldInput}
        {...props}
      />
    </View>
  );
}

export default function LevouRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mockMode = isUsingMockBackend();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [signupLoading, setSignupLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const isBusy = signupLoading || socialLoading !== null;

  const enterApp = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const handleSignUp = useCallback(async () => {
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus('As senhas não coincidem.');
      setStatusTone('error');
      return;
    }

    setSignupLoading(true);
    try {
      const result = await signUpWithEmail(email, password, displayName);
      setStatus(result.message);
      setStatusTone(result.ok ? 'success' : 'error');

      if (result.ok && !result.needsEmailConfirmation) {
        setTimeout(enterApp, 800);
      }
    } finally {
      setSignupLoading(false);
    }
  }, [confirmPassword, displayName, email, enterApp, password]);

  const handleSocial = useCallback(
    async (provider: SocialProvider) => {
      setStatus(null);
      setSocialLoading(provider);
      try {
        const result = await signInWithSocial(provider);
        setStatus(result.message);
        setStatusTone(result.ok ? 'success' : 'error');
        if (result.ok) {
          setTimeout(enterApp, 700);
        }
      } finally {
        setSocialLoading(null);
      }
    },
    [enterApp],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>

          <View style={styles.header}>
            <LevouLogo size="auth" style={styles.logo} />
            <Text style={styles.subtitle}>Crie sua conta para começar a arrematar</Text>
          </View>

          {mockMode ? (
            <View style={styles.mockBanner}>
              <Text style={styles.mockBannerText}>Modo demonstração — dados locais</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Campo
              label="Nome exibido"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Seu nome no leilão"
              editable={!isBusy}
            />
            <Campo
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="seu@email.com"
              editable={!isBusy}
            />
            <Campo
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              editable={!isBusy}
            />
            <Campo
              label="Confirmar senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Repita a senha"
              editable={!isBusy}
              onSubmitEditing={handleSignUp}
            />

            <Pressable
              style={[styles.primaryBtn, isBusy && styles.primaryBtnDisabled]}
              onPress={handleSignUp}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Criar conta">
              {signupLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Criar conta</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>Ou continue com</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialCol}>
            {(['google', 'apple'] as SocialProvider[]).map((provider) => (
              <Pressable
                key={provider}
                style={[styles.socialBtn, isBusy && styles.primaryBtnDisabled]}
                onPress={() => handleSocial(provider)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={provider === 'google' ? 'Google' : 'Apple'}>
                {socialLoading === provider ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.socialBtnInner}>
                    {provider === 'google' ? (
                      <View style={styles.googleIconWrap}>
                        <GoogleLogoIcon size={18} />
                      </View>
                    ) : (
                      <Text style={styles.appleIcon}></Text>
                    )}
                    <Text style={styles.socialBtnText}>
                      {provider === 'google' ? 'Continuar com Google' : 'Continuar com Apple'}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {status ? (
            <View
              style={[
                styles.statusBox,
                statusTone === 'success' && styles.statusSuccess,
                statusTone === 'error' && styles.statusError,
              ]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          <Pressable
            style={styles.signInRow}
            onPress={() => router.replace('/(auth)/login')}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Entrar">
            <Text style={styles.signInText}>
              Já tem conta? <Text style={styles.signInLink}>Entrar</Text>
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            Ao criar sua conta, você concorda com as regras de leilão, KYC e custódia segura do
            Levou.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { alignSelf: 'center', marginBottom: 12 },
  subtitle: {
    color: C.gray400,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  mockBanner: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  mockBannerText: {
    color: C.purple,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 20,
    gap: 4,
  },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    color: C.gray400,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#1a1538',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    fontSize: 16,
    color: '#fff',
    minHeight: 48,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: C.purpleDeep,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1f2937' },
  dividerLabel: {
    color: C.gray500,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  socialCol: { gap: 10 },
  socialBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  socialBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  statusText: {
    color: '#e5e7eb',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  signInRow: {
    marginTop: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  signInText: {
    color: C.gray400,
    fontSize: 14,
    textAlign: 'center',
  },
  signInLink: {
    color: C.purple,
    fontWeight: '800',
  },
  legal: {
    marginTop: 12,
    fontSize: 10,
    color: C.gray400,
    textAlign: 'center',
    lineHeight: 15,
  },
});
