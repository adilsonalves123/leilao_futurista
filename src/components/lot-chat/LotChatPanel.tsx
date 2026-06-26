import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { adminC } from '@/app/admin/_components/adminStyles';
import { escolherFotoLoteChat } from '@/src/components/lot-chat/lotChatAnexo';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { enviarFotoLoteChat } from '@/src/services/lotChatUpload';
import {
  assumirControleChatAdmin,
  enviarMensagemAdminLote,
  incluirVendedorChatAdmin,
  listarMensagensChatAdmin,
  removerVendedorChatAdmin,
  statusChatAdminPedido,
} from '@/src/services/adminLotChat';
import {
  consultarAcessoChatVendedor,
  enviarMensagemVendedorLote,
  listarMensagensChatVendedor,
  mockLiberarChatVendedor,
  mockRevogarChatVendedor,
} from '@/src/services/vendorLotChat';
import type { LotChatMessage, LotChatNivel } from '@/src/types/lotChat';
import { LOT_CHAT_NIVEL_LABELS } from '@/src/types/lotChat';
import { lightColors } from '@/src/theme/lightTokens';

export type LotChatPanelMode = 'admin' | 'vendor';

type Props = {
  orderId: string;
  mode: LotChatPanelMode;
  /** Altura fixa no painel admin (web split) */
  embedded?: boolean;
  /** Modal estreito — histórico com altura fixa para não esconder o campo de texto */
  inModal?: boolean;
};

function papelLabel(role: LotChatMessage['senderRole']): string {
  if (role === 'comprador') return 'Comprador';
  if (role === 'ia') return 'Assistente IA';
  if (role === 'admin') return 'Plataforma';
  return 'Vendedor';
}

