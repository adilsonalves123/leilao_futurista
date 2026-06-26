import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
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
import { JarvisScanIndicator } from '@/components/ai/JarvisScanIndicator';
import { JarvisTerminalComposer } from '@/components/ai/JarvisTerminalComposer';
import { JarvisVoiceControls } from '@/components/ai/JarvisVoiceControls';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { useJarvisVoice } from '@/src/hooks/useJarvisVoice';
import { ADMIN_AI_SUGGESTIONS } from '@/src/types/adminAi';
import type { AdminAiChatMessage } from '@/src/hooks/useAdminAiAssistant';

type Props = {
  messages: AdminAiChatMessage[];
  carregando: boolean;
  enviando: boolean;
  erro: string | null;
  entrada: string;
  onChangeEntrada: (v: string) => void;
  onSend: (text?: string) => void;
  expandido?: boolean;
  onToggleExpand?: () => void;
  modelo?: string | null;
};

const SUGGESTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Resumo operacional das últimas 24h': 'analytics-outline',
  'Quantos erros Pix tivemos?': 'flash-outline',
  'O que precisa de atenção agora?': 'eye-outline',
  'Situação das disputas abertas': 'scale-outline',
};

function BootScreen({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) {
  return (
    <View style={styles.boot}>
      <JarvisAiAvatar size={52} />
      <Text style={styles.bootTitle}>Assistente Adilson</Text>
      <Text style={styles.bootSub}>
        Pix, KYC, disputas e erros do sistema em um só lugar.{'\n'}
        Escolha uma sugestão abaixo ou faça sua pergunta.
      </Text>
      <JarvisDirectivePanel
        title="Perguntas sugeridas"
        suggestions={ADMIN_AI_SUGGESTIONS}
        icons={SUGGESTION_ICONS}
        onSelect={onSend}
        disabled={disabled}
        variant="modern"
      />
    </View>
  );
}

export function AdminAiAssistantPanel({
  messages,
  carregando,
  enviando,
  erro,
  entrada,
  onChangeEntrada,
  onSend,
  expandido = false,
  onToggleExpand,
  modelo,
}: Props) {
  const listRef = useRef<FlatList<AdminAiChatMessage>>(null);
  const [offlineDetalhe, setOfflineDetalhe] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layoutCompacto = width < 820 || height < 520;
  const showBoot = !carregando && messages.length === 0;
  const processing = carregando || enviando;
  const lastSpokenIdRef = useRef<string | null>(null);

  const onTranscriptInterim = useCallback(
    (text: string) => onChangeEntrada(text),
    [onChangeEntrada],
  );
  const onTranscriptFinal = useCallback(
    (text: string) => {
      onChangeEntrada(text);
      if (text.trim()) onSend(text);
    },
    [onChangeEntrada, onSend],
  );

  const voz = useJarvisVoice({ onTranscriptInterim, onTranscriptFinal });

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || enviando || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    void voz.falarResposta(last.text);
  }, [messages, enviando, voz]);

  const iaOffline =
    modelo === 'deterministic-fallback' ||
    modelo === 'local-deterministic' ||
    modelo === 'local-fallback' ||
    /OPENAI|401|api key/i.test(erro ?? '');
  const avisoVoz = voz.erro;

  const statusLabel = processing
    ? 'Pensando…'
    : iaOffline
      ? 'Modo local'
      : 'Pronto';
  const statusColor = processing ? m.purple : iaOffline ? '#F87171' : '#059669';

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length, enviando]);

  return (
    <View
      style={[
        styles.panel,
        expandido && styles.panelExpandido,
        expandido && layoutCompacto && { paddingBottom: Math.max(insets.bottom, 8) },
      ]}>
      <View style={[styles.panelHeader, layoutCompacto && styles.panelHeaderCompacto]}>
        <View style={styles.headerLeft}>
          <JarvisAiAvatar size={layoutCompacto ? 30 : 34} />
          <View style={styles.headerCopy}>
            <Text style={styles.panelTitle} numberOfLines={1}>
              Assistente Adilson
            </Text>
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
              <Text style={styles.panelSub} numberOfLines={1}>
                {iaOffline ? 'IA offline — respostas limitadas' : 'Assistente de operações Levou'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {onToggleExpand ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                expandido && styles.iconBtnClose,
                pressed && styles.iconBtnPressed,
              ]}
              onPress={onToggleExpand}
              accessibilityRole="button"
              accessibilityLabel={expandido ? 'Fechar tela cheia' : 'Maximizar chat'}>
              <Ionicons
                name={expandido ? 'close' : 'expand-outline'}
                size={expandido ? 18 : 16}
                color={expandido ? '#DC2626' : m.textSecondary}
              />
            </Pressable>
          ) : null}
          <View style={[styles.statusBadge, iaOffline && styles.statusBadgeOffline]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, iaOffline && styles.statusBadgeTextOffline]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {iaOffline ? (
        <Pressable
          style={styles.offlineBanner}
          onPress={() => setOfflineDetalhe((v) => !v)}
          accessibilityRole="button">
          <Ionicons name="cloud-offline-outline" size={15} color="#DC2626" />
          <Text style={styles.offlineText} numberOfLines={offlineDetalhe ? undefined : 2}>
            {offlineDetalhe
              ? 'Configure OPENAI_API_KEY no Supabase (npx supabase secrets set OPENAI_API_KEY=...) para respostas completas. Enquanto isso, o assistente usa respostas locais limitadas.'
              : 'IA offline — configure OPENAI_API_KEY no Supabase para respostas inteligentes.'}
          </Text>
          <Ionicons
            name={offlineDetalhe ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#DC2626"
          />
        </Pressable>
      ) : null}

      <View style={styles.chatBody}>
        {carregando ? (
          <View style={styles.loading}>
            <JarvisScanIndicator label="Carregando contexto operacional…" variant="modern" />
          </View>
        ) : showBoot ? (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContentBoot}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <BootScreen onSend={onSend} disabled={enviando} />
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <JarvisLogEntry
                role={item.role}
                text={item.text}
                assistantLabel="Adilson"
                compact={layoutCompacto}
                variant="modern"
              />
            )}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              layoutCompacto && styles.listContentCompacto,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            ListFooterComponent={
              enviando ? (
                <JarvisScanIndicator label="Adilson está respondendo…" compact variant="modern" />
              ) : null
            }
          />
        )}
      </View>

      {erro && !iaOffline ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={14} color={m.warning} />
          <Text style={styles.errorText}>{erro}</Text>
        </View>
      ) : null}

      {avisoVoz ? (
        <View style={styles.voiceErrorBox}>
          <Ionicons name="mic-off-outline" size={14} color="#DC2626" />
          <Text style={styles.voiceErrorText}>{avisoVoz}</Text>
        </View>
      ) : null}

      {!showBoot && !expandido ? (
        <View style={styles.directiveCompact}>
          <JarvisDirectivePanel
            title="Sugestões"
            suggestions={ADMIN_AI_SUGGESTIONS}
            icons={SUGGESTION_ICONS}
            onSelect={onSend}
            disabled={enviando || carregando}
            compact
            variant="modern"
          />
        </View>
      ) : null}

      {!showBoot && expandido ? (
        <View style={styles.directiveChips}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.directiveChipsContent}>
            {ADMIN_AI_SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                onPress={() => onSend(s)}
                disabled={enviando}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {s.length > 28 ? `${s.slice(0, 26)}…` : s}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.composerWrap, layoutCompacto && styles.composerWrapCompacto]}>
        <JarvisVoiceControls
          escutando={voz.escutando}
          falando={voz.falando}
          vozRespostaAtiva={voz.vozRespostaAtiva}
          sttOk={voz.sttOk}
          disabled={enviando}
          onToggleEscuta={() => void voz.iniciarEscuta()}
          onToggleVozResposta={voz.toggleVozResposta}
          compact={layoutCompacto}
          variant="modern"
        />
        <JarvisTerminalComposer
          value={entrada}
          onChangeText={onChangeEntrada}
          onSend={() => onSend()}
          disabled={enviando}
          processing={enviando}
          autoFocus={expandido && Platform.OS === 'web'}
          webSingleLine={Platform.OS === 'web'}
          placeholder="Pergunte ao Adilson…"
          variant="modern"
          hint={
            Platform.OS === 'web'
              ? 'Enter envia · Shift+Enter quebra linha'
              : 'Toque no campo para digitar'
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: m.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: m.border,
    overflow: 'hidden',
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({ display: 'flex', flexDirection: 'column', height: '100%' } as object)
      : {}),
  },
  panelExpandido: {
    borderRadius: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          height: '100%',
        } as object)
      : { flex: 1 }),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: m.border,
    backgroundColor: m.surface,
    flexShrink: 0,
  },
  panelHeaderCompacto: { paddingVertical: 10, paddingHorizontal: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.surfaceMuted,
    borderWidth: 1,
    borderColor: m.border,
  },
  iconBtnClose: {
    borderColor: '#FECACA',
    backgroundColor: m.dangerSoft,
  },
  iconBtnPressed: { opacity: 0.85 },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: m.text,
    letterSpacing: -0.3,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  panelSub: {
    fontSize: 12,
    fontWeight: '500',
    color: m.textMuted,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: m.purpleSoft,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  statusBadgeOffline: {
    backgroundColor: m.dangerSoft,
    borderColor: '#FECACA',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: m.purpleDeep,
  },
  statusBadgeTextOffline: { color: '#DC2626' },
  offlineBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 2,
    padding: 12,
    borderRadius: 12,
    backgroundColor: m.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexShrink: 0,
  },
  offlineText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#991B1B' },
  chatBody: {
    flex: 1,
    minHeight: 0,
    backgroundColor: m.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 10, flexGrow: 1 },
  listContentCompacto: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6 },
  listContentBoot: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  boot: { alignItems: 'center', gap: 10, maxWidth: 560, alignSelf: 'center', width: '100%' },
  bootTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: m.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  bootSub: {
    fontSize: 14,
    lineHeight: 21,
    color: m.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: m.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  voiceErrorBox: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: m.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  voiceErrorText: { flex: 1, fontSize: 11, color: '#991B1B', lineHeight: 15 },
  directiveCompact: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: m.border,
    backgroundColor: m.surface,
    flexShrink: 0,
  },
  directiveChips: {
    borderTopWidth: 1,
    borderTopColor: m.border,
    backgroundColor: m.surface,
    flexShrink: 0,
  },
  directiveChipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: m.purpleSoft,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    maxWidth: 220,
  },
  chipPressed: { backgroundColor: '#EDE9FE' },
  chipText: { fontSize: 12, fontWeight: '600', color: m.purpleDeep },
  composerWrap: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: m.border,
    backgroundColor: m.surface,
    gap: 8,
  },
  composerWrapCompacto: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 8 },
});
