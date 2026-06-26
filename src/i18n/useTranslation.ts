import { useCallback } from 'react';
import { translate, type TranslationKey } from '@/src/i18n/translations';
import { useLanguage } from '@/src/store/languageContext';

export function useTranslation() {
  const { locale } = useLanguage();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  return { t, locale };
}
