import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { LOCALE_LABEL_KEYS } from '@/src/i18n/translations';
import { useTranslation } from '@/src/i18n/useTranslation';
import { IDIOMAS_DISPONIVEIS, useLanguage, type AppLocale } from '@/src/store/languageContext';
import { lightColors } from '@/src/theme/lightTokens';

export default function LanguageScreen() {
  const router = useRouter();
  const { locale, definirLocale } = useLanguage();
  const { t } = useTranslation();

  async function selecionar(id: AppLocale) {
    await definirLocale(id);
    if (id !== locale) {
      router.back();
    }
  }

  return (
    <SubScreenLayout title={t('language.title')} subtitle={t('language.subtitle')}>
      <View style={styles.card}>
        {IDIOMAS_DISPONIVEIS.map((idioma, index) => {
          const selecionado = locale === idioma.id;
          return (
            <Pressable
              key={idioma.id}
              style={[styles.row, index < IDIOMAS_DISPONIVEIS.length - 1 && styles.rowBorder]}
              onPress={() => void selecionar(idioma.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado }}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{idioma.rotuloNativo}</Text>
                <Text style={styles.rowSubtitle}>{t(LOCALE_LABEL_KEYS[idioma.id])}</Text>
              </View>
              {selecionado ? (
                <Ionicons name="checkmark-circle" size={22} color={lightColors.accent} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.nota}>{t('language.note')}</Text>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1A1625' },
  rowSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  nota: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
    marginTop: 16,
    paddingHorizontal: 4,
  },
});
