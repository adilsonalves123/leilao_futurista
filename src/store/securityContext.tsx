import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

export type SecurityPreferences = {
  desbloquearApp: boolean;
  confirmarLances: boolean;
  confirmarCarteira: boolean;
  ocultarSaldo: boolean;
};

const STORAGE_KEY = '@levou/seguranca';

const PADRAO: SecurityPreferences = {
  desbloquearApp: true,
  confirmarLances: true,
  confirmarCarteira: true,
  ocultarSaldo: false,
};

type SecurityContextValue = {
  preferencias: SecurityPreferences;
  carregando: boolean;
  hardwareDisponivel: boolean;
  biometriaCadastrada: boolean;
  rotuloBiometria: string;
  sessaoReautenticada: boolean;
  atualizar: (patch: Partial<SecurityPreferences>) => Promise<boolean>;
  solicitarBiometria: (motivo: string) => Promise<boolean>;
  marcarSessaoReautenticada: () => void;
  limparSessaoReautenticada: () => void;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

/** Persiste entre re-renders; limpa ao ir para background ou sair da conta. */
let appDesbloqueadoNaSessao = false;

export function estaAppDesbloqueado(): boolean {
  return appDesbloqueadoNaSessao;
}

function mesclarPreferencias(raw: unknown): SecurityPreferences {
  if (!raw || typeof raw !== 'object') return { ...PADRAO };
  const obj = raw as Partial<SecurityPreferences>;
  return {
    desbloquearApp: obj.desbloquearApp ?? PADRAO.desbloquearApp,
    confirmarLances: obj.confirmarLances ?? PADRAO.confirmarLances,
    confirmarCarteira: obj.confirmarCarteira ?? PADRAO.confirmarCarteira,
    ocultarSaldo: obj.ocultarSaldo ?? PADRAO.ocultarSaldo,
  };
}

async function rotuloTiposBiometria(): Promise<string> {
  const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Biometria';
  }
  if (tipos.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Íris';
  }
  return 'Biometria';
}

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<SecurityPreferences>(PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [hardwareDisponivel, setHardwareDisponivel] = useState(false);
  const [biometriaCadastrada, setBiometriaCadastrada] = useState(false);
  const [rotuloBiometria, setRotuloBiometria] = useState('Biometria');
  const [sessaoReautenticada, setSessaoReautenticada] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [salvo, hardware, cadastrada, rotulo] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          rotuloTiposBiometria(),
        ]);
        if (!ativo) return;
        if (salvo) {
          setPreferencias(mesclarPreferencias(JSON.parse(salvo)));
        }
        setHardwareDisponivel(hardware);
        setBiometriaCadastrada(cadastrada);
        setRotuloBiometria(rotulo);
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

  const solicitarBiometria = useCallback(async (motivo: string) => {
    if (!hardwareDisponivel || !biometriaCadastrada) return false;
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      fallbackLabel: Platform.OS === 'ios' ? 'Usar senha do iPhone' : 'Usar senha',
      disableDeviceFallback: false,
    });
    return resultado.success;
  }, [hardwareDisponivel, biometriaCadastrada]);

  const persistir = useCallback((next: SecurityPreferences) => {
    setPreferencias(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const atualizar = useCallback(
    async (patch: Partial<SecurityPreferences>) => {
      const ativando =
        patch.desbloquearApp === true ||
        patch.confirmarLances === true ||
        patch.confirmarCarteira === true ||
        patch.ocultarSaldo === true;

      if (ativando && (!hardwareDisponivel || !biometriaCadastrada)) {
        return false;
      }

      persistir({ ...preferencias, ...patch });
      return true;
    },
    [preferencias, hardwareDisponivel, biometriaCadastrada, persistir],
  );

  const marcarSessaoReautenticada = useCallback(() => {
    appDesbloqueadoNaSessao = true;
    setSessaoReautenticada(true);
  }, []);

  const limparSessaoReautenticada = useCallback(() => {
    appDesbloqueadoNaSessao = false;
    setSessaoReautenticada(false);
  }, []);

  const value = useMemo<SecurityContextValue>(
    () => ({
      preferencias,
      carregando,
      hardwareDisponivel,
      biometriaCadastrada,
      rotuloBiometria,
      sessaoReautenticada,
      atualizar,
      solicitarBiometria,
      marcarSessaoReautenticada,
      limparSessaoReautenticada,
    }),
    [
      preferencias,
      carregando,
      hardwareDisponivel,
      biometriaCadastrada,
      rotuloBiometria,
      sessaoReautenticada,
      atualizar,
      solicitarBiometria,
      marcarSessaoReautenticada,
      limparSessaoReautenticada,
    ],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    throw new Error('useSecurity deve ser usado dentro de SecurityProvider');
  }
  return ctx;
}
