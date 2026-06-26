import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LevouLogo } from '@/src/components/LevouLogo';
import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

type NavItem = {
  href: '/(tabs)' | '/(tabs)/leiloes' | '/(tabs)/create' | '/(tabs)/wallet' | '/(tabs)/profile';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  match: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/(tabs)',
    label: 'Início',
    icon: 'home-outline',
    iconFocused: 'home',
    match: (p) =>
      p === '/' ||
      p === '/(tabs)' ||
      (!p.includes('leiloes') &&
        !p.includes('wallet') &&
        !p.includes('profile') &&
        !p.includes('create') &&
        (p.endsWith('/index') || !p.includes('/(tabs)/'))),
  },
  {
    href: '/(tabs)/leiloes',
    label: 'Leilões',
    icon: 'hammer-outline',
    iconFocused: 'hammer',
    match: (p) => p.includes('leiloes'),
  },
  {
    href: '/(tabs)/wallet',
    label: 'Carteira',
    icon: 'wallet-outline',
    iconFocused: 'wallet',
    match: (p) => p.includes('wallet'),
  },
  {
    href: '/(tabs)/profile',
    label: 'Mais',
    icon: 'menu-outline',
    iconFocused: 'menu',
    match: (p) => p.includes('profile'),
  },
];

export function WebSideNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <LevouLogo size="header" />
        <Text style={styles.brandSub}>Leilões com confiança</Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Pressable
              key={item.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Ionicons
                name={active ? item.iconFocused : item.icon}
                size={20}
                color={active ? appColors.accent : appColors.textSecondary}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
        onPress={() => router.push('/(tabs)/create')}
        accessibilityRole="button"
        accessibilityLabel="Anunciar item">
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.createBtnText}>Anunciar</Text>
      </Pressable>

      <Text style={styles.footer}>levou.app.br</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    flexShrink: 0,
    paddingHorizontal: appSpacing.lg,
    paddingTop: appSpacing.xl,
    paddingBottom: appSpacing.lg,
    borderRightWidth: 1,
    borderRightColor: appColors.border,
    backgroundColor: appColors.surface,
    ...(Platform.OS === 'web'
      ? ({ height: '100%', minHeight: '100%' } as object)
      : { flex: 1 }),
  },
  brand: { marginBottom: appSpacing.xxl, gap: 4 },
  brandSub: { fontSize: 12, color: appColors.textMuted, fontWeight: '500', marginTop: 4 },
  nav: { gap: 6, flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: appRadii.md,
  },
  navItemActive: {
    backgroundColor: appColors.accentMuted,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.textSecondary,
  },
  navLabelActive: {
    color: appColors.accent,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: appColors.accent,
    borderRadius: appRadii.pill,
    paddingVertical: 14,
    marginBottom: appSpacing.lg,
    shadowColor: appColors.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  createBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  footer: {
    fontSize: 11,
    color: appColors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
