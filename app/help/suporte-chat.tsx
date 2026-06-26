import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { escolherImagemSuporteChat } from '@/app/help/_components/suporteChatAnexo';
import {
  SUPORTE_INATIVIDADE_MS,
  SUPORTE_NOME_ATENDIMENTO,
} from '@/src/constants/supportChat';
import { ATALHOS_SUPORTE } from '@/src/content/suporteAgentConfig';
import {
  encerrarConversaSuportePorInatividade,
  enviarImagemSuporteUsuario,
  enviarMensagemSuporteUsuario,
  garantirMensagensIniciaisSuporte,
  listarMensagensSuporte,
  obterOuCriarConversaSuporte,
  reiniciarChamadoSuporte,
  statusConversaSuporte,
} from '@/src/services/supportChat';
import type { SupportMessage, SupportMessageRole } from '@/src/types/supportChat';
import { lightColors } from '@/src/theme/lightTokens';

type ChatMessage = {
  id: string;
  role: SupportMessageRole;
  text: string;
  imageUrl: string | null;
  createdAt: number;
};

function mapMsg(m: SupportMessage): ChatMessage {
  const ehAdmin = m.role === 'admin';
  const soFoto = m.body === '📷 Foto enviada' && !!m.imageUrl;
  return {
    id: m.id,
    role: ehAdmin ? 'bot' : m.role,
    text: ehAdmin ? `👤 Atendente: ${m.body}` : soFoto ? '' : m.body,
    imageUrl: m.imageUrl,
    createdAt: new Date(m.createdAt).getTime(),
  };
}

