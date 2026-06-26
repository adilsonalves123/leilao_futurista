import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { levouLogo } from '@/src/constants/levouBranding';

export type LevouLogoSize = 'header' | 'splash' | 'auth' | 'about' | 'lock' | 'admin' | 'adminCompact';

const SIZES: Record<LevouLogoSize, { width: number; height: number }> = {
  header: { width: 108, height: 34 },
  splash: { width: 220, height: 70 },
  auth: { width: 172, height: 54 },
  about: { width: 180, height: 56 },
  lock: { width: 160, height: 50 },
  admin: { width: 132, height: 42 },
  adminCompact: { width: 40, height: 40 },
};

type LevouLogoProps = {
  size?: LevouLogoSize;
  style?: StyleProp<ImageStyle>;
};

export function LevouLogo({ size = 'header', style }: LevouLogoProps) {
  return (
    <Image
      source={levouLogo}
      style={[SIZES[size], styles.logo, style]}
      resizeMode="contain"
      accessibilityLabel="Levou"
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'flex-start' },
});
