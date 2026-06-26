import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { WebSideNav } from '@/components/web/WebSideNav';
import { useWebLayout } from '@/src/hooks/useWebLayout';
import { registrarAcessoApp } from '@/src/services/appAccessLog';
import { useTranslation } from '@/src/i18n/useTranslation';
import { lightColors } from '@/src/theme/lightTokens';

function CadastrarTabButton({
  children,
  onPress,
  accessibilityState,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
}) {
  const focused = accessibilityState?.selected;
  return (
    <Pressable onPress={onPress} style={styles.cadastrarWrap}>
      <View style={[styles.cadastrarBtn, focused && styles.cadastrarBtnFocused]}>
        <Ionicons name="add" size={28} color="#FFF" />
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const { t, locale } = useTranslation();
  const { isWideWeb } = useWebLayout();

  useEffect(() => {
    registrarAcessoApp();
  }, []);

  const tabs = (
    <Tabs
      key={locale}
      screenOptions={{
        tabBarActiveTintColor: lightColors.accent,
        tabBarInactiveTintColor: lightColors.textMuted,
        tabBarStyle: isWideWeb ? styles.tabBarHidden : styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
        sceneStyle: styles.scene,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leiloes"
        options={{
          title: t('tabs.auctions'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'hammer' : 'hammer-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarIcon: () => null,
          tabBarButton: (props) => <CadastrarTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="vendor" options={{ href: null }} />
    </Tabs>
  );

  if (isWideWeb) {
    return (
      <View style={styles.webShell}>
        <WebSideNav />
        <View style={styles.webMain}>{tabs}</View>
      </View>
    );
  }

  return tabs;
}

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({ height: '100%', minHeight: '100%', display: 'flex' } as object)
      : {}),
  },
  webMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    ...(Platform.OS === 'web' ? ({ display: 'flex', flexDirection: 'column' } as object) : {}),
  },
  scene: {
    backgroundColor: lightColors.screen,
  },
  tabBarHidden: {
    display: 'none',
    height: 0,
  },
  tabBar: {
    backgroundColor: lightColors.surface,
    borderTopColor: lightColors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: lightColors.cardShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  cadastrarWrap: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cadastrarBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lightColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: lightColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cadastrarBtnFocused: {
    transform: [{ scale: 1.05 }],
  },
});
