import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { useTranslation } from '@/src/i18n/useTranslation';
import { signOutSupabase } from '@/src/lib/auth';
import { useKyc } from '@/src/store/kycContext';
import { useLanguage } from '@/src/store/languageContext';
import { lightColors } from '@/src/theme/lightTokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { atualizar: atualizarKyc } = useKyc();
  const { rotuloAtual } = useLanguage();
  const [saindo, setSaindo] = useState(false);

  const settings = useMemo(
    () => [
      {
        id: 'notifications',
        icon: 'notifications-outline' as const,
        title: t('settings.notifications'),
        route: '/settings/notificacoes' as const,
      },
      {
        id: 'lang',
        icon: 'language-outline' as const,
        title: t('settings.language'),
        route: '/settings/language' as const,
        value: rotuloAtual,
      },
      {
        id: 'privacy',
        icon: 'eye-outline' as const,
        title: t('settings.privacy'),
        route: '/settings/privacy' as const,
      },
      {
        id: 'security',
        icon: 'finger-print-outline' as const,
        title: t('settings.security'),
        route: '/settings/security' as const,
      },
      {
        id: 'about',
        icon: 'information-circle-outline' as const,
        title: t('settings.about'),
        route: '/settings/about' as const,
      },
    ],
    [t, rotuloAtual],
  );

  const executarLogout = useCallback(async () => {
    setSaindo(true);
    try {
      await signOutSupabase();
      await atualizarKyc();
      router.replace('/(auth)/welcome');
    } catch {
      Alert.alert(t('settings.error'), t('settings.logoutError'));
    } finally {
      setSaindo(false);
    }
  }, [atualizarKyc, router, t]);

  const confirmarLogout = useCallback(() => {
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMessage'), [
      { text: t('settings.cancel'), style: 'cancel' },
      { text: t('settings.logoutConfirm'), style: 'destructive', onPress: () => void executarLogout() },
    ]);
  }, [executarLogout, t]);

  return (
    <SubScreenLayout title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={styles.card}>
          {settings.map((item, index) => (
            <Pressable
              key={item.id}
              style={[styles.row, index < settings.length - 1 && styles.rowBorder]}
              onPress={'route' in item ? () => router.push(item.route) : undefined}
              accessibilityRole="button">
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={20} color={lightColors.accent} />
              </View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {'value' in item && item.value ? (
                <View style={styles.rowTrailing}>
                  <Text style={styles.rowValue}>{item.value}</Text>
                  {'route' in item ? (
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                  ) : null}
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.logoutBtn, saindo && styles.logoutBtnDisabled]}
        onPress={confirmarLogout}
        disabled={saindo}
        accessibilityRole="button"
        accessibilityLabel={t('settings.logout')}>
        {saindo ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          </>
        )}
      </Pressable>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1625' },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: 13, color: '#9CA3AF' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  logoutBtnDisabled: { opacity: 0.65 },
});
