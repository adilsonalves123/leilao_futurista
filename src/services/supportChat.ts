import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SUPORTE_MSG_ENCERRADO_INATIVIDADE,
} from '@/src/constants/supportChat';
import { INTEGRACOES_DO_AGENTE_IA } from '@/src/content/suporteAgentConfig';
import { isMockMode } from '@/src/lib/mockMode';
import { getMockSession } from '@/src/lib/mockSession';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { sincronizarConversaMockApp } from '@/src/services/adminSuporteChat';
import { enviarFotoSuporteChat } from '@/src/services/supportChatUpload';
import {
  processarMensagemSuporteAi,
  solicitarAtendimentoHumanoSuporte,
} from '@/src/services/suporteAiAgent';
import { processarMensagemSuporte } from '@/src/services/suporteAgent';
import type { SupportConversationStatus, SupportMessage } from '@/src/types/supportChat';

const MOCK_STORE_KEY = '@aetherion/support_chat_mock';

type MockStore = {
  conversationId: string | null;
  status: SupportConversationStatus;
  messages: SupportMessage[];
};

function novoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mensagensIniciaisMock(): SupportMessage[] {
  return INTEGRACOES_DO_AGENTE_IA.mensagens_iniciais.map((body, i) => ({
    id: `bot-init-${i}`,
    role: 'bot' as const,
    body,
    imageUrl: null,
    createdAt: new Date(Date.now() - (3 - i) * 1000).toISOString(),
  }));
}

function mapMensagem(row: {
  id: string;
  role: string;
  body: string;
  image_url?: string | null;
  created_at: string;
}): SupportMessage {
  return {
    id: row.id,
    role: row.role as SupportMessage['role'],
    body: row.body,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}

async function respostaBotParaFoto(
  conversationId: string,
  legenda: string,
): Promise<{ respostas: string[]; modoHumano: boolean }> {
  const t = legenda.trim();
  if (t && t !== '📷 Foto enviada') {
    return gerarRespostasBot(conversationId, t);
  }
  return {
    respostas: [
      'Recebi sua foto! 📷\n\n' +
        'Se for sobre um pedido, documento ou comprovante, descreva em uma linha o assunto. ' +
        'Para contestação de fatura, use o atalho Atendente humano.',
    ],
    modoHumano: false,
  };
}

async function gerarRespostasBot(
  conversationId: string,
  texto: string,
  atalhoId?: string,
): Promise<{ respostas: string[]; modoHumano: boolean }> {
  const resultado = await processarMensagemSuporteAi(conversationId, texto, atalhoId);

  if (resultado.escalateHuman) {
    if (isMockMode() || !isSupabaseConfigured()) {
      const store = await lerMock();
      store.status = 'atendimento_humano';
      const respostas = await processarMensagemSuporte(texto, atalhoId);
      await salvarMock(store);
      return { respostas, modoHumano: true };
    }

    const supabase = getSupabase();
    if (supabase) {
      const fallback = await solicitarAtendimentoHumanoSuporte(conversationId);
      if (fallback.length) {
        return { respostas: fallback, modoHumano: true };
      }
      return { respostas: [], modoHumano: true };
    }
  }

  return { respostas: resultado.respostas, modoHumano: false };
}

async function lerMock(): Promise<MockStore> {
  const raw = await AsyncStorage.getItem(MOCK_STORE_KEY);
  if (!raw) {
    return {
      conversationId: 'mock-conv-1',
      status: 'bot_ativo',
      messages: mensagensIniciaisMock(),
    };
  }
  try {
    return JSON.parse(raw) as MockStore;
  } catch {
    return {
      conversationId: 'mock-conv-1',
      status: 'bot_ativo',
      messages: [],
    };
  }
}

async function salvarMock(store: MockStore): Promise<void> {
  await AsyncStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
}

export async function obterOuCriarConversaSuporte(): Promise<string | null> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) return null;

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    if (!store.conversationId) {
      store.conversationId = novoId('mock-conv');
    }
    await salvarMock(store);
    return store.conversationId;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const store = await lerMock();
    return store.conversationId;
  }

  const { data, error } = await supabase.rpc('suporte_obter_ou_criar_conversa');
  if (error) {
    throw new Error(
      error.message.includes('suporte_obter_ou_criar_conversa')
        ? 'Execute supabase/migrations/033_support_chat.sql no Supabase.'
        : error.message,
    );
  }
  return data as string;
}

