import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { useTranslation } from '@/src/i18n/useTranslation';
import type { TranslationKey } from '@/src/i18n/translations';
import type { PrivacyPreferences } from '@/src/store/privacyContext';
import { usePrivacy } from '@/src/store/privacyContext';
import { lightColors } from '@/src/theme/lightTokens';

type ToggleItem = {
  key: keyof PrivacyPreferences;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
};

const ITENS: ToggleItem[] = [
  {
    key: 'nomeEmLances',
    labelKey: 'privacy.showNameInBids',
    hintKey: 'privacy.showNameInBidsHint',
  },
  {
    key: 'historicoPrivado',
    labelKey: 'privacy.privateHistory',
    hintKey: 'privacy.privateHistoryHint',
  },
  {
    key: 'recomendacoesPersonalizadas',
    labelKey: 'privacy.personalized',
    hintKey: 'privacy.personalizedHint',
  },
];

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { preferencias, atualizar } = usePrivacy();

  return (
    <SubScreenLayout title={t('privacy.title')} subtitle={t('privacy.subtitle')}>
      <View style={styles.trustCard}>
        <View style={styles.trustIconWrap}>
          <Ionicons name="shield-checkmark" size={20} color={lightColors.accent} />
        </View>
        <View style={styles.trustText}>
          <Text style={styles.trustTitle}>{t('privacy.trustTitle')}</Text>
          <Text style={styles.trustBody}>{t('privacy.trustBody')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('privacy.preferences')}</Text>
      <View style={styles.card}>
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
              onValueChange={(valor) => void atualizar({ [item.key]: valor })}
              trackColor={{ false: '#E5E7EB', true: '#E9E0FF' }}
              thumbColor={preferencias[item.key] ? lightColors.accent : '#F3F4F6'}
            />
          </View>
        ))}
      </View>

      <Text style={styles.nota}>{t('privacy.note')}</Text>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  trustCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F4F0FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    padding: 14,
    marginBottom: 20,
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { flex: 1 },
  trustTitle: { fontSize: 14, fontWeight: '700', color: '#1A1625', marginBottom: 4 },
  trustBody: { fontSize: 13, color: '#5B5675', lineHeight: 18 },
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
