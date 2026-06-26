import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { deveUsarBackendLeilaoLocal } from '@/src/lib/auctionIds';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  LIVE_CHAT_BROADCAST_EVENT,
  broadcastMensagemChat,
  canalChatAoVivo,
  emitirMockBroadcast,
  enviarMensagemChatAoVivo,
  inscreverMockBroadcast,
  listarHistoricoChatAoVivo,
} from '@/src/services/liveAuctionChat';
import type { LiveAuctionMessage } from '@/src/types/liveAuctionChat';

type UseLiveAuctionChatOptions = {
  auctionId: string;
  enabled: boolean;
};

function payloadParaMensagem(payload: unknown): LiveAuctionMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Partial<LiveAuctionMessage>;
  if (!p.id || !p.message || !p.createdAt) return null;
  return {
    id: p.id,
    auctionId: p.auctionId ?? '',
    userId: p.userId ?? null,
    username: p.username ?? 'Participante',
    message: p.message,
    isSystemMessage: !!p.isSystemMessage,
    createdAt: p.createdAt,
  };
}

export function useLiveAuctionChat({ auctionId, enabled }: UseLiveAuctionChatOptions) {
  const [mensagens, setMensagens] = useState<LiveAuctionMessage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idsRef = useRef<Set<string>>(new Set());

  const anexarMensagem = useCallback((msg: LiveAuctionMessage) => {
    if (idsRef.current.has(msg.id)) return;
    idsRef.current.add(msg.id);
    setMensagens((prev) => [...prev, msg].slice(-120));
  }, []);

  const broadcast = useCallback(
    (msg: LiveAuctionMessage) => {
      const channel = channelRef.current;
      if (channel) {
        broadcastMensagemChat(channel, msg);
      } else if (deveUsarBackendLeilaoLocal(auctionId) || !isSupabaseConfigured()) {
        emitirMockBroadcast(auctionId, msg);
      }
    },
    [auctionId],
  );

  useEffect(() => {
    if (!enabled || !auctionId) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    idsRef.current = new Set();

    (async () => {
      setCarregando(true);
      try {
        const userId = await obterIdUsuarioAtual();
        if (ativo) setAutenticado(!!userId);

        const historico = await listarHistoricoChatAoVivo(auctionId);
        if (!ativo) return;
        historico.forEach((m) => idsRef.current.add(m.id));
        setMensagens(historico);
      } catch {
        if (ativo) setMensagens([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [auctionId, enabled]);

  useEffect(() => {
    if (!enabled || !auctionId) return;

    const usarMock = deveUsarBackendLeilaoLocal(auctionId) || !isSupabaseConfigured();

    if (usarMock) {
      return inscreverMockBroadcast(auctionId, anexarMensagem);
    }

    const supabase = getSupabase();
    if (!supabase) {
      return inscreverMockBroadcast(auctionId, anexarMensagem);
    }

    const channel = supabase.channel(canalChatAoVivo(auctionId), {
      config: { broadcast: { self: true, ack: false } },
    });

    channel.on('broadcast', { event: LIVE_CHAT_BROADCAST_EVENT }, ({ payload }) => {
      const msg = payloadParaMensagem(payload);
      if (msg) anexarMensagem(msg);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [auctionId, enabled, anexarMensagem]);

  const enviar = useCallback(
    async (texto: string) => {
      if (!enabled || !auctionId) return { ok: false as const, erro: 'Chat indisponível.' };

      setEnviando(true);
      try {
        const msg = await enviarMensagemChatAoVivo(auctionId, texto);
        anexarMensagem(msg);
        broadcast(msg);
        return { ok: true as const, mensagem: msg };
      } catch (e) {
        return {
          ok: false as const,
          erro: e instanceof Error ? e.message : 'Falha ao enviar mensagem.',
        };
      } finally {
        setEnviando(false);
      }
    },
    [auctionId, enabled, anexarMensagem, broadcast],
  );

  const publicarMensagem = useCallback(
    (msg: LiveAuctionMessage) => {
      anexarMensagem(msg);
      broadcast(msg);
    },
    [anexarMensagem, broadcast],
  );

  return {
    mensagens,
    carregando,
    enviando,
    autenticado,
    enviar,
    publicarMensagem,
  };
}
