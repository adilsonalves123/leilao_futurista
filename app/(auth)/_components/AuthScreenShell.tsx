import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { verificarRedeSupabase } from '@/src/lib/auth';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuctionGridOverlay } from './AuctionGridOverlay';
import { AuthModeTabs } from './AuthModeTabs';
import { BrandHeaderLight } from './BrandHeaderLight';
import { FluidLightBackground } from './FluidLightBackground';
import { lightColors } from '@/src/theme/lightTokens';
import { spacing } from '@/src/theme/tokens';

type AuthScreenShellProps = PropsWithChildren<{
  status?: string | null;
  statusTone?: 'info' | 'success' | 'error';
  mockMode?: boolean;
  footer?: ReactNode;
}>;

export function AuthScreenShell({
  children,
  status,
  statusTone = 'info',
  mockMode,
  footer,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();
  const [redeOk, setRedeOk] = useState<boolean | null>(mockMode ? true : null);
  const [redeMsg, setRedeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (mockMode) return;

    let ativo = true;
    verificarRedeSupabase().then((r) => {
      if (!ativo) return;
      setRedeOk(r.ok);
      if (!r.ok) setRedeMsg(r.message);
    });

    return () => {
      ativo = false;
    };
  }, [mockMode]);

  return (
    <View style={styles.root}>
      <FluidLightBackground />
      <AuctionGridOverlay />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)}>
            <BrandHeaderLight />
          </Animated.View>

          <AuthModeTabs />

          {mockMode ? (
            <View style={styles.mockBanner}>
              <Text style={styles.mockBannerText}>
                Modo demonstração — dados locais (sem Supabase)
              </Text>
            </View>
          ) : null}

          {!mockMode && redeOk === null ? (
            <View style={styles.redeChecking}>
              <ActivityIndicator size="small" color={lightColors.accent} />
              <Text style={styles.redeCheckingText}>Verificando conexão com Supabase…</Text>
            </View>
          ) : null}

          {!mockMode && redeOk === false && redeMsg ? (
            <View style={styles.redeErro}>
              <Text style={styles.redeErroTitle}>Sem conexão com o servidor</Text>
              <Text style={styles.redeErroText}>{redeMsg}</Text>
            </View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(100).duration(450)}>
            {children}
          </Animated.View>

          {status ? (
            <Animated.View
              entering={FadeIn.duration(280)}
              style={[
                styles.statusPill,
                statusTone === 'success' && styles.statusSuccess,
                statusTone === 'error' && styles.statusError,
              ]}>
              <Text style={styles.statusText}>{status}</Text>
            </Animated.View>
          ) : null}

          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  mockBanner: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  mockBannerText: {
    fontSize: 11,
    color: lightColors.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
  redeChecking: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  redeCheckingText: {
    fontSize: 11,
    color: lightColors.textMuted,
  },
  redeErro: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 0, 122, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.3)',
  },
  redeErroTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: spacing.xs,
  },
  redeErroText: {
    fontSize: 11,
    color: lightColors.textSecondary,
    lineHeight: 16,
  },
  statusPill: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  statusSuccess: {
    backgroundColor: 'rgba(5, 255, 155, 0.1)',
    borderColor: 'rgba(5, 255, 155, 0.35)',
  },
  statusError: {
    backgroundColor: 'rgba(255, 0, 122, 0.08)',
    borderColor: 'rgba(255, 0, 122, 0.25)',
  },
  statusText: {
    fontSize: 12,
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
