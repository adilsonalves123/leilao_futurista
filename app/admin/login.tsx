import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthField } from '@/app/(auth)/_components/AuthField';
import { LevouLogo } from '@/src/components/LevouLogo';
import { verificarAdminSupabase } from '@/src/lib/adminAuth';
import { limparAdminGate, marcarAdminGateOk } from '@/src/lib/adminGate';
import { isUsingMockBackend, signInWithEmail, signOutSupabase } from '@/src/lib/auth';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { adminStyles, adminContentBgWeb, adminTheme } from './_components/adminStyles';

const PILARES = [
  { icon: 'shield-checkmark-outline' as const, title: 'Escrow protegido', sub: 'Custódia até confirmação' },
  { icon: 'hammer-outline' as const, title: 'Leilões ao vivo', sub: 'Moderação em tempo real' },
  { icon: 'people-outline' as const, title: 'KYC & compliance', sub: 'Verificação de identidade' },
];

export default function AdminLoginScreen() {
  const router = useRouter();
  const mockMode = isUsingMockBackend();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessaoAtual, setSessaoAtual] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || mockMode) return;
    verificarAdminSupabase().then((s) => {
      if (s.logado) {
        setSessaoAtual(s.email);
        setEhAdmin(s.ehAdmin);
        if (!s.ehAdmin && s.diagnostico) {
          setStatus(s.diagnostico);
        }
      }
    });
  }, [mockMode]);

  const irParaPainel = useCallback(async () => {
    await marcarAdminGateOk();
    router.replace('/admin');
  }, [router]);

  const handleLogin = useCallback(async () => {
    setStatus(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }

      const auth = await verificarAdminSupabase();
      if (!auth.ehAdmin) {
        setStatus(
          auth.diagnostico ??
            'Login ok, mas esta conta não é admin. No Supabase: UPDATE public.users SET role = \'admin\' WHERE id = id da sessão (auth.users).',
        );
        setSessaoAtual(auth.email);
        setEhAdmin(false);
        return;
      }

      setEhAdmin(true);
      setSessaoAtual(auth.email);
      await marcarAdminGateOk();
      setStatus('Acesso administrativo liberado.');
      setTimeout(() => {
        router.replace('/admin');
      }, 400);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  const handleSair = useCallback(async () => {
    setLoading(true);
    try {
      await limparAdminGate();
      await signOutSupabase();
      setSessaoAtual(null);
      setEhAdmin(false);
      setEmail('');
      setPassword('');
      setStatus('Sessão encerrada. Entre com o e-mail e senha de administrador.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (mockMode) {
    return (
      <View style={styles.mockPage}>
        <View style={[styles.formPanel, styles.formPanelCentered]}>
          <View style={styles.formHeader}>
            <LevouLogo size="admin" style={styles.formLogo} />
            <Text style={styles.formTitle}>Command</Text>
            <Text style={styles.formSub}>Modo demonstração — sem Supabase</Text>
          </View>
          <Pressable style={adminStyles.btnPrimary} onPress={irParaPainel}>
            <Text style={adminStyles.btnPrimaryText}>Abrir painel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {Platform.OS === 'web' ? (
        <View style={styles.heroPanel}>
          <View style={styles.heroInner}>
            <LevouLogo size="admin" style={styles.heroLogoImage} />
            <Text style={styles.heroTitle}>Command</Text>
            <Text style={styles.heroTagline}>
              Centro de operação da plataforma. Moderação, financeiro e suporte em um só lugar.
            </Text>
            <View style={styles.pilares}>
              {PILARES.map((p) => (
                <View key={p.title} style={styles.pilarRow}>
                  <View style={styles.pilarIcon}>
                    <Ionicons name={p.icon} size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.pilarTitle}>{p.title}</Text>
                    <Text style={styles.pilarSub}>{p.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.formPanel, Platform.OS !== 'web' && styles.formPanelCentered]}>
        <View style={styles.formHeader}>
          {Platform.OS !== 'web' ? (
            <LevouLogo size="admin" style={styles.formLogo} />
          ) : null}
          <Text style={styles.formTitle}>Entrar no admin</Text>
          <Text style={styles.formSub}>
            Conta com role admin no Supabase. Sessão separada do app mobile.
          </Text>
        </View>

        {sessaoAtual ? (
          <View style={adminStyles.alertInfo}>
            <Text style={adminStyles.alertInfoText}>
              Sessão ativa: {sessaoAtual}
              {ehAdmin ? ' (admin)' : ' (sem permissão admin)'}
            </Text>
            {ehAdmin ? (
              <Pressable style={styles.linkBtn} onPress={irParaPainel}>
                <Text style={styles.linkBtnText}>Continuar para o painel</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.linkBtn} onPress={handleSair} disabled={loading}>
              <Text style={styles.linkBtnSair}>Sair e entrar com outra conta</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <AuthField
            label="E-mail admin"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="admin@seudominio.com"
            editable={!loading}
          />
          <AuthField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
            editable={!loading}
          />
          <Pressable
            style={[adminStyles.btnPrimary, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Entrar no painel admin">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={adminStyles.btnPrimaryText}>Entrar no painel</Text>
            )}
          </Pressable>
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%' as unknown as number,
    ...(Platform.OS === 'web' ? ({ height: '100vh' } as object) : {}),
  },
  mockPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? (adminContentBgWeb as object) : { backgroundColor: adminTheme.contentBg }),
  },
  heroPanel: {
    flex: 1,
    backgroundColor: adminTheme.navy,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 40,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(160deg, #0A192F 0%, #112240 50%, #0A192F 100%)',
        } as object)
      : {}),
  },
  heroInner: { maxWidth: 420 },
  heroLogoImage: { marginBottom: 24 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  heroTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
    marginBottom: 32,
  },
  pilares: { gap: 16 },
  pilarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pilarIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilarTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  pilarSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  formPanel: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    justifyContent: 'center',
    padding: 32,
    ...(Platform.OS === 'web' ? (adminContentBgWeb as object) : { backgroundColor: adminTheme.contentBg }),
  },
  formPanelCentered: {
    alignSelf: 'center',
    width: '100%' as unknown as number,
    maxWidth: 440,
  },
  formHeader: { marginBottom: 28 },
  formLogo: { marginBottom: 16 },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    letterSpacing: -0.4,
  },
  formSub: {
    fontSize: 14,
    color: adminTheme.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: adminTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminTheme.border,
    padding: 24,
    gap: 4,
    ...(Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadowMd } as object) : {}),
  },
  status: {
    marginTop: 16,
    fontSize: 13,
    color: adminTheme.neon,
    lineHeight: 18,
  },
  linkBtn: { marginTop: 10 },
  linkBtnText: { color: adminTheme.neon, fontWeight: '700', fontSize: 14 },
  linkBtnSair: { color: adminTheme.danger, fontWeight: '600', fontSize: 13 },
});
