import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import {
  assumirAtendimentoHumanoAdmin,
  enviarMensagemAdminSuporte,
  formatarTempoRelativo,
  listarConversasSuporteAdmin,
  listarMensagensSuporteAdmin,
  rotuloUsuarioConversa,
} from '@/src/services/adminSuporteChat';
import type { AdminConversaSuporte, SupportMessage } from '@/src/types/supportChat';
import { SUPPORT_STATUS_LABELS } from '@/src/types/supportChat';
import { adminC } from './_components/adminStyles';

const POLL_MS = 5000;

function papelLabel(role: SupportMessage['role']): string {
  if (role === 'user') return 'Usuário';
  if (role === 'admin') return 'Atendente';
  return 'Assistente';
}

export default function AdminSuporte() {
  const { temPermissao } = useAdminSession();
  const [fila, setFila] = useState<AdminConversaSuporte[]>([]);
  const [selecionada, setSelecionada] = useState<AdminConversaSuporte | null>(null);
  const [mensagens, setMensagens] = useState<SupportMessage[]>([]);
  const [carregandoFila, setCarregandoFila] = useState(true);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const digitandoRef = useRef(false);

  const carregarFila = useCallback(async () => {
    setErro(null);
    try {
      const dados = await listarConversasSuporteAdmin();
      setFila(dados);
      setSelecionada((atual) => {
        if (!atual) return atual;
        return dados.find((c) => c.id === atual.id) ?? atual;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar fila.';
      setErro(msg);
      setFila([]);
    } finally {
      setCarregandoFila(false);
    }
  }, []);

  const carregarMensagens = useCallback(async (convId: string, silencioso = false) => {
    if (!silencioso) setCarregandoChat(true);
    try {
      const msgs = await listarMensagensSuporteAdmin(convId);
      setMensagens(msgs);
      requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar mensagens.';
      if (!silencioso) Alert.alert('Erro', msg);
    } finally {
      if (!silencioso) setCarregandoChat(false);
    }
  }, []);

  const selecionarConversa = useCallback(
    (usuario: AdminConversaSuporte) => {
      setSelecionada(usuario);
      setEntrada('');
      carregarMensagens(usuario.id);
    },
    [carregarMensagens],
  );

  useEffect(() => {
    carregarFila();
  }, [carregarFila]);

  useEffect(() => {
    if (!selecionada) return;
    const id = setInterval(() => {
      carregarFila();
      if (!digitandoRef.current && !entrada.trim()) {
        carregarMensagens(selecionada.id, true);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [selecionada, entrada, carregarMensagens, carregarFila]);

  const assumirAtendimento = async () => {
    if (!selecionada) return;
    setProcessando(true);
    try {
      await assumirAtendimentoHumanoAdmin(selecionada.id);
      await carregarFila();
      const atualizada = (await listarConversasSuporteAdmin()).find((c) => c.id === selecionada.id);
      if (atualizada) setSelecionada(atualizada);
      await carregarMensagens(selecionada.id, true);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível assumir o atendimento.');
    } finally {
      setProcessando(false);
    }
  };

  const enviar = async () => {
    if (!selecionada || !entrada.trim()) return;
    setProcessando(true);
    try {
      await enviarMensagemAdminSuporte(selecionada.id, entrada);
      setEntrada('');
      await carregarMensagens(selecionada.id, true);
      await carregarFila();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setProcessando(false);
    }
  };

  if (!temPermissao('suporte')) {
    return <Redirect href="/admin/equipe" />;
  }

  const emHumano = selecionada?.status === 'atendimento_humano';
  const podeDigitar = !!selecionada && !processando;
  const podeEnviar = emHumano && podeDigitar && !!entrada.trim();

  return (
    <View style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Suporte ao Cliente</Text>
        <Text style={styles.pageSubtitle}>
          Monitore conversas do chat in-app ou assuma o atendimento humano
        </Text>
      </View>

      {erro ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erro}</Text>
          <Pressable onPress={carregarFila}>
            <Text style={styles.erroRetry}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.split}>
        <View style={styles.colFila}>
          <Text style={styles.colTitle}>Fila de atendimento</Text>
          {carregandoFila ? (
            <ActivityIndicator color={adminC.accent} style={{ marginTop: 24 }} />
          ) : fila.length === 0 ? (
            <Text style={styles.vazioFila}>Nenhuma conversa ativa no momento.</Text>
          ) : (
            <ScrollView style={styles.filaScroll} showsVerticalScrollIndicator>
              {fila.map((c) => {
                const ativo = selecionada?.id === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.cardFila, ativo && styles.cardFilaAtivo]}
                    onPress={() => selecionarConversa(c)}>
                    <View style={styles.cardFilaTop}>
                      <Text style={styles.cardFilaUser} numberOfLines={1}>
                        {rotuloUsuarioConversa(c)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          c.status === 'atendimento_humano' && styles.statusBadgeHumano,
                        ]}>
                        <Text style={styles.statusBadgeText}>
                          {SUPPORT_STATUS_LABELS[c.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardFilaPreview} numberOfLines={2}>
                      {c.ultimaMensagemPreview ?? 'Sem mensagens'}
                    </Text>
                    <Text style={styles.cardFilaTime}>
                      {formatarTempoRelativo(c.ultimaAtividadeEm)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.colChat}>
          {!selecionada ? (
            <View style={styles.placeholder}>
              <Ionicons name="chatbubbles-outline" size={48} color={adminC.textMuted} />
              <Text style={styles.placeholderText}>
                Selecione um atendimento para visualizar ou intervir
              </Text>
            </View>
          ) : (
            <View style={styles.colChatInner}>
              <View style={styles.chatHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.chatHeaderUser}>{rotuloUsuarioConversa(selecionada)}</Text>
                  <Text style={styles.chatHeaderEmail} numberOfLines={1}>
                    {selecionada.email}
                  </Text>
                </View>
                <Text style={styles.chatHeaderStatus}>
                  {SUPPORT_STATUS_LABELS[selecionada.status]}
                </Text>
              </View>

              {!emHumano ? (
                <Pressable
                  style={[styles.assumirBtn, processando && styles.assumirBtnDisabled]}
                  onPress={assumirAtendimento}
                  disabled={processando}>
                  <Text style={styles.assumirBtnText}>⚡ Assumir Atendimento Humano</Text>
                </Pressable>
              ) : (
                <View style={styles.modoHumanoBanner}>
                  <Ionicons name="person" size={16} color={adminC.success} />
                  <Text style={styles.modoHumanoText}>
                    Modo intervenção — robô pausado. Você pode responder ao usuário no app.
                  </Text>
                </View>
              )}

              <ScrollView
                ref={chatScrollRef}
                style={styles.historico}
                contentContainerStyle={styles.historicoContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled>
                {carregandoChat ? (
                  <ActivityIndicator color={adminC.accent} />
                ) : (
                  mensagens.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.msgRow,
                        m.role === 'user' && styles.msgRowUser,
                        m.role === 'admin' && styles.msgRowAdmin,
                      ]}>
                      <Text style={styles.msgMeta}>{papelLabel(m.role)}</Text>
                      {m.imageUrl ? (
                        <Image
                          source={{ uri: m.imageUrl }}
                          style={styles.msgImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      {m.body && m.body !== '📷 Foto enviada' ? (
                        <Text style={[styles.msgBody, m.imageUrl && styles.msgBodyComImagem]}>
                          {m.body}
                        </Text>
                      ) : m.imageUrl ? (
                        <Text style={styles.msgBodyComImagem}>📷 Foto enviada</Text>
                      ) : (
                        <Text style={styles.msgBody}>{m.body}</Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.inputArea}>
                <TextInput
                  style={[styles.textarea, !emHumano && styles.textareaAguardando]}
                  placeholder={
                    emHumano
                      ? 'Digite sua resposta ao usuário…'
                      : 'Digite aqui e clique em Assumir Atendimento para enviar'
                  }
                  placeholderTextColor={adminC.textMuted}
                  value={entrada}
                  onChangeText={setEntrada}
                  multiline
                  editable={podeDigitar}
                  maxLength={2000}
                  onFocus={() => {
                    digitandoRef.current = true;
                  }}
                  onBlur={() => {
                    digitandoRef.current = false;
                  }}
                />
                <Pressable
                  style={[styles.enviarBtn, !podeEnviar && styles.enviarBtnOff]}
                  onPress={enviar}
                  disabled={!podeEnviar}>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text style={styles.enviarBtnText}>Enviar</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const textareaWeb =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        cursor: 'text',
      } as object)
    : {};

const webColumn =
  Platform.OS === 'web'
    ? ({ display: 'flex', flexDirection: 'column', overflow: 'hidden' } as object)
    : {};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    ...webColumn,
  },
  pageHeader: {
    flexShrink: 0,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: adminC.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: adminC.textMuted,
    marginBottom: 0,
  },
  split: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  colFila: {
    width: 300,
    maxWidth: '36%',
    flexShrink: 0,
    alignSelf: 'stretch',
    backgroundColor: adminC.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminC.border,
    padding: 16,
    minHeight: 0,
    ...webColumn,
  },
  filaScroll: {
    flex: 1,
    minHeight: 0,
  },
  colTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: adminC.textPrimary,
    marginBottom: 12,
  },
  vazioFila: { fontSize: 13, color: adminC.textMuted, marginTop: 8 },
  cardFila: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardFilaAtivo: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  cardFilaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cardFilaUser: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: adminC.accentBright,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusBadgeHumano: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusBadgeText: { fontSize: 9, fontWeight: '700', color: adminC.textSecondary },
  cardFilaPreview: { fontSize: 13, color: adminC.textPrimary, lineHeight: 18 },
  cardFilaTime: { fontSize: 11, color: adminC.textMuted, marginTop: 6 },
  colChat: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignSelf: 'stretch',
    backgroundColor: adminC.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminC.border,
    overflow: 'hidden',
    ...webColumn,
  },
  colChatInner: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    ...webColumn,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  placeholderText: {
    fontSize: 15,
    color: adminC.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  chatHeader: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adminC.border,
  },
  chatHeaderUser: { fontSize: 16, fontWeight: '800', color: adminC.textPrimary },
  chatHeaderEmail: { fontSize: 12, color: adminC.textMuted, marginTop: 2 },
  chatHeaderStatus: { fontSize: 11, fontWeight: '600', color: adminC.accentBright },
  assumirBtn: {
    flexShrink: 0,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: adminC.warning,
    alignItems: 'center',
  },
  assumirBtnDisabled: { opacity: 0.6 },
  assumirBtnText: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  modoHumanoBanner: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  modoHumanoText: { flex: 1, fontSize: 12, color: adminC.success, fontWeight: '600' },
  historico: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as object)
      : {}),
  },
  historicoContent: { padding: 16, gap: 12, paddingBottom: 16, flexGrow: 1 },
  msgRow: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: adminC.border,
  },
  msgRowUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  msgRowAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  msgMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  msgImage: {
    width: '100%',
    maxWidth: 280,
    height: 180,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  msgBody: { fontSize: 14, color: adminC.textPrimary, lineHeight: 21 },
  msgBodyComImagem: { marginTop: 0 },
  inputArea: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: adminC.border,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  textarea: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: adminC.textPrimary,
    backgroundColor: adminC.bg,
    ...textareaWeb,
  },
  textareaAguardando: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  enviarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adminC.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  enviarBtnOff: { opacity: 0.4 },
  enviarBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  erroBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  erroText: { color: '#FCA5A5', fontSize: 13 },
  erroRetry: { color: adminC.accentBright, marginTop: 8, fontWeight: '600' },
});
