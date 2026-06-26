import { useCallback, useEffect, useRef, useState } from 'react';

import {
  consultarAssistenteLeilao,
  listarMensagensAssistenteLeilao,
  mapAdvisorMessagesToChat,
} from '@/src/services/auctionAiAdvisor';
import type { AuctionAiConsultaInput } from '@/src/types/auctionAi';

export type AuctionAiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

type UseAuctionAiAdvisorParams = {
  visible: boolean;
  auctionId: string;
  bidCents: number;
  marketCents: number | null;
  title: string;
  description?: string;
  conservationState?: string | null;
  category?: string | null;
};

export function useAuctionAiAdvisor({
  visible,
  auctionId,
  bidCents,
  marketCents,
  title,
  description,
  conservationState,
  category,
}: UseAuctionAiAdvisorParams) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AuctionAiChatMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [iaOffline, setIaOffline] = useState(false);
  const [iaOfflineMotivo, setIaOfflineMotivo] = useState<string | null>(null);
  const inicializadoRef = useRef(false);

  useEffect(() => {
    setSessionId(null);
    setMessages([]);
    setErro(null);
    inicializadoRef.current = false;
  }, [auctionId]);

  const buildInput = useCallback(
    (message?: string): AuctionAiConsultaInput => ({
      auctionId,
      sessionId,
      message,
      bidCents,
      marketCents,
      title,
      description,
      conservationState,
      category,
    }),
    [auctionId, sessionId, bidCents, marketCents, title, description, conservationState, category],
  );

  const recarregarHistorico = useCallback(async (sid: string) => {
    const rows = await listarMensagensAssistenteLeilao(sid);
    const mapped = mapAdvisorMessagesToChat(rows);
    if (mapped.length) {
      setMessages(mapped);
    }
    return mapped;
  }, []);

  const consultar = useCallback(
    async (message?: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setEnviando(true);
      }
      setErro(null);

      try {
        const result = await consultarAssistenteLeilao(buildInput(message));

        if (!result.ok) {
          setErro(result.error ?? 'Não foi possível consultar o assistente.');
          return null;
        }

        if (result.model) setModelo(result.model);
        if (result.provider) setProvider(result.provider);
        const offline =
          result.aiOffline === true ||
          result.model === 'deterministic-fallback' ||
          result.model === 'local-deterministic' ||
          result.model === 'local-fallback';
        setIaOffline(offline);
        setIaOfflineMotivo(result.aiOfflineReason ?? result.error ?? null);
        if (offline) setErro(result.aiOfflineReason ?? result.error ?? null);

        if (result.sessionId) {
          setSessionId(result.sessionId);
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
        if (!options?.silent) {
          setEnviando(false);
        }
      }
    },
    [buildInput, recarregarHistorico],
  );

  const consultarRef = useRef(consultar);
  consultarRef.current = consultar;

  useEffect(() => {
    if (!visible) {
      inicializadoRef.current = false;
      setCarregando(false);
      return;
    }

    if (inicializadoRef.current) return;
    inicializadoRef.current = true;

    let cancelled = false;

    (async () => {
      setCarregando(true);
      setErro(null);

      try {
        await consultarRef.current(undefined, { silent: true });
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao analisar o lote.');
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, auctionId]);

  const enviarMensagem = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || enviando) return;

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', text: trimmed, createdAt: Date.now() },
      ]);

      await consultar(trimmed);
    },
    [consultar, enviando],
  );

  return {
    sessionId,
    messages,
    carregando,
    enviando,
    erro,
    enviarMensagem,
    modelo,
    provider,
    iaOffline,
    iaOfflineMotivo,
  };
}
