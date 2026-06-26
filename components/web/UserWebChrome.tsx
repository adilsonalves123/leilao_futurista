import { usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useWebLayout } from '@/src/hooks/useWebLayout';
import { appColors } from '@/src/theme/lightTokens';
import { WEB_GRADIENT_BG, WEB_LAYOUT } from '@/src/theme/webLayout';

type Props = {
  children: ReactNode;
};

function isAuthPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/welcome' ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/(auth)')
  );
}

const outerWebStyle =
  Platform.OS === 'web'
    ? ({
        minHeight: '100vh',
        height: '100%',
        width: '100%',
        backgroundColor: WEB_GRADIENT_BG,
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.12) 0%, transparent 55%), linear-gradient(180deg, #EEF2FF 0%, #F8F9FD 50%, #F3F4F8 100%)',
        boxSizing: 'border-box',
      } as object)
    : {};

const outerWideWebStyle =
  Platform.OS === 'web'
    ? ({
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
      } as object)
    : {};

const frameWideWebStyle =
  Platform.OS === 'web'
    ? ({
        width: '100%',
        maxWidth: WEB_LAYOUT.maxContentWidth,
        minHeight: 'calc(100vh - 32px)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow:
          '0 24px 64px rgba(26, 31, 54, 0.12), 0 0 0 1px rgba(124, 58, 237, 0.06)',
        display: 'flex',
        flexDirection: 'column',
      } as object)
    : {};

const frameNarrowWebStyle =
  Platform.OS === 'web'
    ? ({
        width: '100%',
        minHeight: '100vh',
        borderRadius: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      } as object)
    : {};

const authFullBleedStyle =
  Platform.OS === 'web'
    ? ({
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      } as object)
    : {};

export function UserWebChrome({ children }: Props) {
  const pathname = usePathname();
  const { isWeb, isWideWeb } = useWebLayout();

  const isAdmin = pathname.startsWith('/admin');
  if (!isWeb || isAdmin) {
    return <>{children}</>;
  }

  if (isAuthPath(pathname)) {
    return (
      <View style={[styles.outer, outerWebStyle, authFullBleedStyle]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.outer, outerWebStyle, isWideWeb ? outerWideWebStyle : null]}>
      <View
        style={[
          styles.frame,
          { backgroundColor: appColors.screen },
          isWideWeb ? frameWideWebStyle : frameNarrowWebStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  frame: {
    flex: 1,
    width: '100%',
  },
});
