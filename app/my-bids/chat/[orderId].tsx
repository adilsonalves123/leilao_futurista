import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ATALHOS_LOTE_CHAT } from '@/src/content/lotChatAgentConfig';
import {
  enviarImagemChatLote,
  enviarMensagemChatLote,
  executarVerificacoesAutomaticasChatLote,
  listarMensagensChatLote,
  obterOuCriarChatLote,
  statusChatLote,
} from '@/src/services/lotChat';
import type { LotChatMessage, LotChatNivel } from '@/src/types/lotChat';
import { LOT_CHAT_NIVEL_LABELS } from '@/src/types/lotChat';
import { lightColors } from '@/src/theme/lightTokens';

type UiMessage = {
  id: string;
  isMine: boolean;
  isBot: boolean;
  label: string;
  text: string;
  imageUrl: string | null;
};

function mapUi(m: LotChatMessage): UiMessage {
  const isMine = m.senderRole === 'comprador';
  const isBot = m.senderRole === 'ia';
  const label =
    m.senderRole === 'comprador'
      ? 'Você'
      : m.senderRole === 'ia'
        ? 'Assistente'
        : m.senderRole === 'admin'
          ? 'Plataforma'
          : 'Vendedor';
  const prefix =
    m.senderRole === 'admin' || m.senderRole === 'vendedor' ? `${label}: ` : '';
  const soFoto = m.body === '📷 Foto enviada' && !!m.imageUrl;
  return {
    id: m.id,
    isMine,
    isBot,
    label,
    text: soFoto ? '' : `${prefix}${m.body}`,
    imageUrl: m.imageUrl,
  };
}

export default function LoteChatScreen() {
  const { orderId, title, code } = useLocalSearchParams<{
    orderId: string;
    title?: string;
    code?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<UiMessage>>(null);

  const [mensagens, setMensagens] = useState<UiMessage[]>([]);
  const [entrada, setEntrada] = useState('');
  const [processando, setProcessando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [nivel, setNivel] = useState<LotChatNivel>('ia');

  const recarregar = useCallback(async (convId: string) => {
    const [msgs, st] = await Promise.all([
      listarMensagensChatLote(convId),
      statusChatLote(convId),
    ]);
    setMensagens(msgs.map(mapUi));
    setNivel(st.nivel);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let ativo = true;
    (async () => {
      try {
        const convId = await obterOuCriarChatLote(orderId);
        if (!ativo) return;
        setConversationId(convId);
        await executarVerificacoesAutomaticasChatLote(convId, orderId);
        await recarregar(convId);
      } catch (e) {
        Alert.alert('Chat do lote', e instanceof Error ? e.message : 'Erro ao abrir chat.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [orderId, recarregar]);

  useEffect(() => {
    if (!conversationId) return;
    const id = setInterval(() => {
      recarregar(conversationId).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [conversationId, recarregar]);

  const enviar = useCallback(
    async (texto: string, atalhoId?: string) => {
      if (!conversationId || !orderId || processando) return;
      const limpo = texto.trim();
      if (!limpo && !atalhoId) return;
      setEntrada('');
      setProcessando(true);
      try {
        await enviarMensagemChatLote(conversationId, orderId, limpo || texto, atalhoId);
        await recarregar(conversationId);
      } catch (e) {
        Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar.');
      } finally {
        setProcessando(false);
      }
    },
    [conversationId, orderId, processando, recarregar],
  );

  const enviarFoto = useCallback(async () => {
    if (!conversationId || !orderId || processando) return;
    const uri = await escolherImagemSuporteChat();
    if (!uri) return;
    setProcessando(true);
    try {
      await enviarImagemChatLote(conversationId, orderId, uri, entrada.trim() || undefined);
      setEntrada('');
      await recarregar(conversationId);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar foto.');
    } finally {
      setProcessando(false);
    }
  }, [conversationId, orderId, entrada, processando, recarregar]);

  function renderItem({ item }: { item: UiMessage }) {
    return (
      <View
        style={[
          styles.bubbleWrap,
          item.isMine ? styles.bubbleWrapUser : styles.bubbleWrapOther,
        ]}>
        {!item.isMine ? (
          <View style={styles.avatar}>
            <Ionicons
              name={item.isBot ? 'sparkles' : item.label === 'Vendedor' ? 'storefront' : 'shield'}
              size={14}
              color={lightColors.accent}
            />
          </View>
        ) : null}
        <View style={[styles.bubble, item.isMine ? styles.bubbleUser : styles.bubbleOther]}>
          {!item.isMine ? <Text style={styles.bubbleLabel}>{item.label}</Text> : null}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
          ) : null}
          {item.text ? (
            <Text style={[styles.bubbleText, item.isMine && styles.bubbleTextUser]}>
              {item.text}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const tituloLote = title ?? 'Chat do lote';
  const subtitulo = code ? `Pedido ${code} · ${LOT_CHAT_NIVEL_LABELS[nivel]}` : LOT_CHAT_NIVEL_LABELS[nivel];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#1A1625" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {tituloLote}
          </Text>
          <Text style={styles.headerSub}>{subtitulo}</Text>
        </View>
      </View>

      {nivel !== 'ia' ? (
        <View style={styles.nivelBanner}>
          <Text style={styles.nivelBannerText}>
            {nivel === 'admin'
              ? 'Atendimento da plataforma ativo — o robô está pausado.'
              : 'O vendedor também pode ver e responder nesta conversa.'}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        {carregando ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={lightColors.accent} />
        ) : (
          <FlatList
            ref={listRef}
            data={mensagens}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {processando ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={lightColors.accent} />
            <Text style={styles.typingText}>Processando…</Text>
          </View>
        ) : null}

        <View style={styles.atalhosRow}>
          {ATALHOS_LOTE_CHAT.map((a) => (
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
            style={[styles.attachBtn, processando && styles.attachBtnOff]}
            onPress={enviarFoto}
            disabled={processando}
            accessibilityLabel="Enviar foto">
            <Ionicons name="camera" size={22} color={lightColors.accent} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Mensagem sobre este lote…"
            placeholderTextColor="#9CA3AF"
            value={entrada}
            onChangeText={setEntrada}
            multiline
            maxLength={800}
            editable={!processando}
          />
          <Pressable
            style={[styles.sendBtn, (!entrada.trim() || processando) && styles.sendBtnOff]}
            onPress={() => enviar(entrada)}
            disabled={!entrada.trim() || processando}>
            <Ionicons name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
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
    backgroundColor: '#FFF',
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1625' },
  headerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  nivelBanner: {
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nivelBannerText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600', textAlign: 'center' },
  chatArea: { flex: 1 },
  listContent: { padding: 14, gap: 8, paddingBottom: 8 },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  bubbleWrapOther: { alignSelf: 'flex-start', maxWidth: '92%' },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '88%' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleOther: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E9E0FF',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: lightColors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 },
  bubbleImage: { width: 220, height: 165, borderRadius: 12, marginBottom: 6, backgroundColor: '#E5E7EB' },
  bubbleText: { fontSize: 14, lineHeight: 21, color: '#374151' },
  bubbleTextUser: { color: '#FFF' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  typingText: { fontSize: 12, color: '#9CA3AF' },
  atalhosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  atalhoChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    backgroundColor: '#FFF',
  },
  atalhoText: { fontSize: 12, fontWeight: '600', color: lightColors.accent },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  attachBtnOff: { opacity: 0.45 },
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
  sendBtnOff: { opacity: 0.45 },
});
