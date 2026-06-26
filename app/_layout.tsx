import {
  Orbitron_400Regular,
  Orbitron_700Bold,
  useFonts,
} from '@expo-google-fonts/orbitron';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { BiometricAppGate } from '@/src/components/BiometricAppGate';
import { PushNotificationProvider } from '@/src/components/PushNotificationProvider';
import { JarvisGlobalHost } from '@/components/ai/JarvisGlobalHost';
import { UserWebChrome } from '@/components/web/UserWebChrome';
import { JarvisProvider } from '@/src/store/jarvisContext';
import { BannersProvider } from '@/src/store/bannersContext';
import { OperationsProvider } from '@/src/store/operationsStore';
import { KycProvider } from '@/src/store/kycContext';
import { LanguageProvider } from '@/src/store/languageContext';
import { PrivacyProvider } from '@/src/store/privacyContext';
import { SecurityProvider } from '@/src/store/securityContext';
import { ProfileProvider } from '@/src/store/profileContext';
import { colors } from '@/src/theme/tokens';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const LevouTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.glass,
    primary: colors.neonCyan,
    text: colors.textPrimary,
    border: colors.glassBorder,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
  });

  useEffect(() => {
    if (error) {
      console.warn('[fonts] Falha ao carregar fontes Orbitron:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Evita splash infinito se a fonte travar no dispositivo
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <KeyboardProvider>
    <OperationsProvider>
      <BannersProvider>
      <LanguageProvider>
      <PrivacyProvider>
      <SecurityProvider>
      <BiometricAppGate>
      <ProfileProvider>
      <KycProvider>
      <PushNotificationProvider>
      <ThemeProvider value={LevouTheme}>
        <StatusBar style="light" />
        <JarvisProvider>
          <UserWebChrome>
            <Stack
              screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.neonCyan,
                contentStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
              }}
            />
          </UserWebChrome>
          <JarvisGlobalHost />
        </JarvisProvider>
      </ThemeProvider>
      </PushNotificationProvider>
      </KycProvider>
      </ProfileProvider>
      </BiometricAppGate>
      </SecurityProvider>
      </PrivacyProvider>
      </LanguageProvider>
      </BannersProvider>
    </OperationsProvider>
    </KeyboardProvider>
  );
}
