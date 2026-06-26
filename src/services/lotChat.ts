import { isMockMode } from '@/src/lib/mockMode';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  criarMockConversaLote,
  lerLotChatMockStore,
  mockLotChatMessageId,
  salvarLotChatMockStore,
  type LotChatMockStore,
} from '@/src/services/lotChatMockStore';
import {
  processarMensagemLoteChat,
  verificarEscalacaoPrazoPagamento,
  type LotChatAgentResult,
} from '@/src/services/lotChatAgent';
import { enviarFotoLoteChat } from '@/src/services/lotChatUpload';
import type { LotChatMessage, LotChatNivel, LotChatStatus } from '@/src/types/lotChat';

function novoId(p: string): string {
  return mockLotChatMessageId(p);
}

function mapRow(row: {
  id: string;
  sender_role: string;
  sender_user_id: string | null;
  body: string;
  image_url: string | null;
  created_at: string;
}): LotChatMessage {
  return {
    id: row.id,
    senderRole: row.sender_role as LotChatMessage['senderRole'],
    senderUserId: row.sender_user_id,
    body: row.body,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

async function lerMock(): Promise<LotChatMockStore> {
  return lerLotChatMockStore();
}

async function salvarMock(store: LotChatMockStore): Promise<void> {
  await salvarLotChatMockStore(store);
}

function criarMockConversa(orderId: string) {
  return criarMockConversaLote(orderId);
}

export async function obterOuCriarChatLote(orderId: string): Promise<string> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) throw new Error('Faça login para abrir o chat do lote.');

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    if (!store[orderId]) {
      store[orderId] = criarMockConversa(orderId);
      await salvarMock(store);
    }
    return store[orderId].conversationId;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const store = await lerMock();
    if (!store[orderId]) store[orderId] = criarMockConversa(orderId);
    return store[orderId].conversationId;
  }

  const { data, error } = await supabase.rpc('lote_chat_obter_ou_criar', { p_order_id: orderId });
  if (error) {
    throw new Error(
      error.message.includes('lote_chat_obter_ou_criar')
        ? 'Execute supabase/migrations/035_lot_chat_privado.sql'
        : error.message,
    );
  }
  return data as string;
}

export async function statusChatLote(conversationId: string): Promise<LotChatStatus> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const entry = Object.values(store).find((s) => s.conversationId === conversationId);
    if (!entry) throw new Error('Conversa não encontrada.');
    return {
      nivel: entry.nivel,
      vendedorVisivel: entry.vendedorVisivel,
      orderId: Object.keys(store).find((k) => store[k].conversationId === conversationId) ?? '',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return statusChatLote(conversationId);
  }

  const { data, error } = await supabase.rpc('lote_chat_status_conversa', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  const row = (data as { nivel: string; vendedor_visivel: boolean; order_id: string }[])[0];
  return {
    nivel: row.nivel as LotChatNivel,
    vendedorVisivel: row.vendedor_visivel,
    orderId: row.order_id,
  };
}

export async function listarMensagensChatLote(conversationId: string): Promise<LotChatMessage[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const entry = Object.values(store).find((s) => s.conversationId === conversationId);
    return entry?.messages ?? [];
  }

  const supabase = getSupabase();
  if (!supabase) return listarMensagensChatLote(conversationId);

  const { data, error } = await supabase.rpc('lote_chat_listar_mensagens', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Parameters<typeof mapRow>[0][]).map(mapRow);
}

async function escalarParaAdmin(
  conversationId: string,
  mensagemSistema?: string,
): Promise<void> {
  const msg =
    mensagemSistema ??
    'Encaminhei sua conversa para um atendente da plataforma. O assistente automático foi pausado.';

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const key = Object.keys(store).find((k) => store[k].conversationId === conversationId);
    if (key) {
      store[key].nivel = 'admin';
      store[key].messages.push({
        id: novoId('sys'),
        senderRole: 'ia',
        senderUserId: null,
        body: msg,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      });
      await salvarMock(store);
    }
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const usaAutomatico =
    !!mensagemSistema &&
    (mensagemSistema.includes('ATENÇÃO') ||
      mensagemSistema.includes('conflito') ||
      mensagemSistema.includes('Comprovante'));

  if (usaAutomatico) {
    await supabase.rpc('lote_chat_escalar_admin_automatico', {
      p_conversation_id: conversationId,
      p_mensagem_sistema: mensagemSistema ?? msg,
    });
  } else {
    await supabase.rpc('lote_chat_escalar_admin', { p_conversation_id: conversationId });
    if (mensagemSistema && mensagemSistema !== msg) {
      await supabase.rpc('lote_chat_registrar_ia', {
        p_conversation_id: conversationId,
        p_corpos: [mensagemSistema],
      });
    }
  }
}

async function registrarRespostasIa(
  conversationId: string,
  resultado: LotChatAgentResult,
): Promise<LotChatNivel> {
  if (resultado.escalarAdmin) {
    await escalarParaAdmin(conversationId, resultado.mensagemSistemaEscalacao);
    return 'admin';
  }

  const respostas = resultado.respostas;

  if (respostas.length) {
    if (isMockMode() || !isSupabaseConfigured()) {
      const store = await lerMock();
      const key = Object.keys(store).find((k) => store[k].conversationId === conversationId);
      if (key) {
        for (const body of respostas) {
          store[key].messages.push({
            id: novoId('ia'),
            senderRole: 'ia',
            senderUserId: null,
            body,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          });
        }
        await salvarMock(store);
      }
    } else {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.rpc('lote_chat_registrar_ia', {
          p_conversation_id: conversationId,
          p_corpos: respostas,
        });
      }
    }
  }

  const st = await statusChatLote(conversationId);
  return st.nivel;
}

