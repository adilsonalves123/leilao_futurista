import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import type { TranslationKey } from '@/src/i18n/translations';
import { useTranslation } from '@/src/i18n/useTranslation';
import type { SecurityPreferences } from '@/src/store/securityContext';
import { useSecurity } from '@/src/store/securityContext';
import { lightColors } from '@/src/theme/lightTokens';

type ToggleItem = {
  key: keyof SecurityPreferences;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
};

const ITENS: ToggleItem[] = [
  {
    key: 'desbloquearApp',
    labelKey: 'security.unlockApp',
    hintKey: 'security.unlockAppHint',
  },
  {
    key: 'confirmarLances',
    labelKey: 'security.confirmBids',
    hintKey: 'security.confirmBidsHint',
  },
  {
    key: 'confirmarCarteira',
    labelKey: 'security.confirmWallet',
    hintKey: 'security.confirmWalletHint',
  },
  {
    key: 'ocultarSaldo',
    labelKey: 'security.hideBalance',
    hintKey: 'security.hideBalanceHint',
  },
];

export default function SecurityScreen() {
  const { t } = useTranslation();
  const {
    preferencias,
    atualizar,
    solicitarBiometria,
    hardwareDisponivel,
    biometriaCadastrada,
    rotuloBiometria,
  } = useSecurity();

  const biometriaPronta = hardwareDisponivel && biometriaCadastrada;

  const aoAlternar = useCallback(
    async (key: keyof SecurityPreferences, valor: boolean) => {
      if (!valor) {
        await atualizar({ [key]: false });
        return;
      }

      if (!hardwareDisponivel) {
        Alert.alert(t('security.errorTitle'), t('security.hardwareUnavailable'));
        return;
      }
      if (!biometriaCadastrada) {
        Alert.alert(t('security.errorTitle'), t('security.notEnrolled'));
        return;
      }

      const ok = await solicitarBiometria(t('security.enablePrompt'));
      if (!ok) {
        Alert.alert(t('security.errorTitle'), t('security.authFailed'));
        return;
      }

      const salvo = await atualizar({ [key]: true });
      if (!salvo) {
        Alert.alert(t('security.errorTitle'), t('security.authFailed'));
      }
    },
    [atualizar, biometriaCadastrada, hardwareDisponivel, solicitarBiometria, t],
  );

  return (
    <SubScreenLayout title={t('security.title')} subtitle={t('security.subtitle')}>
      <View
        style={[
          styles.statusCard,
          biometriaPronta ? styles.statusCardOk : styles.statusCardWarn,
        ]}>
        <View style={styles.statusIconWrap}>
          <Ionicons
            name={biometriaPronta ? 'finger-print' : 'alert-circle-outline'}
            size={20}
            color={biometriaPronta ? lightColors.accent : '#B45309'}
          />
        </View>
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>
            {biometriaPronta
              ? t('security.statusReady', { type: rotuloBiometria })
              : t('security.statusUnavailable')}
          </Text>
          <Text style={styles.statusBody}>
            {biometriaPronta
              ? t('security.statusReadyHint')
              : Platform.OS === 'web'
                ? t('security.webHint')
                : !hardwareDisponivel
                  ? t('security.hardwareUnavailable')
                  : t('security.notEnrolled')}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('security.protection')}</Text>
      <View style={[styles.card, !biometriaPronta && styles.cardDisabled]}>
        {ITENS.map((item, index) => (
          <View
            key={item.key}
            style={[styles.toggleRow, index < ITENS.length - 1 && styles.toggleRowBorder]}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>{t(item.labelKey)}</Text>
              <Text style={styles.toggleHint}>{t(item.hintKey)}</Text>
            </View>
            <Switch
              value={preferencias[item.key]}
              onValueChange={(valor) => void aoAlternar(item.key, valor)}
              disabled={!biometriaPronta}
              trackColor={{ false: '#E5E7EB', true: '#E9E0FF' }}
              thumbColor={preferencias[item.key] ? lightColors.accent : '#F3F4F6'}
            />
          </View>
        ))}
      </View>

      <Text style={styles.nota}>{t('security.note')}</Text>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  statusCardOk: {
    backgroundColor: '#F4F0FF',
    borderColor: '#EDE9FE',
  },
  statusCardWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#1A1625', marginBottom: 4 },
  statusBody: { fontSize: 13, color: '#5B5675', lineHeight: 18 },
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
  cardDisabled: { opacity: 0.72 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleText: { flex: 1, paddingRight: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1A1625' },
  toggleHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 17 },
  nota: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
    marginTop: 16,
    paddingHorizontal: 4,
  },
});
