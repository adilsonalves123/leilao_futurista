import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { COLABORADOR_MASTER, COLABORADORES_INICIAIS } from './mockData';
import type { AdminPermission, Colaborador } from './types';

type AdminSessionContextValue = {
  colaboradorAtivo: Colaborador;
  colaboradores: Colaborador[];
  setColaboradorAtivo: (id: string) => void;
  adicionarColaborador: (colaborador: Colaborador) => void;
  temPermissao: (permissao: AdminPermission) => boolean;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [colaboradores, setColaboradores] = useState(COLABORADORES_INICIAIS);
  const [colaboradorAtivoId, setColaboradorAtivoId] = useState(COLABORADOR_MASTER.id);

  const colaboradorAtivo = useMemo(
    () => colaboradores.find((c) => c.id === colaboradorAtivoId) ?? COLABORADOR_MASTER,
    [colaboradores, colaboradorAtivoId],
  );

  const setColaboradorAtivo = useCallback((id: string) => {
    setColaboradorAtivoId(id);
  }, []);

  const adicionarColaborador = useCallback((colaborador: Colaborador) => {
    setColaboradores((prev) => [...prev, colaborador]);
  }, []);

  const temPermissao = useCallback(
    (permissao: AdminPermission) => colaboradorAtivo.permissoes.includes(permissao),
    [colaboradorAtivo],
  );

  const value = useMemo(
    () => ({
      colaboradorAtivo,
      colaboradores,
      setColaboradorAtivo,
      adicionarColaborador,
      temPermissao,
    }),
    [colaboradorAtivo, colaboradores, setColaboradorAtivo, adicionarColaborador, temPermissao],
  );

  return (
    <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession deve ser usado dentro de AdminSessionProvider');
  }
  return ctx;
}
