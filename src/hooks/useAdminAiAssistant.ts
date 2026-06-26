import { useCallback, useEffect, useRef, useState } from 'react';

import {
  carregarContextoAdminAi,
  consultarAssistenteAdmin,
  listarMensagensAdminAi,
  mapAdminAiMessagesToChat,
} from '@/src/services/adminAiAssistant';
import type { AdminAiContextBundle } from '@/src/types/adminAi';

export type AdminAiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

export function useAdminAiAssistant(visible = true) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<AdminAiContextBundle | null>(null);
  const [messages, setMessages] = useState<AdminAiChatMessage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const initRef = useRef(false);

  const recarregarContexto = useCallback(async () => {
    const bundle = await carregarContextoAdminAi(24);
    setContext(bundle);
    return bundle;
  }, []);

  const recarregarHistorico = useCallback(async (sid: string) => {
    const rows = await listarMensagensAdminAi(sid);
    const mapped = mapAdminAiMessagesToChat(rows);
    if (mapped.length) setMessages(mapped);
    return mapped;
  }, []);

  const consultar = useCallback(
    async (message?: string) => {
      setEnviando(true);
      setErro(null);
      try {
        const result = await consultarAssistenteAdmin({
          message,
          sessionId,
          hours: 24,
        });

        if (result.context) setContext(result.context);
        if (result.error) setErro(result.error);
        if (result.model) setModelo(result.model);

        if (result.sessionId) setSessionId(result.sessionId);

        if (result.fromHistory && result.sessionId && !result.sessionId.startsWith('local-')) {
          await recarregarHistorico(result.sessionId);
          return result;
        }

        if (result.sessionId && !result.sessionId.startsWith('local-')) {
          const historico = await recarregarHistorico(result.sessionId);
          if (!historico.length && result.reply) {
            setMessages([
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                text: result.reply,
                createdAt: Date.now(),
              },
            ]);
          }
        } else if (result.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: result.reply!,
              createdAt: Date.now(),
            },
          ]);
        }

        return result;
      } finally {
        setEnviando(false);
      }
    },
    [sessionId, recarregarHistorico],
  );

  useEffect(() => {
    if (!visible) {
      initRef.current = false;
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        await recarregarContexto();
        if (cancelled) return;
        if (sessionId && !sessionId.startsWith('local-')) {
          const historico = await recarregarHistorico(sessionId);
          if (cancelled) return;
          if (historico.length > 0) return;
        }
        await consultar(undefined);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao iniciar assistente.');
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const enviarMensagem = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || enviando) return;

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', text: trimmed, createdAt: Date.now() },
      ]);

      await consultar(trimmed);
      await recarregarContexto();
    },
    [consultar, enviando, recarregarContexto],
  );

  return {
    sessionId,
    context,
    messages,
    carregando,
    enviando,
    erro,
    modelo,
    enviarMensagem,
    recarregarContexto,
  };
}
