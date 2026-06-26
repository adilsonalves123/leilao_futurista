import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { useLiveAuctionChat } from '@/src/hooks/useLiveAuctionChat';
import type { LiveAuctionMessage } from '@/src/types/liveAuctionChat';

const C = {
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  accent: '#7C3AED',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  liveRed: '#EF4444',
  systemBg: '#F9FAFB',
  systemText: '#6B7280',
};

type ChatState = Pick<
  ReturnType<typeof useLiveAuctionChat>,
  'mensagens' | 'carregando' | 'enviando' | 'autenticado' | 'enviar'
>;

type Props = ChatState & {
  /** Leilão em andamento (status live / countdown ativo) */
  ativo: boolean;
};

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BubbleMensagem({ msg }: { msg: LiveAuctionMessage }) {
  if (msg.isSystemMessage) {
    return (
      <View style={styles.systemBubbleWrap}>
        <Text style={styles.systemBubbleText}>{msg.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.userBubble}>
      <View style={styles.userBubbleHeader}>
        <View style={styles.avatarDot}>
          <Text style={styles.avatarInitial}>{msg.username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {msg.username}
        </Text>
        <Text style={styles.msgTime}>{formatarHora(msg.createdAt)}</Text>
      </View>
      <Text style={styles.userMessage}>{msg.message}</Text>
    </View>
  );
}

export function LiveAuctionChat({
  ativo,
  mensagens,
  carregando,
  enviando,
  autenticado,
  enviar,
}: Props) {
  const [entrada, setEntrada] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [mensagens.length, enviando]);

  const handleEnviar = useCallback(async () => {
    const texto = entrada.trim();
    if (!texto || enviando) return;

    if (!autenticado) {
      Alert.alert('Login necessário', 'Entre na sua conta para participar do chat ao vivo.');
      return;
    }

    const resultado = await enviar(texto);
    if (!resultado.ok) {
      Alert.alert('Mensagem bloqueada', resultado.erro);
      return;
    }
    setEntrada('');
  }, [entrada, enviando, autenticado, enviar]);

  if (!ativo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.headerTitle}>Chat ao Vivo</Text>
        </View>
        <View style={styles.viewersChip}>
          <Ionicons name="chatbubbles-outline" size={13} color={C.accent} />
          <Text style={styles.viewersChipText}>{mensagens.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Converse com quem está assistindo — mensagens ofensivas são bloqueadas automaticamente.
      </Text>

      <View style={styles.feedWrap}>
        {carregando ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={C.accent} size="small" />
          </View>
        ) : mensagens.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="megaphone-outline" size={22} color={C.textMuted} />
            <Text style={styles.emptyText}>
              Seja o primeiro a comentar! A disputa está quente 🔥
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.feedScroll}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {mensagens.map((msg) => (
              <BubbleMensagem key={msg.id} msg={msg} />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, !autenticado && styles.inputDisabled]}
          value={entrada}
          onChangeText={setEntrada}
          placeholder={autenticado ? 'Digite sua mensagem…' : 'Entre para participar do chat'}
          placeholderTextColor={C.textMuted}
          editable={autenticado && !enviando}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleEnviar}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendBtn, (!entrada.trim() || enviando || !autenticado) && styles.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={!entrada.trim() || enviando || !autenticado}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem no chat ao vivo">
          {enviando ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.liveRed,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  viewersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  viewersChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  subtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 12,
    lineHeight: 17,
  },
  feedWrap: {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingWrap: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 12,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  systemBubbleWrap: {
    alignSelf: 'center',
    backgroundColor: C.systemBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '95%',
  },
  systemBubbleText: {
    fontSize: 12,
    color: C.systemText,
    textAlign: 'center',
    fontWeight: '500',
  },
  userBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        }),
  },
  userBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  avatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: '800',
    color: C.accent,
  },
  userName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: C.textPrimary,
  },
  msgTime: {
    fontSize: 10,
    color: C.textMuted,
  },
  userMessage: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    fontSize: 14,
    color: C.textPrimary,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
