import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/i18n/useTranslation';
import type { TranslationKey } from '@/src/i18n/translations';
import { useKyc } from '@/src/store/kycContext';
import { useProfile } from '@/src/store/profileContext';
import type { StatusVerificacao } from '@/src/types/database';
import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

type MenuItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  route?: string;
};

function MenuSection({
  title,
  items,
  onPress,
}: {
  title: string;
  items: MenuItem[];
  onPress: (route: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.menuRow, index < items.length - 1 && styles.menuRowBorder]}
            onPress={() => item.route && onPress(item.route)}
            accessibilityRole="button">
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={20} color={appColors.accent} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={appColors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const KYC_STATUS_KEYS: Record<StatusVerificacao, TranslationKey> = {
  pendente: 'kyc.pendente',
  em_analise: 'kyc.em_analise',
  aprovado: 'kyc.aprovado',
  rejeitado: 'kyc.rejeitado',
};

function displayUserName(nomeCompleto: string | null | undefined, email: string | null | undefined): string {
  const nome = nomeCompleto?.trim();
  if (nome) return nome.split(' ')[0] ?? nome;
  const mail = email?.trim();
  if (mail) return mail.split('@')[0] ?? 'Visitante';
  return 'Visitante';
}

export default function MaisTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { avatarUri } = useProfile();
  const { perfil, podeDarLance: kycAprovado } = useKyc();
  const { t } = useTranslation();

  const userName = displayUserName(perfil?.nomeCompleto, perfil?.email);

  const statusLabel = perfil
    ? t(KYC_STATUS_KEYS[perfil.statusVerificacao])
    : t('kyc.pendente');

  const sellerItems = useMemo<MenuItem[]>(
    () => [
      { id: 'listings', icon: 'cube-outline', title: t('profile.myListings'), route: '/my-listings' },
      { id: 'sales', icon: 'cash-outline', title: t('profile.mySales'), route: '/my-sales' },
    ],
    [t],
  );

  const buyerItems = useMemo<MenuItem[]>(
    () => [
      { id: 'bids', icon: 'hammer-outline', title: t('profile.myBids'), route: '/my-bids' },
      { id: 'favorites', icon: 'heart-outline', title: t('profile.favorites'), route: '/favorites' },
      { id: 'history', icon: 'time-outline', title: t('profile.history'), route: '/history' },
    ],
    [t],
  );

  const generalItems = useMemo<MenuItem[]>(
    () => [
      { id: 'kyc', icon: 'shield-checkmark-outline', title: t('profile.kycRegistration'), route: '/kyc' },
      { id: 'notifications', icon: 'notifications-outline', title: t('profile.notifications'), route: '/notifications' },
      { id: 'reviews', icon: 'star-outline', title: t('profile.reviews'), route: '/reviews' },
      { id: 'help', icon: 'help-circle-outline', title: t('profile.help'), route: '/help' },
      { id: 'settings', icon: 'settings-outline', title: t('profile.settings'), route: '/settings' },
    ],
    [t],
  );

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + appSpacing.md, paddingBottom: insets.bottom + appSpacing.xxl },
      ]}>
      <View style={styles.identityCard}>
        <View style={styles.avatarRing}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.greeting}>Olá,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Pressable
            style={styles.profileLink}
            onPress={() => router.push('/my-profile' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.myProfile')}>
            <Text style={styles.profileLinkText}>{t('profile.myProfile')}</Text>
            <Ionicons name="chevron-forward" size={14} color={appColors.accent} />
          </Pressable>
        </View>
      </View>

      <MenuSection
        title={t('profile.asSeller')}
        items={sellerItems}
        onPress={(route) => router.push(route as never)}
      />
      <MenuSection
        title={t('profile.asBuyer')}
        items={buyerItems}
        onPress={(route) => router.push(route as never)}
      />
      <View style={[styles.kycHint, kycAprovado && styles.kycHintOk]}>
        <Ionicons
          name={kycAprovado ? 'checkmark-circle' : 'alert-circle-outline'}
          size={16}
          color={kycAprovado ? appColors.success : appColors.accent}
        />
        <Text style={styles.kycHintText}>
          {kycAprovado
            ? t('profile.bidsUnlocked')
            : t('profile.bidsLocked', { status: statusLabel })}
        </Text>
      </View>

      <MenuSection
        title={t('profile.general')}
        items={generalItems}
        onPress={(route) => router.push(route as never)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appColors.screen },
  content: { paddingHorizontal: appSpacing.lg },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.md,
    backgroundColor: appColors.surface,
    borderRadius: appRadii.lg,
    padding: appSpacing.lg,
    marginBottom: appSpacing.xl,
    borderWidth: 1,
    borderColor: appColors.borderAccent,
  },
  avatarRing: {
    padding: 3,
    borderRadius: appRadii.pill,
    borderWidth: 2,
    borderColor: appColors.accentMuted,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: appColors.surfaceMuted,
  },
  identityText: { flex: 1, gap: 2 },
  greeting: { fontSize: 12, fontWeight: '600', color: appColors.textMuted },
  userName: { fontSize: 20, fontWeight: '800', color: appColors.textPrimary, letterSpacing: -0.3 },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: appSpacing.xs,
  },
  profileLinkText: { fontSize: 13, fontWeight: '600', color: appColors.accent },
  section: { marginBottom: appSpacing.xl },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: appColors.textMuted,
    marginBottom: appSpacing.sm,
    marginLeft: appSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuCard: {
    backgroundColor: appColors.surface,
    borderRadius: appRadii.lg,
    borderWidth: 1,
    borderColor: appColors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.md,
    paddingHorizontal: appSpacing.md,
    paddingVertical: appSpacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: appRadii.sm,
    backgroundColor: appColors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: appColors.textPrimary },
  kycHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.sm,
    padding: appSpacing.md,
    marginBottom: appSpacing.lg,
    backgroundColor: appColors.surface,
    borderRadius: appRadii.md,
    borderWidth: 1,
    borderColor: appColors.borderAccent,
  },
  kycHintOk: {
    backgroundColor: appColors.successSoft,
    borderColor: '#A7F3D0',
  },
  kycHintText: { flex: 1, fontSize: 12, fontWeight: '600', color: appColors.textSecondary, lineHeight: 17 },
});