export async function listarMensagensSuporte(conversationId: string): Promise<SupportMessage[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    return store.messages;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await lerMock()).messages;
  }

  const { data, error } = await supabase.rpc('suporte_listar_mensagens', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; role: string; body: string; created_at: string }[]).map(
    mapMensagem,
  );
}

export async function statusConversaSuporte(
  conversationId: string,
): Promise<SupportConversationStatus> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return (await lerMock()).status;
  }

  const supabase = getSupabase();
  if (!supabase) return (await lerMock()).status;

  const { data, error } = await supabase.rpc('suporte_status_conversa', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return data as SupportConversationStatus;
}

export async function enviarMensagemSuporteUsuario(
  conversationId: string,
  texto: string,
  atalhoId?: string,
): Promise<SupportMessage[]> {
  const limpo = texto.trim();
  const exibicaoUsuario =
    atalhoId === 'kyc'
      ? 'Qual é o status do meu KYC?'
      : atalhoId === 'rastreio'
        ? 'Quero consultar o rastreio dos meus arremates'
        : atalhoId === 'carteira'
          ? 'Explique meu saldo na carteira'
          : atalhoId === 'humano'
            ? 'Preciso falar com um atendente sobre minha fatura'
            : limpo;

  if (!exibicaoUsuario.trim()) return [];

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const userMsg: SupportMessage = {
      id: novoId('user'),
      role: 'user',
      body: exibicaoUsuario,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    store.messages.push(userMsg);

    const novasBot: SupportMessage[] = [];
    if (store.status === 'bot_ativo') {
      const { respostas, modoHumano } = await gerarRespostasBot(
        conversationId,
        limpo || exibicaoUsuario,
        atalhoId,
      );
      if (modoHumano) store.status = 'atendimento_humano';
      for (const body of respostas) {
        novasBot.push({
          id: novoId('bot'),
          role: 'bot',
          body,
          imageUrl: null,
          createdAt: new Date().toISOString(),
        });
      }
      store.messages.push(...novasBot);
    }

    await salvarMock(store);
    await sincronizarConversaMockApp(conversationId, store.messages, exibicaoUsuario);
    return [userMsg, ...novasBot];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return enviarMensagemSuporteUsuario(conversationId, texto, atalhoId);
  }

  const { data: status, error: sendErr } = await supabase.rpc('suporte_enviar_mensagem_usuario', {
    p_conversation_id: conversationId,
    p_body: exibicaoUsuario,
    p_image_url: null,
  });
  if (sendErr) throw new Error(sendErr.message);

  const userMsg: SupportMessage = {
    id: novoId('user-local'),
    role: 'user',
    body: exibicaoUsuario,
    imageUrl: null,
    createdAt: new Date().toISOString(),
  };

  const novasBot: SupportMessage[] = [];
  if ((status as SupportConversationStatus) === 'bot_ativo') {
    const { respostas, modoHumano } = await gerarRespostasBot(
      conversationId,
      limpo || exibicaoUsuario,
      atalhoId,
    );
    if (respostas.length) {
      await supabase.rpc('suporte_registrar_mensagens_bot', {
        p_conversation_id: conversationId,
        p_corpos: respostas,
      });
      const agora = Date.now();
      respostas.forEach((body, i) => {
        novasBot.push({
          id: novoId(`bot-${i}`),
          role: 'bot',
          body,
          imageUrl: null,
          createdAt: new Date(agora + i).toISOString(),
        });
      });
    }
    if (modoHumano) {
      return [userMsg, ...novasBot];
    }
  }

  return [userMsg, ...novasBot];
}