/** Verifica prazo de pagamento e escala se necessário (chamar ao abrir o chat) */
export async function executarVerificacoesAutomaticasChatLote(
  conversationId: string,
  orderId: string,
): Promise<LotChatNivel> {
  const st = await statusChatLote(conversationId);
  if (st.nivel !== 'ia') return st.nivel;

  const prazo = await verificarEscalacaoPrazoPagamento(orderId);
  if (prazo?.escalarAdmin) {
    await registrarRespostasIa(conversationId, prazo);
    return 'admin';
  }
  return st.nivel;
}

export async function enviarMensagemChatLote(
  conversationId: string,
  orderId: string,
  texto: string,
  atalhoId?: string,
): Promise<void> {
  const limpo = texto.trim();
  const exibicao =
    atalhoId === 'rastreio'
      ? 'Qual é o rastreio deste pedido?'
      : atalhoId === 'pagamento'
        ? 'Status do pagamento deste lote'
        : atalhoId === 'prazo'
          ? 'Quais são os prazos de envio?'
          : atalhoId === 'admin'
            ? 'Preciso falar com a plataforma sobre este lote'
            : limpo;

  if (!exibicao.trim() && !atalhoId) return;

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    let key = Object.keys(store).find((k) => store[k].conversationId === conversationId);
    if (!key) {
      store[orderId] = criarMockConversa(orderId);
      key = orderId;
    }
    store[key].messages.push({
      id: novoId('user'),
      senderRole: 'comprador',
      senderUserId: 'mock-user',
      body: exibicao,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    if (store[key].nivel === 'ia') {
      const resultado = await processarMensagemLoteChat(orderId, limpo || exibicao, atalhoId);
      if (resultado.escalarAdmin) {
        store[key].nivel = 'admin';
        store[key].messages.push({
          id: novoId('sys'),
          senderRole: 'ia',
          senderUserId: null,
          body:
            resultado.mensagemSistemaEscalacao ??
            'Encaminhei sua conversa para um atendente da plataforma.',
          imageUrl: null,
          createdAt: new Date().toISOString(),
        });
      } else if (!resultado.interceptarSemResposta) {
        for (const body of resultado.respostas) {
          store[key].messages.push({
            id: novoId('ia'),
            senderRole: 'ia',
            senderUserId: null,
            body,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    await salvarMock(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await enviarMensagemChatLote(conversationId, orderId, texto, atalhoId);
    return;
  }

  const { data: nivel, error } = await supabase.rpc('lote_chat_enviar_comprador', {
    p_conversation_id: conversationId,
    p_body: exibicao,
    p_image_url: null,
  });
  if (error) throw new Error(error.message);

  if ((nivel as LotChatNivel) === 'ia') {
    const resultado = await processarMensagemLoteChat(orderId, limpo || exibicao, atalhoId);
    await registrarRespostasIa(conversationId, resultado);
  }
}

export async function enviarImagemChatLote(
  conversationId: string,
  orderId: string,
  imageUri: string,
  legenda?: string,
): Promise<void> {
  const caption = legenda?.trim() || '📷 Foto enviada';
  const imageUrl = await enviarFotoLoteChat(orderId, imageUri);

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    let key = Object.keys(store).find((k) => store[k].conversationId === conversationId);
    if (!key) {
      store[orderId] = criarMockConversa(orderId);
      key = orderId;
    }
    store[key].messages.push({
      id: novoId('user'),
      senderRole: 'comprador',
      senderUserId: 'mock-user',
      body: caption,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
    });
    if (store[key].nivel === 'ia') {
      const resultado = await processarMensagemLoteChat(
        orderId,
        legenda || 'foto enviada no chat do lote',
        undefined,
        { temImagem: true },
      );
      if (resultado.escalarAdmin) {
        store[key].nivel = 'admin';
        store[key].messages.push({
          id: novoId('sys'),
          senderRole: 'ia',
          senderUserId: null,
          body: resultado.mensagemSistemaEscalacao ?? 'Transferido para a plataforma.',
          imageUrl: null,
          createdAt: new Date().toISOString(),
        });
      } else if (!resultado.interceptarSemResposta) {
        for (const body of resultado.respostas) {
          store[key].messages.push({
            id: novoId('ia'),
            senderRole: 'ia',
            senderUserId: null,
            body,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    await salvarMock(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await enviarImagemChatLote(conversationId, orderId, imageUri, legenda);
    return;
  }

  const { data: nivel, error } = await supabase.rpc('lote_chat_enviar_comprador', {
    p_conversation_id: conversationId,
    p_body: caption,
    p_image_url: imageUrl,
  });
  if (error) throw new Error(error.message);

  if ((nivel as LotChatNivel) === 'ia') {
    const resultado = await processarMensagemLoteChat(orderId, legenda || 'foto enviada', undefined, {
      temImagem: true,
    });
    await registrarRespostasIa(conversationId, resultado);
  }
}
