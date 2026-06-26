import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { LevouLogo } from '@/src/components/LevouLogo';
import { levouColors } from '@/src/constants/levouBranding';
import { spacing } from '@/src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/welcome');
    }, 2200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <LevouLogo size="splash" style={styles.logo} />
      <Text style={styles.tagline} muted>
        Os melhores leilões. Por menos.
      </Text>
      <ActivityIndicator color={levouColors.purple} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: levouColors.background,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#9ca3af',
  },
  loader: {
    marginTop: spacing.xl,
  },
});
