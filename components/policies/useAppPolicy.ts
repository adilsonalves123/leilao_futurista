import { useCallback, useEffect, useState } from 'react';
import { obterPoliticaAtual, obterPoliticasAtuais } from '@/src/services/appPolicies';
import type { AppPolicy, AppPolicyType } from '@/src/types/appPolicy';

type UseAppPolicyResult = {
  policy: AppPolicy | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
};

export function useAppPolicy(type: AppPolicyType): UseAppPolicyResult {
  const [policy, setPolicy] = useState<AppPolicy | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await obterPoliticaAtual(type);
      setPolicy(data);
    } catch (e) {
      setPolicy(null);
      setErro(e instanceof Error ? e.message : 'Falha ao carregar política.');
    } finally {
      setCarregando(false);
    }
  }, [type]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { policy, carregando, erro, recarregar };
}

type UseAppPoliciesResult = {
  policies: AppPolicy[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
};

export function useAppPolicies(types: AppPolicyType[]): UseAppPoliciesResult {
  const chave = types.join('|');
  const [policies, setPolicies] = useState<AppPolicy[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await obterPoliticasAtuais(types);
      setPolicies(data);
    } catch (e) {
      setPolicies([]);
      setErro(e instanceof Error ? e.message : 'Falha ao carregar políticas.');
    } finally {
      setCarregando(false);
    }
  }, [chave, types]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { policies, carregando, erro, recarregar };
}
