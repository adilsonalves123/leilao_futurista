import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '@/src/i18n/useTranslation';
import { LevouLogo } from '@/src/components/LevouLogo';
import { signOutSupabase } from '@/src/lib/auth';
import { levouColors } from '@/src/constants/levouBranding';
import { usuarioEstaAutenticado } from '@/src/lib/sessionUser';
import { estaAppDesbloqueado, useSecurity } from '@/src/store/securityContext';
import { lightColors } from '@/src/theme/lightTokens';

type Props = {
  children: ReactNode;
};

function isRotaAutenticacao(pathname: string): boolean {
  return (
    pathname.includes('/login') ||
    pathname.includes('/welcome') ||
    pathname.includes('/register') ||
    pathname.startsWith('/(auth)')
  );
}

/** Painel admin tem login próprio (AdminAuthGate) — não exige desbloqueio do app mobile. */
function isRotaAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function BiometricAppGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const {
    carregando: carregandoSeguranca,
    hardwareDisponivel,
    biometriaCadastrada,
    rotuloBiometria,
    solicitarBiometria,
    marcarSessaoReautenticada,
    limparSessaoReautenticada,
  } = useSecurity();

  const [logado, setLogado] = useState<boolean | null>(null);
  const [tentando, setTentando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [, forcarRender] = useState(0);

  const appStateRef = useRef(AppState.currentState);
  const biometriaEmAndamento = useRef(false);

  const biometriaDisponivel = hardwareDisponivel && biometriaCadastrada;
  const emRotaAuth = isRotaAutenticacao(pathname);
  const emRotaAdmin = isRotaAdmin(pathname);
  const desbloqueado = estaAppDesbloqueado();

  const verificarSessao = useCallback(async () => {
    try {
      const autenticado = await usuarioEstaAutenticado();
      setLogado(autenticado);
      return autenticado;
    } catch {
      setLogado(false);
      return false;
    }
  }, []);

  const notificarDesbloqueio = useCallback(() => {
    forcarRender((n) => n + 1);
  }, []);

  const desbloquear = useCallback(async () => {
    if (biometriaEmAndamento.current || estaAppDesbloqueado()) return true;

    biometriaEmAndamento.current = true;
    setTentando(true);
    try {
      const ok = await solicitarBiometria(t('security.unlockPrompt'));
      if (ok) {
        marcarSessaoReautenticada();
        notificarDesbloqueio();
      }
      return ok;
    } finally {
      biometriaEmAndamento.current = false;
      setTentando(false);
    }
  }, [marcarSessaoReautenticada, notificarDesbloqueio, solicitarBiometria, t]);

  const sairDaConta = useCallback(async () => {
    if (saindo) return;
    setSaindo(true);
    try {
      await signOutSupabase();
      limparSessaoReautenticada();
      setLogado(false);
      notificarDesbloqueio();
      router.replace('/(auth)/welcome');
    } finally {
      setSaindo(false);
    }
  }, [limparSessaoReautenticada, notificarDesbloqueio, router, saindo]);

  const irParaReauthSenha = useCallback(() => {
    router.replace('/(auth)/login?reauth=1' as never);
  }, [router]);

  useEffect(() => {
    void verificarSessao();
  }, [verificarSessao]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogado((atual) => (atual === null ? false : atual));
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const saiuParaBackground =
        appStateRef.current === 'background' && nextState === 'active';

      appStateRef.current = nextState;

      if (!saiuParaBackground || biometriaEmAndamento.current) {
        return;
      }

      void verificarSessao().then((autenticado) => {
        if (!autenticado) return;
        limparSessaoReautenticada();
        notificarDesbloqueio();
      });
    });

    return () => sub.remove();
  }, [verificarSessao, limparSessaoReautenticada, notificarDesbloqueio]);

  const mostrarCarregamento = carregandoSeguranca || logado === null;
  const mostrarBloqueio =
    logado === true &&
    !emRotaAuth &&
    !emRotaAdmin &&
    !desbloqueado &&
    !carregandoSeguranca;
  const emExpoGo = Constants.appOwnership === 'expo';
  const iconeBiometria =
    rotuloBiometria === 'Face ID' ? ('scan-outline' as const) : ('finger-print' as const);

  return (
    <>
      {children}

      {mostrarCarregamento ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={lightColors.accent} />
        </View>
      ) : null}

      {mostrarBloqueio ? (
        <View style={styles.overlay}>
          <View style={styles.lockCard}>
            <LevouLogo size="lock" style={styles.logo} />
            <View style={styles.iconCircle}>
              <Ionicons
                name={biometriaDisponivel ? iconeBiometria : 'lock-closed-outline'}
                size={32}
                color={lightColors.accent}
              />
            </View>
            <Text style={styles.lockTitle}>{t('security.unlockTitle')}</Text>
            <Text style={styles.lockSubtitle}>
              {biometriaDisponivel
                ? Platform.OS === 'ios' && rotuloBiometria === 'Face ID'
                  ? t('security.unlockSubtitleFaceIdIos')
                  : t('security.unlockSubtitle', { type: rotuloBiometria })
                : t('security.unlockPasswordSubtitle')}
            </Text>
            {emExpoGo && biometriaDisponivel ? (
              <Text style={styles.lockHint}>{t('security.unlockExpoGoHint')}</Text>
            ) : null}

            {biometriaDisponivel ? (
              <Pressable
                style={[styles.btn, tentando && styles.btnDisabled]}
                onPress={() => void desbloquear()}
                disabled={tentando}>
                {tentando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>
                    {rotuloBiometria === 'Face ID'
                      ? t('security.unlockFaceIdButton')
                      : t('security.tryAgain')}
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable style={styles.btn} onPress={irParaReauthSenha}>
                <Text style={styles.btnText}>{t('security.unlockWithPassword')}</Text>
              </Pressable>
            )}

            {biometriaDisponivel ? (
              <Pressable style={styles.btnLink} onPress={irParaReauthSenha} disabled={tentando}>
                <Text style={styles.btnLinkText}>{t('security.unlockWithPassword')}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.btnOutline, saindo && styles.btnDisabled]}
              onPress={() => void sairDaConta()}
              disabled={saindo || tentando}>
              {saindo ? (
                <ActivityIndicator color={lightColors.accent} />
              ) : (
                <Text style={styles.btnOutlineText}>{t('security.signOut')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: levouColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  logo: { alignSelf: 'center', marginBottom: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1625',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  lockHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  btn: {
    width: '100%',
    backgroundColor: lightColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnLink: {
    marginTop: 10,
    paddingVertical: 8,
  },
  btnLinkText: {
    color: lightColors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  btnOutline: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  btnOutlineText: { color: lightColors.accent, fontSize: 15, fontWeight: '700' },
});