export async function enviarImagemSuporteUsuario(
  conversationId: string,
  imageUri: string,
  legenda?: string,
): Promise<SupportMessage[]> {
  const caption = legenda?.trim() || '📷 Foto enviada';
  const imageUrl = await enviarFotoSuporteChat(conversationId, imageUri);

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const userMsg: SupportMessage = {
      id: novoId('user'),
      role: 'user',
      body: caption,
      imageUrl,
      createdAt: new Date().toISOString(),
    };
    store.messages.push(userMsg);

    const novasBot: SupportMessage[] = [];
    if (store.status === 'bot_ativo') {
      const { respostas, modoHumano } = await respostaBotParaFoto(conversationId, caption);
      if (modoHumano) store.status = 'atendimento_humano';
      for (const body of respostas) {
        novasBot.push({
          id: novoId('bot'),
          role: 'bot',
          body,
          imageUrl: null,
          createdAt: new Date().toISOString(),
        });
      }
      store.messages.push(...novasBot);
    }

    await salvarMock(store);
    await sincronizarConversaMockApp(conversationId, store.messages, caption);
    return [userMsg, ...novasBot];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return enviarImagemSuporteUsuario(conversationId, imageUri, legenda);
  }

  const { data: status, error: sendErr } = await supabase.rpc('suporte_enviar_mensagem_usuario', {
    p_conversation_id: conversationId,
    p_body: caption,
    p_image_url: imageUrl,
  });
  if (sendErr) {
    throw new Error(
      sendErr.message.includes('p_image_url') || sendErr.message.includes('suporte_enviar_mensagem')
        ? 'Execute supabase/migrations/034_support_chat_images.sql no Supabase.'
        : sendErr.message,
    );
  }

  const userMsg: SupportMessage = {
    id: novoId('user-local'),
    role: 'user',
    body: caption,
    imageUrl,
    createdAt: new Date().toISOString(),
  };

  const novasBot: SupportMessage[] = [];
  if ((status as SupportConversationStatus) === 'bot_ativo') {
    const { respostas, modoHumano } = await respostaBotParaFoto(conversationId, caption);
    if (respostas.length) {
      await supabase.rpc('suporte_registrar_mensagens_bot', {
        p_conversation_id: conversationId,
        p_corpos: respostas,
      });
      const agora = Date.now();
      respostas.forEach((body, i) => {
        novasBot.push({
          id: novoId(`bot-${i}`),
          role: 'bot',
          body,
          imageUrl: null,
          createdAt: new Date(agora + i).toISOString(),
        });
      });
    }
    if (modoHumano) {
      return [userMsg, ...novasBot];
    }
  }

  return [userMsg, ...novasBot];
}

/** Sincroniza mensagens iniciais do bot na primeira conversa Supabase vazia */
export async function garantirMensagensIniciaisSuporte(conversationId: string): Promise<void> {
  const existentes = await listarMensagensSuporte(conversationId);
  if (existentes.length > 0) return;

  if (isMockMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const status = await statusConversaSuporte(conversationId);
  if (status !== 'bot_ativo') return;

  await supabase.rpc('suporte_registrar_mensagens_bot', {
    p_conversation_id: conversationId,
    p_corpos: [...INTEGRACOES_DO_AGENTE_IA.mensagens_iniciais],
  });
}

export function labelUsuarioMock(): string {
  const s = getMockSession();
  return s?.email ?? 'Usuário demo';
}

export async function encerrarConversaSuportePorInatividade(
  conversationId: string,
): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    if (store.status === 'encerrado') return;
    store.status = 'encerrado';
    store.messages.push({
      id: novoId('bot-inatividade'),
      role: 'bot',
      body: SUPORTE_MSG_ENCERRADO_INATIVIDADE,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    await salvarMock(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await encerrarConversaSuportePorInatividade(conversationId);
    return;
  }

  const { error } = await supabase.rpc('suporte_encerrar_por_inatividade', {
    p_conversation_id: conversationId,
  });
  if (error) {
    throw new Error(
      error.message.includes('suporte_encerrar_por_inatividade')
        ? 'Execute supabase/migrations/045_support_chat_inactivity.sql no Supabase.'
        : error.message,
    );
  }
}

export async function reiniciarChamadoSuporte(): Promise<string | null> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) return null;

  if (isMockMode() || !isSupabaseConfigured()) {
    const convId = novoId('mock-conv');
    const store: MockStore = {
      conversationId: convId,
      status: 'bot_ativo',
      messages: mensagensIniciaisMock(),
    };
    await salvarMock(store);
    return convId;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return reiniciarChamadoSuporte();
  }

  const { data, error } = await supabase.rpc('suporte_reiniciar_chamado');
  if (error) {
    throw new Error(
      error.message.includes('suporte_reiniciar_chamado')
        ? 'Execute supabase/migrations/045_support_chat_inactivity.sql no Supabase.'
        : error.message,
    );
  }

  const convId = data as string;
  await garantirMensagensIniciaisSuporte(convId);
  return convId;
}
