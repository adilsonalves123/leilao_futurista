import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import type { AdminPermission } from '@/src/admin/types';
import { verificarAdminSupabase } from '@/src/lib/adminAuth';
import { limparAdminGate } from '@/src/lib/adminGate';
import { signOutSupabase } from '@/src/lib/auth';
import { isMockMode } from '@/src/lib/mockMode';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { LevouLogo } from '@/src/components/LevouLogo';
import {
  badgePorRota,
  obterContagensOperacionaisAdmin,
  type AdminOpsCounts,
} from '@/src/services/adminOpsCounts';
import { adminTheme } from './adminTheme';

const OPS_REFRESH_MS = 60_000;

const SIDEBAR_WIDTH_EXPANDED = 248;
const SIDEBAR_WIDTH_COLLAPSED = 72;

type MenuItem = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  permissao?: AdminPermission;
  badge?: number;
};

type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};

const MENU_GRUPOS: MenuGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'pulse-outline', permissao: 'financeiro' },
      {
        href: '/admin/destaques',
        label: 'Ganhos destaques',
        icon: 'sparkles-outline',
        permissao: 'financeiro',
      },
      {
        href: '/admin/loja-oficial',
        label: 'Loja Oficial',
        icon: 'storefront-outline',
        permissao: 'leiloes',
      },
      { href: '/admin/leiloes', label: 'Leilões', icon: 'hammer-outline', permissao: 'leiloes' },
      {
        href: '/admin/notificacoes',
        label: 'Notificações',
        icon: 'notifications-outline',
        permissao: 'leiloes',
      },
      {
        href: '/admin/arrematados',
        label: 'Arrematados',
        icon: 'trophy-outline',
        permissao: 'leiloes',
      },
    ],
  },
  {
    id: 'pessoas',
    label: 'Pessoas',
    items: [
      { href: '/admin/usuarios', label: 'Usuários', icon: 'people-outline', permissao: 'usuarios' },
      { href: '/admin/kyc', label: 'Verificação KYC', icon: 'id-card-outline', permissao: 'usuarios' },
    ],
  },
  {
    id: 'plataforma',
    label: 'Plataforma',
    items: [
      {
        href: '/admin/banners',
        label: 'Patrocínios',
        icon: 'flag-outline',
        permissao: 'banners',
      },
      {
        href: '/admin/policies',
        label: 'Termos e Políticas',
        icon: 'document-text-outline',
        permissao: 'policies',
      },
    ],
  },
  {
    id: 'suporte',
    label: 'Suporte',
    items: [
      {
        href: '/admin/pedidos',
        label: 'Pedidos',
        icon: 'receipt-outline',
        permissao: 'suporte',
      },
      {
        href: '/admin/disputas',
        label: 'Disputas',
        icon: 'scale-outline',
        permissao: 'suporte',
      },
      {
        href: '/admin/suporte',
        label: 'Chat Suporte',
        icon: 'headset-outline',
        permissao: 'suporte',
      },
    ],
  },
  {
    id: 'inteligencia',
    label: 'Inteligência',
    items: [
      {
        href: '/admin/assistente',
        label: 'Jarvis · Adilson',
        icon: 'sparkles-outline',
        permissao: 'suporte',
      },
    ],
  },
  {
    id: 'equipe',
    label: 'Equipe',
    items: [{ href: '/admin/equipe', label: 'Colaboradores', icon: 'shield-outline' }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin' || pathname === '/admin/';
  }
  return pathname.startsWith(href);
}

