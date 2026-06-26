import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { usuarioEstaAutenticado } from '@/src/lib/sessionUser';
import { levouColors } from '@/src/constants/levouBranding';
import { sincronizarTokenPushSeSessaoAtiva } from '@/src/services/pushNotifications';

/**
 * Bootstrap: usuário logado → Home; caso contrário → Welcome.
 * Supabase persiste sessão via AsyncStorage; mock também persiste localmente.
 */
export default function Index() {
  const [destino, setDestino] = useState<'tabs' | 'welcome' | null>(null);

  useEffect(() => {
    usuarioEstaAutenticado()
      .then(async (logado) => {
        if (logado) {
          await sincronizarTokenPushSeSessaoAtiva();
        }
        setDestino(logado ? 'tabs' : 'welcome');
      })
      .catch(() => {
        setDestino('welcome');
      });
  }, []);

  if (destino === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={levouColors.purple} />
      </View>
    );
  }

  return <Redirect href={destino === 'tabs' ? '/(tabs)' : '/(auth)/welcome'} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: levouColors.background,
  },
});
