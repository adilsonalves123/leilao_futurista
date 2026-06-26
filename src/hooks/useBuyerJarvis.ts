import { useCallback, useEffect, useRef, useState } from 'react';

import {
  carregarContextoBuyerJarvis,
  consultarBuyerJarvis,
  listarMensagensBuyerJarvis,
  mapBuyerJarvisMessagesToChat,
} from '@/src/services/buyerJarvis';
import type { BuyerJarvisAlert, BuyerJarvisContext } from '@/src/types/buyerJarvis';

export type BuyerJarvisChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

export function useBuyerJarvis(route: string, visible: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<BuyerJarvisContext | null>(null);
  const [messages, setMessages] = useState<BuyerJarvisChatMessage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [iaOffline, setIaOffline] = useState(false);
  const [iaOfflineMotivo, setIaOfflineMotivo] = useState<string | null>(null);
  const initRef = useRef(false);

  const recarregarContexto = useCallback(async () => {
    const bundle = await carregarContextoBuyerJarvis(route);
    setContext(bundle);
    return bundle;
  }, [route]);

  const recarregarHistorico = useCallback(async (sid: string) => {
    const rows = await listarMensagensBuyerJarvis(sid);
    const mapped = mapBuyerJarvisMessagesToChat(rows);
    if (mapped.length) setMessages(mapped);
    return mapped;
  }, []);

  const aplicarResultado = useCallback(
    async (result: Awaited<ReturnType<typeof consultarBuyerJarvis>>, userMessage?: string) => {
      if (!result.ok) {
        setIaOffline(false);
        setIaOfflineMotivo(null);
        setErro(result.error ?? 'Falha ao consultar Jarvis.');
        return result;
      }

      if (result.context) setContext(result.context);
      if (result.sessionId) setSessionId(result.sessionId);
      if (result.model) setModelo(result.model);
      if (result.provider) setProvider(result.provider);

      const offline =
        result.aiOffline === true ||
        result.model === 'deterministic-fallback' ||
        result.model === 'local-fallback' ||
        result.model === 'local-deterministic';
      setIaOffline(offline);
      setIaOfflineMotivo(result.aiOfflineReason ?? result.error ?? null);
      setErro(offline ? result.aiOfflineReason ?? result.error ?? null : result.error ?? null);

      if (!result.reply) return result;

      if (result.sessionId && !result.sessionId.startsWith('local-')) {
        const historico = await recarregarHistorico(result.sessionId);
        if (historico.length === 0) {
          setMessages((prev) => {
            const base = userMessage
              ? prev
              : [];
            return [
              ...base,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant' as const,
                text: result.reply!,
                createdAt: Date.now(),
              },
            ];
          });
        }
        return result;
      }

      setMessages((prev) => {
        const base = userMessage ? prev : [];
        return [
          ...base,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant' as const,
            text: result.reply!,
            createdAt: Date.now(),
          },
        ];
      });

      return result;
    },
    [recarregarHistorico],
  );

  const consultar = useCallback(
    async (message?: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setEnviando(true);
      }
      setErro(null);
      try {
        const result = await consultarBuyerJarvis({
          sessionId,
          message,
          route,
        });
        return await aplicarResultado(result, message);
      } finally {
        if (!options?.silent) {
          setEnviando(false);
        }
      }
    },
    [sessionId, route, aplicarResultado],
  );

  useEffect(() => {
    if (!visible) {
      initRef.current = false;
      setCarregando(false);
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
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao iniciar Jarvis.');
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, route, recarregarContexto]);

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
    enviarMensagem,
    recarregarContexto,
    alertas: (context?.alertas ?? []) as BuyerJarvisAlert[],
    modelo,
    provider,
    iaOffline,
    iaOfflineMotivo,
  };
}

export function useJarvisProactiveAlerts(route: string) {
  const [alertas, setAlertas] = useState<BuyerJarvisAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    carregarContextoBuyerJarvis(route).then((ctx) => {
      if (!cancelled) setAlertas(ctx.alertas ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  return alertas;
}
