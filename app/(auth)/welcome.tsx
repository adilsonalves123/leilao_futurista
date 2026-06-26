import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { LevouWelcomeScreen } from './_components/LevouWelcomeScreen';
import { levouColors } from '@/src/constants/levouBranding';
import { signInWithSocial, type SocialProvider } from '@/src/lib/auth';
import { usuarioEstaAutenticado } from '@/src/lib/sessionUser';
import { sincronizarTokenPushSeSessaoAtiva } from '@/src/services/pushNotifications';
import { useSecurity } from '@/src/store/securityContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { marcarSessaoReautenticada } = useSecurity();
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [checandoSessao, setChecandoSessao] = useState(true);

  useEffect(() => {
    usuarioEstaAutenticado()
      .then((logado) => {
        if (logado) {
          router.replace('/(tabs)');
          return;
        }
        setChecandoSessao(false);
      })
      .catch(() => {
        setChecandoSessao(false);
      });
  }, [router]);

  const enterApp = useCallback(() => {
    marcarSessaoReautenticada();
    void sincronizarTokenPushSeSessaoAtiva();
    router.replace('/(tabs)');
  }, [marcarSessaoReautenticada, router]);

  const handleSocial = useCallback(
    async (provider: SocialProvider) => {
      setSocialLoading(provider);
      try {
        const result = await signInWithSocial(provider);
        if (result.ok) {
          setTimeout(enterApp, 700);
          return;
        }
        Alert.alert('Não foi possível entrar', result.message);
      } finally {
        setSocialLoading(null);
      }
    },
    [enterApp],
  );

  if (checandoSessao) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={levouColors.purple} />
      </View>
    );
  }

  return (
    <LevouWelcomeScreen
      onGoogle={() => handleSocial('google')}
      onApple={() => handleSocial('apple')}
      onEmail={() => router.push('/(auth)/login')}
      onRegister={() => router.push('/(auth)/register')}
      socialLoading={socialLoading}
      disabled={socialLoading !== null}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: levouColors.background,
  },
});
