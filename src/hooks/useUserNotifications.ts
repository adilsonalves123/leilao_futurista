import { useCallback, useState } from 'react';
import { useOperationsStore } from '@/src/hooks/useOperationsStore';
import {
  listarNotificacoesUsuario,
  type ListarNotificacoesOptions,
} from '@/src/services/userNotifications';
import type { UserNotification } from '@/src/types/notifications';

export function useUserNotifications() {
  const { state } = useOperationsStore();
  const [itens, setItens] = useState<UserNotification[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const opts: ListarNotificacoesOptions = { orders: state.orders };
      const lista = await listarNotificacoesUsuario(opts);
      setItens(lista);
    } finally {
      setCarregando(false);
    }
  }, [state.orders]);

  const naoLidas = itens.filter((n) => n.unread).length;

  return { itens, carregando, naoLidas, recarregar };
}