const sidebarWebExtras =
  Platform.OS === 'web'
    ? ({
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        transitionProperty: 'width, min-width, max-width, padding',
        transitionDuration: '280ms',
        transitionTimingFunction: 'ease',
      } as object)
    : {};

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { colaboradorAtivo, temPermissao } = useAdminSession();
  const usaSupabase = isSupabaseConfigured() && !isMockMode();
  const [supabaseEmail, setSupabaseEmail] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [opsCounts, setOpsCounts] = useState<AdminOpsCounts | null>(null);

  const carregarContagens = useCallback(async () => {
    const counts = await obterContagensOperacionaisAdmin();
    setOpsCounts(counts);
  }, []);

  useEffect(() => {
    if (!usaSupabase) return;
    verificarAdminSupabase().then((s) => {
      setSupabaseEmail(s.logado ? s.email : null);
    });
  }, [pathname, usaSupabase]);

  useEffect(() => {
    carregarContagens();
    const timer = setInterval(carregarContagens, OPS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [carregarContagens, pathname]);

  const gruposVisiveis = MENU_GRUPOS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.permissao || temPermissao(item.permissao)),
  })).filter((g) => g.items.length > 0);

  const largura = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const sidebarStyle: ViewStyle[] = [
    styles.sidebar,
    {
      width: largura,
      minWidth: largura,
      maxWidth: largura,
      paddingHorizontal: isCollapsed ? 10 : 14,
    },
  ];

  const displayName = usaSupabase
    ? supabaseEmail?.split('@')[0] ?? 'Admin'
    : colaboradorAtivo.nome.split(' ')[0];

  return (
    <View style={sidebarStyle}>
      <View style={[styles.topBar, isCollapsed && styles.topBarCollapsed]}>
        {!isCollapsed ? (
          <View style={styles.brand}>
            <LevouLogo size="admin" style={styles.brandLogo} />
            <Text style={styles.brandSub}>Command</Text>
          </View>
        ) : (
          <LevouLogo size="adminCompact" style={styles.brandLogoCollapsed} />
        )}
        <Pressable
          style={styles.toggleBtn}
          onPress={() => setIsCollapsed((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          hitSlop={8}>
          <Ionicons
            name={isCollapsed ? 'menu-outline' : 'chevron-back'}
            size={20}
            color={adminTheme.sidebarTextMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {gruposVisiveis.map((grupo) => (
          <View key={grupo.id} style={styles.group}>
            {!isCollapsed ? <Text style={styles.groupLabel}>{grupo.label}</Text> : null}
            <View style={styles.groupItems}>
              {grupo.items.map((item) => {
                const active = isActive(pathname, item.href);
                const badge = opsCounts ? badgePorRota(item.href, opsCounts) : item.badge;
                return (
                  <Pressable
                    key={item.href}
                    style={[
                      styles.navItem,
                      isCollapsed && styles.navItemCollapsed,
                      active && styles.navItemActive,
                    ]}
                    onPress={() => router.push(item.href as never)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    title={Platform.OS === 'web' && isCollapsed ? item.label : undefined}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? '#FFFFFF' : adminTheme.sidebarTextMuted}
                    />
                    {!isCollapsed ? (
                      <>
                        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                          {item.label}
                        </Text>
                        {badge != null && badge > 0 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {badge > 99 ? '99+' : badge}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : badge != null && badge > 0 ? (
                      <View style={styles.badgeDot} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, isCollapsed && styles.footerCollapsed]}>
        {!isCollapsed ? (
          <>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      !supabaseEmail && usaSupabase && styles.statusDotOff,
                    ]}
                  />
                  <Text style={styles.statusLabel}>
                    {usaSupabase
                      ? supabaseEmail
                        ? 'Conectado'
                        : 'Sem sessão'
                      : 'Demonstração'}
                  </Text>
                </View>
              </View>
            </View>
            {usaSupabase ? (
              <Pressable
                style={styles.logoutBtn}
                onPress={async () => {
                  await limparAdminGate();
                  await signOutSupabase();
                  setSupabaseEmail(null);
                  router.replace('/admin/login');
                }}>
                <Ionicons name="log-out-outline" size={16} color={adminTheme.sidebarTextMuted} />
                <Text style={styles.logoutText}>Sair</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            style={styles.avatarCollapsed}
            onPress={() => setIsCollapsed(false)}
            accessibilityLabel="Expandir menu">
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
    backgroundColor: adminTheme.navy,
    borderRightWidth: 1,
    borderRightColor: adminTheme.sidebarBorder,
    paddingTop: 16,
    paddingBottom: 12,
    ...sidebarWebExtras,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
    gap: 8,
  },
  topBarCollapsed: {
    flexDirection: 'column',
    gap: 12,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  brandLogo: { flexShrink: 0 },
  brandLogoCollapsed: { alignSelf: 'center' },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
    color: adminTheme.sidebarTextMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navScroll: { flex: 1, minHeight: 0 },
  navScrollContent: { paddingBottom: 8 },
  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: adminTheme.sidebarTextMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 10,
    opacity: 0.85,
  },
  groupItems: { gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: 2,
    position: 'relative',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 0,
    minHeight: 44,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: adminTheme.sidebarTextMuted,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: adminTheme.live,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminTheme.live,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: adminTheme.sidebarBorder,
    paddingTop: 14,
    paddingHorizontal: 4,
    gap: 10,
  },
  footerCollapsed: {
    alignItems: 'center',
    paddingTop: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCollapsed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  userMeta: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: '600', color: adminTheme.sidebarText },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: adminTheme.success,
  },
  statusDotOff: { backgroundColor: adminTheme.sidebarTextMuted },
  statusLabel: {
    fontSize: 10,
    color: adminTheme.sidebarTextMuted,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminTheme.sidebarTextMuted,
  },
});