export function LotChatPanel({ orderId, mode, embedded = false, inModal = false }: Props) {
  const isAdmin = mode === 'admin';
  const C = isAdmin
    ? { accent: adminC.accent, text: adminC.textPrimary, muted: adminC.textMuted, border: adminC.border, card: '#1F2937' }
    : { accent: lightColors.accent, text: '#1A1625', muted: '#9CA3AF', border: '#E5E7EB', card: '#FFF' };

  const [mensagens, setMensagens] = useState<LotChatMessage[]>([]);
  const [entrada, setEntrada] = useState('');
  const [processando, setProcessando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [nivel, setNivel] = useState<LotChatNivel>('ia');
  const [vendedorVisivel, setVendedorVisivel] = useState(false);
  const [chatLiberado, setChatLiberado] = useState(false);
  const [modalVendedor, setModalVendedor] = useState(false);
  const [modalRemoverVendedor, setModalRemoverVendedor] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const recarregar = useCallback(async () => {
    if (!orderId) return;

    if (isAdmin) {
      const st = await statusChatAdminPedido(orderId);
      setConversationId(st.conversationId);
      setNivel(st.nivel);
      setVendedorVisivel(st.vendedorVisivel);
      const msgs = await listarMensagensChatAdmin(st.conversationId);
      setMensagens(msgs);
      return;
    }

    const acesso = await consultarAcessoChatVendedor(orderId);
    setChatLiberado(acesso.chatLiberado);
    setNivel(acesso.nivel ?? 'ia');
    setVendedorVisivel(acesso.vendedorVisivel);
    setConversationId(acesso.conversationId);
    if (acesso.conversationId) {
      const msgs = await listarMensagensChatVendedor(acesso.conversationId);
      setMensagens(msgs);
    } else {
      setMensagens([]);
    }
  }, [orderId, isAdmin]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        await recarregar();
      } catch (e) {
        if (ativo) {
          Alert.alert('Chat do lote', e instanceof Error ? e.message : 'Erro ao carregar chat.');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [recarregar]);

  useEffect(() => {
    if (!orderId) return;
    const id = setInterval(() => {
      recarregar().catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [orderId, recarregar]);

  useEffect(() => {
    if (!conversationId || isMockMode() || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`lot-chat-admin-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lot_chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          recarregar().catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, recarregar]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [mensagens]);

  const assumirAdmin = useCallback(async () => {
    setProcessando(true);
    try {
      await assumirControleChatAdmin(orderId);
      await recarregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao assumir chat.');
    } finally {
      setProcessando(false);
    }
  }, [orderId, recarregar]);

  const confirmarIncluirVendedor = useCallback(async () => {
    setModalVendedor(false);
    setProcessando(true);
    try {
      await incluirVendedorChatAdmin(orderId);
      await mockLiberarChatVendedor(orderId);
      await recarregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao incluir vendedor.');
    } finally {
      setProcessando(false);
    }
  }, [orderId, recarregar]);

  const confirmarRemoverVendedor = useCallback(async () => {
    setModalRemoverVendedor(false);
    setProcessando(true);
    try {
      await removerVendedorChatAdmin(orderId);
      await mockRevogarChatVendedor(orderId);
      await recarregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao remover vendedor.');
    } finally {
      setProcessando(false);
    }
  }, [orderId, recarregar]);

  const enviar = useCallback(async () => {
    const limpo = entrada.trim();
    if (!limpo || processando) return;
    setEntrada('');
    setProcessando(true);
    try {
      if (isAdmin) {
        await enviarMensagemAdminLote(orderId, limpo);
      } else {
        await enviarMensagemVendedorLote(orderId, limpo);
      }
      await recarregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setProcessando(false);
    }
  }, [entrada, processando, isAdmin, orderId, recarregar]);

  const podeEnviarAdmin = nivel !== 'ia';
  const podeEnviarVendor = chatLiberado;
  const podeEnviar = isAdmin ? podeEnviarAdmin : podeEnviarVendor;
  const podeDigitar = podeEnviar && !processando;

  const enviarFoto = useCallback(async () => {
    if (!podeEnviar || processando) return;
    const uri = await escolherFotoLoteChat();
    if (!uri) return;

    setProcessando(true);
    try {
      const legenda = entrada.trim();
      const imageUrl = await enviarFotoLoteChat(orderId, uri);
      if (isAdmin) {
        await enviarMensagemAdminLote(orderId, legenda || '📷 Foto enviada', imageUrl);
      } else {
        await enviarMensagemVendedorLote(orderId, legenda || '📷 Foto enviada', imageUrl);
      }
      setEntrada('');
      await recarregar();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar foto.');
    } finally {
      setProcessando(false);
    }
  }, [entrada, isAdmin, orderId, podeEnviar, processando, recarregar]);

  function renderBanner() {
    const compact = inModal;
    const bannerBase = compact ? [styles.banner, styles.bannerCompact] : styles.banner;

    if (!isAdmin) {
      return (
        <View style={[bannerBase, styles.bannerWarn, { borderColor: '#FCD34D' }]}>
          <Text style={[styles.bannerText, { color: '#92400E' }]}>
            ⚠️ Esta conversa está sendo monitorada pela administração do SorteCódigo.
          </Text>
        </View>
      );
    }

    if (nivel === 'ia') {
      return (
        <Pressable
          style={[bannerBase, styles.bannerAction, processando && styles.bannerDisabled]}
          onPress={assumirAdmin}
          disabled={processando}>
          <Text style={styles.bannerActionText}>⚡ Intervir e Assumir (Mudar para Admin)</Text>
        </Pressable>
      );
    }

    if (nivel === 'admin') {
      return (
        <Pressable
          style={[bannerBase, styles.bannerAction, processando && styles.bannerDisabled]}
          onPress={() => setModalVendedor(true)}
          disabled={processando}>
          <Text style={styles.bannerActionText}>🤝 Incluir Vendedor no Chat</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={[bannerBase, styles.bannerTripartite, processando && styles.bannerDisabled]}
        onPress={() => setModalRemoverVendedor(true)}
        disabled={processando}>
        <Text style={styles.bannerTripartiteText}>
          👥 Modo Tripartite · Vendedor ativo — toque para remover
        </Text>
      </Pressable>
    );
  }

  if (!isAdmin && !chatLiberado) {
    return (
      <View style={[styles.root, embedded && styles.rootEmbedded, { backgroundColor: isAdmin ? adminC.bg : '#FAFAFE' }]}>
        <View style={styles.lockedBox}>
          <Ionicons name="time-outline" size={32} color={C.muted} />
          <Text style={[styles.lockedTitle, { color: C.text }]}>Aguardando liberação do suporte</Text>
          <Text style={[styles.lockedDesc, { color: C.muted }]}>
            O chat com o comprador só fica disponível quando a plataforma incluir você na conversa.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        inModal ? styles.rootInModalBox : styles.root,
        embedded && !inModal && styles.rootEmbedded,
        !inModal && { backgroundColor: isAdmin ? 'transparent' : '#FAFAFE' },
      ]}>
      <View style={[styles.panelHeader, inModal && styles.panelHeaderInModal]}>
        <Ionicons name="chatbubbles-outline" size={18} color={C.accent} />
        <Text style={[styles.panelTitle, { color: C.text }]}>Chat privado do lote</Text>
        <Text style={[styles.panelNivel, { color: C.muted }]}>{LOT_CHAT_NIVEL_LABELS[nivel]}</Text>
      </View>

      {inModal ? (
        <View style={styles.inModalTop}>
          {renderBanner()}
          {isAdmin && nivel === 'ia' ? (
            <Text style={[styles.hint, { color: C.muted }]}>
              Assuma o atendimento para enviar mensagens ao comprador.
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          {renderBanner()}
          {isAdmin && nivel === 'ia' ? (
            <Text style={[styles.hint, { color: C.muted }]}>
              Assuma o atendimento para enviar mensagens ao comprador.
            </Text>
          ) : null}
        </>
      )}

      <ScrollView
        ref={scrollRef}
        style={inModal ? styles.historicoInModalOnly : styles.historico}
        contentContainerStyle={inModal ? styles.historicoContentInModal : styles.historicoContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        {carregando ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : mensagens.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>Nenhuma mensagem ainda.</Text>
        ) : (
          mensagens.map((m) => (
            <View
              key={m.id}
              style={[
                styles.msgRow,
                m.senderRole === 'comprador' && styles.msgRowComprador,
                m.senderRole === 'admin' && styles.msgRowAdmin,
                m.senderRole === 'vendedor' && styles.msgRowVendedor,
              ]}>
              <Text style={[styles.msgMeta, { color: C.muted }]}>{papelLabel(m.senderRole)}</Text>
              {m.imageUrl ? (
                <Image
                  source={{ uri: m.imageUrl }}
                  style={[styles.msgImage, inModal && styles.msgImageInModal]}
                  resizeMode="cover"
                />
              ) : null}
              {m.body && m.body !== '📷 Foto enviada' ? (
                <Text style={[styles.msgBody, { color: C.text }, m.imageUrl && styles.msgBodyImg]}>
                  {m.body}
                </Text>
              ) : m.imageUrl ? (
                <Text style={[styles.msgBody, { color: C.muted }]}>📷 Foto enviada</Text>
              ) : (
                <Text style={[styles.msgBody, { color: C.text }]}>{m.body}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View
        style={[
          styles.inputArea,
          inModal && styles.inputAreaInModal,
          !inModal && { borderTopColor: C.border },
        ]}>
        <Pressable
          style={[styles.anexoBtn, !podeDigitar && styles.anexoBtnOff]}
          onPress={enviarFoto}
          disabled={!podeDigitar}
          accessibilityLabel="Enviar foto">
          <Ionicons name="image-outline" size={20} color={podeDigitar ? C.accent : C.muted} />
        </Pressable>
        <TextInput
          style={[
            styles.textarea,
            inModal && styles.textareaInModal,
            {
              color: C.text,
              borderColor: inModal ? '#059669' : C.border,
              backgroundColor: isAdmin ? '#0F172A' : '#FAFAFE',
            },
            !podeDigitar && styles.textareaOff,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
          placeholder={
            podeEnviar
              ? isAdmin
                ? 'Resposta da plataforma ao comprador…'
                : 'Mensagem ao comprador…'
              : isAdmin
                ? 'Assuma o chat para enviar mensagens'
                : 'Chat bloqueado'
          }
          placeholderTextColor={C.muted}
          value={entrada}
          onChangeText={setEntrada}
          multiline
          editable={podeDigitar}
          maxLength={2000}
        />
        <Pressable
          style={[styles.enviarBtn, (!entrada.trim() || !podeEnviar) && styles.enviarBtnOff]}
          onPress={enviar}
          disabled={!entrada.trim() || !podeEnviar}>
          <Ionicons name="send" size={18} color="#FFF" />
        </Pressable>
      </View>

      <Modal visible={modalVendedor} transparent animationType="fade" onRequestClose={() => setModalVendedor(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVendedor(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Incluir vendedor?</Text>
            <Text style={styles.modalBody}>
              O vendedor passará a ver o histórico e poderá responder. Você pode removê-lo depois pelo
              painel.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setModalVendedor(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmarIncluirVendedor}>
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modalRemoverVendedor}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRemoverVendedor(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalRemoverVendedor(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Remover vendedor?</Text>
            <Text style={styles.modalBody}>
              O vendedor deixará de ver e responder nesta conversa. O atendimento continua com a
              plataforma. Você pode incluí-lo novamente depois.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setModalRemoverVendedor(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, styles.modalConfirmDanger]} onPress={confirmarRemoverVendedor}>
                <Text style={styles.modalConfirmText}>Remover vendedor</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const webCol =
  Platform.OS === 'web'
    ? ({ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 } as object)
    : {};

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 280, ...webCol },
  rootEmbedded: {
    flex: 1,
    minHeight: 0,
    height: '100%' as unknown as number,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: '#111827',
    padding: 12,
    ...webCol,
  },
  rootInModalBox: {
    height: 420,
    minHeight: 420,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'column',
  },
  panelHeaderInModal: {
    marginBottom: 4,
    flexShrink: 0,
  },
  inModalTop: {
    flexShrink: 0,
    marginBottom: 4,
  },
  historicoInModalOnly: {
    flex: 1,
    minHeight: 240,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 4,
    ...(Platform.OS === 'web'
      ? ({ overflowY: 'auto', overflowX: 'hidden' } as object)
      : {}),
  },
  historicoContentInModal: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 10,
  },
  msgImageInModal: {
    width: '100%',
    maxWidth: 220,
    height: 140,
  },
  inputAreaInModal: {
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16,185,129,0.35)',
    width: '100%',
  },
  textareaInModal: {
    minHeight: 44,
    height: 44,
    flex: 1,
    fontSize: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 },
  panelTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  panelNivel: { fontSize: 11, fontWeight: '600' },
  banner: { borderRadius: 10, padding: 12, marginBottom: 8, flexShrink: 0 },
  bannerCompact: { paddingVertical: 8, paddingHorizontal: 10, marginBottom: 4 },
  bannerAction: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderWidth: 1, borderColor: adminC.accent },
  bannerActionText: { color: '#C4B5FD', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  bannerDisabled: { opacity: 0.5 },
  bannerTripartite: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: '#059669' },
  bannerTripartiteText: { color: '#6EE7B7', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  bannerWarn: { backgroundColor: '#FFFBEB', borderWidth: 1 },
  bannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  hint: { fontSize: 11, marginBottom: 8, flexShrink: 0 },
  historico: { flex: 1, minHeight: 60, minWidth: 0 },
  historicoContent: { paddingVertical: 8, gap: 10 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 13 },
  msgRow: {
    alignSelf: 'flex-start',
    maxWidth: '95%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  msgRowComprador: { borderColor: 'rgba(147, 197, 253, 0.3)' },
  msgRowAdmin: { borderColor: 'rgba(167, 139, 250, 0.35)', alignSelf: 'flex-end' },
  msgRowVendedor: { borderColor: 'rgba(52, 211, 153, 0.35)' },
  msgMeta: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  msgImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 6, backgroundColor: '#374151' },
  msgBody: { fontSize: 14, lineHeight: 20 },
  msgBodyImg: { marginTop: 4 },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  anexoBtn: {
    width: 40,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  anexoBtnOff: { opacity: 0.45 },
  enviarBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: adminC.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarBtnOff: { opacity: 0.4 },
  lockedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  lockedTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  lockedDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: adminC.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: adminC.textPrimary, marginBottom: 8 },
  modalBody: { fontSize: 14, color: adminC.textMuted, lineHeight: 20, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: adminC.textMuted, fontWeight: '700' },
  modalConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: adminC.accent,
  },
  modalConfirmDanger: {
    backgroundColor: '#B45309',
  },
  modalConfirmText: { color: '#FFF', fontWeight: '800' },
});
