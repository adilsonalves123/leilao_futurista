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

export type PrivacyPreferences = {
  nomeEmLances: boolean;
  historicoPrivado: boolean;
  recomendacoesPersonalizadas: boolean;
};

const STORAGE_KEY = '@levou/privacidade';

/** Perfil e avaliações são sempre públicos — regra de confiança do Levou. */
export const PERFIL_E_AVALIACOES_SEMPRE_PUBLICOS = true;

const PADRAO: PrivacyPreferences = {
  nomeEmLances: true,
  historicoPrivado: false,
  recomendacoesPersonalizadas: true,
};

type PrivacyContextValue = {
  preferencias: PrivacyPreferences;
  carregando: boolean;
  atualizar: (patch: Partial<PrivacyPreferences>) => Promise<void>;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function mesclarPreferencias(raw: unknown): PrivacyPreferences {
  if (!raw || typeof raw !== 'object') return { ...PADRAO };
  const obj = raw as Partial<PrivacyPreferences>;
  return {
    nomeEmLances: obj.nomeEmLances ?? PADRAO.nomeEmLances,
    historicoPrivado: obj.historicoPrivado ?? PADRAO.historicoPrivado,
    recomendacoesPersonalizadas:
      obj.recomendacoesPersonalizadas ?? PADRAO.recomendacoesPersonalizadas,
  };
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PrivacyPreferences>(PADRAO);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);
        if (!ativo) return;
        if (salvo) {
          setPreferencias(mesclarPreferencias(JSON.parse(salvo)));
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

  const atualizar = useCallback(async (patch: Partial<PrivacyPreferences>) => {
    setPreferencias((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({ preferencias, carregando, atualizar }),
    [preferencias, carregando, atualizar],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy deve ser usado dentro de PrivacyProvider');
  }
  return ctx;
}
