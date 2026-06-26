import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JarvisAiAvatar } from '@/components/ai/JarvisAiAvatar';
import { JarvisDirectivePanel } from '@/components/ai/JarvisDirectivePanel';
import { JarvisLogEntry } from '@/components/ai/JarvisLogEntry';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { JarvisScanIndicator } from '@/components/ai/JarvisScanIndicator';
import { JarvisTerminalComposer } from '@/components/ai/JarvisTerminalComposer';
import { JarvisVoiceControls } from '@/components/ai/JarvisVoiceControls';
import { useBuyerJarvis } from '@/src/hooks/useBuyerJarvis';
import { useJarvisVoice } from '@/src/hooks/useJarvisVoice';
import { useKeyboardBottomInset } from '@/src/hooks/useKeyboardBottomInset';
import { jarvisPararFala } from '@/src/lib/jarvisVoice/tts';
import { useJarvisOptional } from '@/src/store/jarvisContext';
import {
  BUYER_JARVIS_SUGGESTION_ICONS,
  BUYER_JARVIS_SUGGESTIONS,
} from '@/src/types/buyerJarvis';
import { formatBRL } from '@/src/lib/bids';
import { jarvisAiSecretsHint, jarvisProviderLabel } from '@/src/lib/jarvisAiStatus';
import { dispensarAlertasJarvis } from '@/src/lib/jarvisAlertDismiss';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function JarvisHubSheet({ visible, onClose }: Props) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const jarvisCtx = useJarvisOptional();
  const listRef = useRef<FlatList<{ id: string }>>(null);
  const [entrada, setEntrada] = useState('');
  const [alertasVisiveis, setAlertasVisiveis] = useState(true);
  const lastSpokenIdRef = useRef<string | null>(null);
  const wasEnviandoRef = useRef(false);

  const { messages, carregando, enviando, erro, enviarMensagem, context, alertas, iaOffline, iaOfflineMotivo, modelo, provider } = useBuyerJarvis(
    pathname,
    visible,
  );

  const enviarRef = useRef(enviarMensagem);
  enviarRef.current = enviarMensagem;

  const onTranscriptInterim = useCallback((text: string) => setEntrada(text), []);
  const onTranscriptFinal = useCallback((text: string) => {
    setEntrada(text);
    const trimmed = text.trim();
    if (!trimmed) return;
    setEntrada('');
    void enviarRef.current(trimmed);
  }, []);

  const voz = useJarvisVoice({ onTranscriptInterim, onTranscriptFinal });

  useEffect(() => {
    if (!visible) {
      lastSpokenIdRef.current = null;
      wasEnviandoRef.current = false;
      void voz.pararEscuta();
      void jarvisPararFala();
    }
  }, [visible, voz.pararEscuta]);

  useEffect(() => {
    if (!visible) return;
    if (enviando) {
      wasEnviandoRef.current = true;
      return;
    }
    if (!wasEnviandoRef.current) return;
    wasEnviandoRef.current = false;
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    void voz.falarResposta(last.text);
  }, [enviando, messages, visible, voz.falarResposta]);

  useEffect(() => {
    if (!visible) {
      setEntrada('');
      setAlertasVisiveis(true);
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length, enviando]);

  const scrollChatToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  async function handleSend(text?: string) {
    const value = (text ?? entrada).trim();
    if (!value) return;
    setEntrada('');
    await enviarMensagem(value);
  }

  const showBoot = !carregando && messages.length === 0;
  const wallet = context?.wallet;
  const temChat = messages.length > 0;
  const sheetHeight = Math.min(screenH * 0.9, screenH - insets.top - 12);
  const keyboardInset = useKeyboardBottomInset(visible);

  // Android: resize do sistema cuida do teclado. iOS: sobe o sheet pelo inset.
  const sheetMarginBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 8)
      : keyboardInset > 0
        ? keyboardInset
        : Math.max(insets.bottom, 8);

  const composerPadBottom = keyboardInset > 0 ? 10 : Math.max(insets.bottom, 12);

  useEffect(() => {
    if (keyboardInset > 0 && messages.length) {
      scrollChatToEnd();
    }
  }, [keyboardInset, messages.length, scrollChatToEnd]);

  async function ocultarAlertasSheet() {
    setAlertasVisiveis(false);
    if (alertas.length) {
      await dispensarAlertasJarvis(alertas);
      await jarvisCtx?.recarregarAlertas();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={[styles.sheetOuter, { height: sheetHeight, marginBottom: sheetMarginBottom }]}>
          <View style={styles.sheet}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <JarvisAiAvatar size={44} />
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Jarvis</Text>
                <Text style={styles.headerSub}>Assistente inteligente do Levou</Text>
                <Text style={styles.headerMeta} numberOfLines={1}>
                  {jarvisProviderLabel(provider, modelo)}
                  {wallet
                    ? ` · Saldo ${formatBRL(wallet.available_cents)} · KYC ${context?.user.kyc_status}`
                    : ''}
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={m.textSecondary} />
              </Pressable>
            </View>

            {iaOffline ? (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={m.danger} />
                <Text style={styles.offlineText}>
                  {iaOfflineMotivo ??
                    `IA generativa desligada. Respostas automáticas limitadas. ${jarvisAiSecretsHint()}`}
                </Text>
              </View>
            ) : null}

            {alertas.length > 0 && alertasVisiveis ? (
              <View style={styles.alertStrip}>
                <Ionicons name="notifications-outline" size={16} color={m.warning} />
                <View style={styles.alertStripContent}>
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {alertas[0].title}
                  </Text>
                  <Text style={styles.alertDetail} numberOfLines={1}>
                    {alertas[0].detail}
                  </Text>
                </View>
                <Pressable style={styles.alertClose} onPress={() => void ocultarAlertasSheet()} hitSlop={8}>
                  <Ionicons name="close" size={16} color={m.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.body}>
              {carregando ? (
                <View style={styles.center}>
                  <JarvisScanIndicator label="Preparando seu assistente…" variant="modern" />
                </View>
              ) : showBoot ? (
                <ScrollView
                  contentContainerStyle={styles.bootContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeTitle}>Olá! Como posso ajudar?</Text>
                    <Text style={styles.welcomeText}>
                      Tire dúvidas sobre carteira, Pix, KYC e leilões. Em um lote, faço análise completa
                      com veredito de mercado.
                    </Text>
                  </View>
                  <JarvisDirectivePanel
                    suggestions={BUYER_JARVIS_SUGGESTIONS}
                    icons={BUYER_JARVIS_SUGGESTION_ICONS}
                    onSelect={handleSend}
                    disabled={enviando}
                    variant="modern"
                  />
                </ScrollView>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  renderItem={({ item }) => (
                    <JarvisLogEntry
                      role={item.role}
                      text={item.text}
                      assistantLabel="Jarvis"
                      userLabel="Você"
                      compact
                      variant="modern"
                    />
                  )}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  ListFooterComponent={
                    enviando ? (
                      <JarvisScanIndicator label="Jarvis está pensando…" compact variant="modern" />
                    ) : null
                  }
                />
              )}
            </View>

            <View style={styles.footer}>
              {erro ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={m.warning} />
                  <Text style={styles.errorText}>{erro}</Text>
                </View>
              ) : null}

              {voz.erro ? (
                <View style={[styles.errorBanner, styles.errorBannerSoft]}>
                  <Ionicons name="mic-off-outline" size={16} color={m.danger} />
                  <Text style={[styles.errorText, { color: m.danger }]}>{voz.erro}</Text>
                </View>
              ) : null}

              {temChat ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.chipsRow}>
                  {BUYER_JARVIS_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                      onPress={() => handleSend(s)}
                      disabled={enviando}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {s.length > 28 ? `${s.slice(0, 26)}…` : s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={[styles.composerWrap, { paddingBottom: composerPadBottom }]}>
                <JarvisVoiceControls
                  escutando={voz.escutando}
                  falando={voz.falando}
                  vozRespostaAtiva={voz.vozRespostaAtiva}
                  sttOk={voz.sttOk}
                  disabled={enviando}
                  onToggleEscuta={() => void voz.iniciarEscuta()}
                  onToggleVozResposta={voz.toggleVozResposta}
                  compact
                  variant="modern"
                />
                <JarvisTerminalComposer
                  value={entrada}
                  onChangeText={setEntrada}
                  onSend={() => handleSend()}
                  disabled={enviando}
                  processing={enviando}
                  onFocus={scrollChatToEnd}
                  placeholder="Pergunte sobre carteira, Pix, KYC…"
                  variant="modern"
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: m.backdrop },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheetOuter: { width: '100%', flexShrink: 0, zIndex: 2 },
  sheet: {
    flex: 1,
    backgroundColor: m.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: m.borderStrong },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: m.border,
    backgroundColor: m.surface,
  },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: m.text },
  headerSub: { fontSize: 14, color: m.textSecondary, fontWeight: '500' },
  headerMeta: { fontSize: 12, color: m.textMuted, marginTop: 2 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: m.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  offlineText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#B91C1C' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.surfaceMuted,
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: m.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertStripContent: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  alertDetail: { fontSize: 12, color: '#B45309', lineHeight: 16 },
  alertClose: { padding: 4 },
  body: { flex: 1, minHeight: 0, backgroundColor: m.background, overflow: 'hidden' },
  list: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bootContent: { padding: 20, gap: 20, paddingBottom: 32 },
  welcomeCard: {
    backgroundColor: m.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: m.border,
    gap: 8,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: m.text },
  welcomeText: { fontSize: 15, lineHeight: 22, color: m.textSecondary },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexGrow: 1 },
  footer: { flexShrink: 0, backgroundColor: m.surface },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: m.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorBannerSoft: { backgroundColor: m.dangerSoft, borderColor: '#FECACA' },
  errorText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: m.surface,
    borderWidth: 1,
    borderColor: m.border,
    maxWidth: 220,
  },
  chipPressed: { backgroundColor: m.purpleSoft, borderColor: '#E9D5FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: m.purpleDeep },
  composerWrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: m.surface,
    borderTopWidth: 1,
    borderTopColor: m.border,
  },
});
