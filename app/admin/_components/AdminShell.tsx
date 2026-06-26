import { Slot, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { JarvisAdminHost } from '@/components/ai/JarvisAdminHost';
import { AdminSidebar } from './AdminSidebar';
import { adminContentBgWeb, adminTheme } from './adminStyles';

const contentBgStyle =
  Platform.OS === 'web' ? (adminContentBgWeb as object) : { backgroundColor: adminTheme.contentBg };

export function AdminShell() {
  const pathname = usePathname();
  const naLogin = pathname === '/admin/login' || pathname.endsWith('/admin/login');
  const paginaChatSuporte =
    pathname === '/admin/suporte' ||
    pathname === '/admin/suporte/' ||
    pathname.endsWith('/admin/suporte');
  const paginaAssistente =
    pathname === '/admin/assistente' ||
    pathname === '/admin/assistente/' ||
    pathname.endsWith('/admin/assistente');
  const paginaPedidoDetalhe =
    pathname.includes('/admin/pedidos/') && pathname !== '/admin/pedidos' && !pathname.endsWith('/admin/pedidos');
  const paginaArrematadoDetalhe =
    pathname.includes('/admin/arrematados/') &&
    pathname !== '/admin/arrematados' &&
    !pathname.endsWith('/admin/arrematados');
  const paginaDisputaDetalhe =
    pathname.includes('/admin/disputas/') &&
    pathname !== '/admin/disputas' &&
    !pathname.endsWith('/admin/disputas');

  if (naLogin) {
    return (
      <View style={styles.loginRoot}>
        <Slot />
      </View>
    );
  }

  const shell = (content: ReactNode) => (
    <View style={styles.root}>
      <AdminSidebar />
      {content}
      <JarvisAdminHost />
    </View>
  );

  if (paginaChatSuporte || paginaAssistente || paginaPedidoDetalhe || paginaArrematadoDetalhe || paginaDisputaDetalhe) {
    return shell(
      <View style={styles.mainFixed}>
        <View
          style={
            paginaPedidoDetalhe || paginaArrematadoDetalhe || paginaDisputaDetalhe
              ? styles.mainInnerPedido
              : styles.mainInnerSuporte
          }>
          <Slot />
        </View>
      </View>,
    );
  }

  return shell(
    <ScrollView
      style={styles.mainScroll}
      contentContainerStyle={styles.mainContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.mainInner}>
        <Slot />
      </View>
    </ScrollView>,
  );
}

const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    ...contentBgStyle,
    minHeight: '100%' as unknown as number,
  },
  root: {
    flex: 1,
    flexDirection: 'row',
    ...contentBgStyle,
    minHeight: '100%' as unknown as number,
    ...(Platform.OS === 'web'
      ? ({ height: '100vh', maxHeight: '100vh', overflow: 'hidden' } as object)
      : {}),
  },
  mainScroll: { flex: 1, ...contentBgStyle },
  mainContent: { flexGrow: 1 },
  mainFixed: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    ...contentBgStyle,
    ...(Platform.OS === 'web' ? ({ overflow: 'hidden' } as object) : {}),
  },
  mainInner: {
    flex: 1,
    padding: 28,
    maxWidth: 1320,
    width: '100%' as unknown as number,
  },
  mainInnerSuporte: {
    flex: 1,
    minHeight: 0,
    height: '100%' as unknown as number,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    maxWidth: 1400,
    width: '100%' as unknown as number,
    alignSelf: 'center',
    ...(Platform.OS === 'web'
      ? ({
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        } as object)
      : {}),
  },
  mainInnerPedido: {
    flex: 1,
    minHeight: 0,
    height: '100%' as unknown as number,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    maxWidth: 1600,
    width: '100%' as unknown as number,
    alignSelf: 'center',
    ...(Platform.OS === 'web'
      ? ({
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        } as object)
      : {}),
  },
});
