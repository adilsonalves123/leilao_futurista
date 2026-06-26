import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type AuthMode = 'login' | 'register';

const TABS: { id: AuthMode; label: string; href: '/(auth)/login' | '/(auth)/register' }[] = [
  { id: 'login', label: 'Entrar', href: '/(auth)/login' },
  { id: 'register', label: 'Criar conta', href: '/(auth)/register' },
];

export function AuthModeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const active: AuthMode = pathname.includes('register') ? 'register' : 'login';

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
      <View style={styles.track}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                if (!isActive) router.replace(tab.href);
              }}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {active === 'login'
          ? 'Acesso seguro · participantes verificados'
          : 'Novo participante · cadastro em custódia segura'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: lightColors.accent,
    shadowColor: lightColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.timerRegular,
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: lightColors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
