import { Redirect, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { verificarAdminSupabase } from '@/src/lib/adminAuth';
import { adminGateEstaOk, marcarAdminGateOk } from '@/src/lib/adminGate';
import { isMockMode } from '@/src/lib/mockMode';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { adminC } from './adminStyles';

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const naLogin = pathname === '/admin/login' || pathname.endsWith('/admin/login');
  const [pronto, setPronto] = useState(false);
  const [gateOk, setGateOk] = useState(false);

  useEffect(() => {
    if (isMockMode() || !isSupabaseConfigured()) {
      setGateOk(true);
      setPronto(true);
      return;
    }
    Promise.all([adminGateEstaOk(), verificarAdminSupabase()]).then(async ([ok, auth]) => {
      if (auth.ehAdmin && !ok) {
        await marcarAdminGateOk();
        setGateOk(true);
      } else {
        setGateOk(ok);
      }
      setPronto(true);
    });
  }, [pathname, naLogin]);

  if (isMockMode() || !isSupabaseConfigured()) {
    return <>{children}</>;
  }

  if (!pronto) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={adminC.accent} />
      </View>
    );
  }

  if (!naLogin && !gateOk) {
    return <Redirect href="/admin/login" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminC.bg,
    minHeight: '100%' as unknown as number,
  },
});
