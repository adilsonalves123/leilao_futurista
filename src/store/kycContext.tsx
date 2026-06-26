import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { obterPerfilKyc } from '@/src/services/kycProfile';
import type { KycProfile } from '@/src/types/kyc';
import { KYC_STATUS_LABELS, podeDarLance, podePublicarAnuncio } from '@/src/types/kyc';

type KycContextValue = {
  perfil: KycProfile | null;
  carregando: boolean;
  podeDarLance: boolean;
  podePublicarAnuncio: boolean;
  statusLabel: string;
  atualizar: () => Promise<void>;
};

const KycContext = createContext<KycContextValue | null>(null);

export function KycProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<KycProfile | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizar = useCallback(async () => {
    setCarregando(true);
    try {
      const userId = await obterIdUsuarioAtual();
      if (!userId) {
        setPerfil(null);
        return;
      }
      const dados = await obterPerfilKyc(userId);
      setPerfil(dados);
    } catch {
      setPerfil(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  const value = useMemo<KycContextValue>(
    () => ({
      perfil,
      carregando,
      podeDarLance: perfil ? podeDarLance(perfil.statusVerificacao) : false,
      podePublicarAnuncio: perfil ? podePublicarAnuncio(perfil.statusVerificacao) : false,
      statusLabel: perfil ? KYC_STATUS_LABELS[perfil.statusVerificacao] : 'Não autenticado',
      atualizar,
    }),
    [perfil, carregando, atualizar],
  );

  return <KycContext.Provider value={value}>{children}</KycContext.Provider>;
}

export function useKyc() {
  const ctx = useContext(KycContext);
  if (!ctx) {
    throw new Error('useKyc deve ser usado dentro de KycProvider');
  }
  return ctx;
}