export default function SuporteChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const ultimaInteracaoRef = useRef(Date.now());
  const encerrandoRef = useRef(false);

  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [entrada, setEntrada] = useState('');
  const [processando, setProcessando] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoHumano, setModoHumano] = useState(false);
  const [chatEncerrado, setChatEncerrado] = useState(false);

  const registrarInteracaoUsuario = useCallback(() => {
    ultimaInteracaoRef.current = Date.now();
  }, []);

  const sincronizarUltimaInteracao = useCallback((msgs: ChatMessage[]) => {
    const ultimaDoUsuario = msgs
      .filter((m) => m.role === 'user')
      .reduce((max, m) => Math.max(max, m.createdAt), 0);
    ultimaInteracaoRef.current = ultimaDoUsuario || Date.now();
  }, []);

  const carregarConversa = useCallback(async () => {
    const convId = await obterOuCriarConversaSuporte();
    if (!convId) return null;

    await garantirMensagensIniciaisSuporte(convId);
    const [msgs, status] = await Promise.all([
      listarMensagensSuporte(convId),
      statusConversaSuporte(convId),
    ]);
    const mapeadas = msgs.map(mapMsg);
    setConversationId(convId);
    setMensagens(mapeadas);
    setModoHumano(status === 'atendimento_humano');
    setChatEncerrado(status === 'encerrado');
    sincronizarUltimaInteracao(mapeadas);
    return convId;
  }, [sincronizarUltimaInteracao]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        await carregarConversa();
      } catch {
        if (ativo) setMensagens([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [carregarConversa]);

  useEffect(() => {
    if (!conversationId || chatEncerrado) return;
    const id = setInterval(async () => {
      try {
        const [msgs, status] = await Promise.all([
          listarMensagensSuporte(conversationId),
          statusConversaSuporte(conversationId),
        ]);
        const mapeadas = msgs.map(mapMsg);
        setMensagens(mapeadas);
        setModoHumano(status === 'atendimento_humano');
        if (status === 'encerrado') {
          setChatEncerrado(true);
          return;
        }

        const inativoPor = Date.now() - ultimaInteracaoRef.current;
        if (inativoPor >= SUPORTE_INATIVIDADE_MS && !encerrandoRef.current) {
          encerrandoRef.current = true;
          await encerrarConversaSuportePorInatividade(conversationId);
          const atualizadas = await listarMensagensSuporte(conversationId);
          setMensagens(atualizadas.map(mapMsg));
          setChatEncerrado(true);
          encerrandoRef.current = false;
        }
      } catch {
        encerrandoRef.current = false;
      }
    }, 4000);
    return () => clearInterval(id);
  }, [conversationId, chatEncerrado]);

  const abrirNovoChamado = useCallback(async () => {
    setProcessando(true);
    try {
      const convId = await reiniciarChamadoSuporte();
      if (!convId) return;
      await carregarConversa();
      registrarInteracaoUsuario();
    } catch (e) {
      Alert.alert(
        'Não foi possível abrir novo chamado',
        e instanceof Error ? e.message : 'Tente novamente em instantes.',
      );
    } finally {
      setProcessando(false);
    }
  }, [carregarConversa, registrarInteracaoUsuario]);

  const rolarParaFim = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (mensagens.length > 0) rolarParaFim();
  }, [mensagens.length, processando, rolarParaFim]);

  const enviar = useCallback(
    async (texto: string, atalhoId?: string) => {
      const limpo = texto.trim();
      if (!limpo && !atalhoId) return;
      if (processando || !conversationId || chatEncerrado) return;

      registrarInteracaoUsuario();
      setEntrada('');
      setProcessando(true);

      try {
        const novas = await enviarMensagemSuporteUsuario(conversationId, limpo || texto, atalhoId);
        const recarregadas = await listarMensagensSuporte(conversationId);
        setMensagens(recarregadas.map(mapMsg));
        if (!recarregadas.length && novas.length) {
          setMensagens(novas.map((m) => mapMsg({ ...m, role: m.role })));
        }
        const status = await statusConversaSuporte(conversationId);
        setModoHumano(status === 'atendimento_humano');
      } catch {
        setMensagens((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'bot',
            text: 'Não consegui processar sua mensagem agora. Tente novamente em instantes.',
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setProcessando(false);
      }
    },
    [processando, conversationId, chatEncerrado, registrarInteracaoUsuario],
  );

  const enviarFoto = useCallback(async () => {
    if (processando || !conversationId || chatEncerrado) return;
    const uri = await escolherImagemSuporteChat();
    if (!uri) return;

    registrarInteracaoUsuario();
    setProcessando(true);
    try {
      await enviarImagemSuporteUsuario(conversationId, uri, entrada.trim() || undefined);
      setEntrada('');
      const recarregadas = await listarMensagensSuporte(conversationId);
      setMensagens(recarregadas.map(mapMsg));
      const status = await statusConversaSuporte(conversationId);
      setModoHumano(status === 'atendimento_humano');
    } catch (e) {
      Alert.alert(
        'Erro ao enviar foto',
        e instanceof Error ? e.message : 'Não foi possível enviar a imagem.',
      );
    } finally {
      setProcessando(false);
    }
  }, [processando, conversationId, entrada, chatEncerrado, registrarInteracaoUsuario]);

  function renderItem({ item }: { item: ChatMessage }) {
    const ehBot = item.role === 'bot';
    return (
      <View
        style={[
          styles.bubbleWrap,
          ehBot ? styles.bubbleWrapBot : styles.bubbleWrapUser,
        ]}>
        {ehBot ? (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={14} color={lightColors.accent} />
          </View>
        ) : null}
        <View style={[styles.bubble, ehBot ? styles.bubbleBot : styles.bubbleUser]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
          ) : null}
          {item.text ? (
            <Text
              style={[
                styles.bubbleText,
                ehBot ? styles.bubbleTextBot : styles.bubbleTextUser,
                item.imageUrl && styles.bubbleTextComImagem,
              ]}>
              {item.text}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#1A1625" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{SUPORTE_NOME_ATENDIMENTO}</Text>
          <Text style={styles.headerSub}>
            {modoHumano ? 'Atendimento humano · tempo real' : 'Assistente virtual · tempo real'}
          </Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        {carregando ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={lightColors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={mensagens}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={rolarParaFim}
          />
        )}

        {chatEncerrado ? (
          <View style={styles.encerradoBanner}>
            <Ionicons name="time-outline" size={18} color="#92400E" />
            <Text style={styles.encerradoBannerText}>
              Chat encerrado por inatividade (5 min sem resposta). Abra um novo chamado para continuar.
            </Text>
            <Pressable
              style={styles.novoChamadoBtn}
              onPress={abrirNovoChamado}
              disabled={processando}>
              <Text style={styles.novoChamadoBtnText}>Novo chamado</Text>
            </Pressable>
          </View>
        ) : null}

        {modoHumano && !chatEncerrado ? (
          <View style={styles.humanoBanner}>
            <Text style={styles.humanoBannerText}>
              Um atendente está respondendo. O assistente automático está pausado.
            </Text>
          </View>
        ) : null}

        {processando ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={lightColors.accent} />
            <Text style={styles.typingText}>Assistente digitando…</Text>
          </View>
        ) : null}

        {!chatEncerrado ? (
          <>
            <View style={styles.atalhosRow}>
              {ATALHOS_SUPORTE.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.atalhoChip}
                  onPress={() => enviar('', a.id)}
                  disabled={processando}>
                  <Text style={styles.atalhoText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10 }]}>
              <Pressable
                style={[styles.attachBtn, processando && styles.attachBtnDisabled]}
                onPress={enviarFoto}
                disabled={processando || !conversationId}
                accessibilityLabel="Enviar foto">
                <Ionicons name="camera" size={22} color={lightColors.accent} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Digite sua dúvida ou legenda da foto…"
                placeholderTextColor="#9CA3AF"
                value={entrada}
                onChangeText={setEntrada}
                multiline
                maxLength={800}
                editable={!processando}
              />
              <Pressable
                style={[styles.sendBtn, (!entrada.trim() || processando) && styles.sendBtnDisabled]}
                onPress={() => enviar(entrada)}
                disabled={!entrada.trim() || processando}
                accessibilityLabel="Enviar mensagem">
                <Ionicons name="send" size={18} color="#FFF" />
              </Pressable>
            </View>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1625' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  chatArea: { flex: 1 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  bubbleWrapBot: { alignSelf: 'flex-start', maxWidth: '92%' },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '88%' },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E0FF',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: lightColors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleImage: {
    width: 220,
    height: 165,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextComImagem: { marginTop: 4 },
  bubbleTextBot: { color: '#374151' },
  bubbleTextUser: { color: '#FFFFFF' },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnDisabled: { opacity: 0.45 },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingText: { fontSize: 12, color: '#9CA3AF' },
  atalhosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  atalhoChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    backgroundColor: '#FFFFFF',
  },
  atalhoText: { fontSize: 12, fontWeight: '600', color: lightColors.accent },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1625',
    backgroundColor: '#FAFAFE',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: lightColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  humanoBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  humanoBannerText: { fontSize: 12, color: '#047857', fontWeight: '600', textAlign: 'center' },
  encerradoBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    alignItems: 'center',
  },
  encerradoBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  novoChamadoBtn: {
    backgroundColor: lightColors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  novoChamadoBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
