import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  desativarTokenPushNoSupabase,
  extrairUrlDeepLink,
  lerStatusSyncPush,
  sincronizarTokenPushSeSessaoAtiva,
} from '@/src/services/pushNotifications';
import { openJarvisFromExternal } from '@/src/store/jarvisContext';
import type { PushSyncResult, PushSyncStatus } from '@/src/types/pushNotifications';

type PushContextValue = {
  token: string | null;
  statusSync: PushSyncStatus | null;
  sincronizando: boolean;
  sincronizar: () => Promise<PushSyncResult | null>;
  desativar: () => Promise<void>;
  pushHabilitado: boolean;
};

const PushContext = createContext<PushContextValue | null>(null);

function navegarPorNotificacao(data: Record<string, unknown> | undefined) {
  const url = extrairUrlDeepLink(data);
  const openJarvis = data?.openJarvis === true || data?.openJarvis === 'true';

  if (url) {
    try {
      router.push(url as never);
    } catch (e) {
      console.warn('[push] deep link inválido:', url, e);
    }
  }

  if (openJarvis) {
    setTimeout(() => openJarvisFromExternal(), url ? 400 : 0);
  }
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [statusSync, setStatusSync] = useState<PushSyncStatus | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const pushHabilitado = Platform.OS !== 'web';

  useEffect(() => {
    void lerStatusSyncPush().then(setStatusSync);
  }, []);

  const sincronizar = useCallback(async () => {
    if (!pushHabilitado || !isSupabaseConfigured()) return null;
    setSincronizando(true);
    try {
      const resultado = await sincronizarTokenPushSeSessaoAtiva();
      setStatusSync(resultado);
      if (resultado.ok && resultado.token) {
        tokenRef.current = resultado.token;
        setToken(resultado.token);
      } else if (!resultado.ok) {
        tokenRef.current = null;
        setToken(null);
      }
      return resultado;
    } finally {
      setSincronizando(false);
    }
  }, [pushHabilitado]);

  const desativar = useCallback(async () => {
    const atual = tokenRef.current;
    if (!atual) return;
    await desativarTokenPushNoSupabase(atual);
    tokenRef.current = null;
    setToken(null);
  }, []);

  useEffect(() => {
    if (!pushHabilitado || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void sincronizar();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION')
      ) {
        void sincronizar();
      }
      if (event === 'SIGNED_OUT' && tokenRef.current) {
        void desativarTokenPushNoSupabase(tokenRef.current);
        tokenRef.current = null;
        setToken(null);
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      /* banner nativo já exibido pelo handler */
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      navegarPorNotificacao(data);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void sincronizar();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (!last) return;
      const data = last.notification.request.content.data as Record<string, unknown>;
      navegarPorNotificacao(data);
    });

    return () => {
      authListener.subscription.unsubscribe();
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [pushHabilitado, sincronizar]);

  return (
    <PushContext.Provider
      value={{ token, statusSync, sincronizando, sincronizar, desativar, pushHabilitado }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePushNotifications() {
  const ctx = useContext(PushContext);
  if (!ctx) {
    throw new Error('usePushNotifications deve ser usado dentro de PushNotificationProvider');
  }
  return ctx;
}
