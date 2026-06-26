import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWebLayout } from '@/src/hooks/useWebLayout';
import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

type SubScreenLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SubScreenLayout({ title, subtitle, children }: SubScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isWideWeb } = useWebLayout();

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.inner,
          isWideWeb && styles.innerWide,
          { paddingTop: isWideWeb ? appSpacing.lg : insets.top + appSpacing.sm },
        ]}>
        <View style={[styles.header, isWideWeb && styles.headerWide]}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={22} color={appColors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + appSpacing.xxl },
          ]}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appColors.screen },
  inner: { flex: 1 },
  innerWide: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? ({ paddingHorizontal: appSpacing.xl } as object) : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.md,
    paddingHorizontal: appSpacing.lg,
    paddingBottom: appSpacing.md,
    backgroundColor: appColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  headerWide: {
    borderRadius: appRadii.lg,
    marginBottom: appSpacing.md,
    borderWidth: 1,
    borderColor: appColors.border,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: appRadii.pill,
    backgroundColor: appColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: appColors.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: appColors.textMuted, marginTop: 2, lineHeight: 17 },
  content: { paddingHorizontal: appSpacing.lg, paddingTop: appSpacing.lg },
});
