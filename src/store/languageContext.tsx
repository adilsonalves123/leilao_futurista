import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  IDIOMA_NATIVO,
  IDIOMAS,
  LOCALE_LABEL_KEYS,
  translate,
} from '@/src/i18n/translations';

export type AppLocale = 'pt-BR' | 'en' | 'es';

export type IdiomaOpcao = {
  id: AppLocale;
  rotuloNativo: string;
};

export const IDIOMAS_DISPONIVEIS: IdiomaOpcao[] = IDIOMAS.map((id) => ({
  id,
  rotuloNativo: IDIOMA_NATIVO[id],
}));

const STORAGE_KEY = '@levou/idioma';

type LanguageContextValue = {
  locale: AppLocale;
  rotuloAtual: string;
  carregando: boolean;
  definirLocale: (locale: AppLocale) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function rotuloPorLocale(locale: AppLocale): string {
  return translate(locale, LOCALE_LABEL_KEYS[locale]);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>('pt-BR');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);
        if (!ativo) return;
        if (salvo && IDIOMAS.includes(salvo as AppLocale)) {
          setLocale(salvo as AppLocale);
        }
      } catch {
        /* mantém padrão */
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const definirLocale = useCallback(async (novo: AppLocale) => {
    setLocale(novo);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, novo);
    } catch {
      /* preferência em memória até próxima sessão */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      rotuloAtual: rotuloPorLocale(locale),
      carregando,
      definirLocale,
    }),
    [locale, carregando, definirLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return ctx;
}
