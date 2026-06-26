import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { MarketDealVerdictCard } from '@/components/ai/MarketDealVerdictCard';
import { useAuctionAiAdvisor } from '@/src/hooks/useAuctionAiAdvisor';
import type { AuctionAiChatMessage } from '@/src/hooks/useAuctionAiAdvisor';
import { useKeyboardBottomInset } from '@/src/hooks/useKeyboardBottomInset';
import { jarvisAiSecretsHint, jarvisProviderLabel } from '@/src/lib/jarvisAiStatus';
import { AUCTION_AI_SUGGESTIONS } from '@/src/types/auctionAi';

const SUGGESTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Compensa dar lance agora?': 'checkmark-circle-outline',
  'Qual teto máximo você sugere?': 'trending-up-outline',
  'Quanto de caução preciso?': 'wallet-outline',
  'Como comparar com o mercado?': 'analytics-outline',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  auctionId: string;
  auctionTitle: string;
  bidCents: number;
  marketCents: number | null;
  description?: string;
  conservationState?: string | null;
  category?: string | null;
};

export function AuctionAiSheet({
  visible,
  onClose,
  auctionId,
  auctionTitle,
  bidCents,
  marketCents,
  description,
  conservationState,
  category,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const listRef = useRef<FlatList<AuctionAiChatMessage>>(null);
  const [entrada, setEntrada] = useState('');

  const { messages, carregando, enviando, erro, enviarMensagem, iaOffline, iaOfflineMotivo, modelo, provider } = useAuctionAiAdvisor({
    visible,
    auctionId,
    bidCents,
    marketCents,
    title: auctionTitle,
    description,
    conservationState,
    category,
  });

  useEffect(() => {
    if (!visible) setEntrada('');
  }, [visible]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, enviando]);

  async function handleSend(text?: string) {
    const value = (text ?? entrada).trim();
    if (!value) return;
    setEntrada('');
    await enviarMensagem(value);
  }

  const showBoot = !carregando && messages.length === 0;
  const temChat = messages.length > 0;
  const sheetHeight = Math.min(screenH * 0.92, screenH - insets.top - 8);
  const keyboardInset = useKeyboardBottomInset(visible);

  const sheetMarginBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 8)
      : keyboardInset > 0
        ? keyboardInset
        : Math.max(insets.bottom, 8);

  const composerPadBottom = keyboardInset > 0 ? 10 : Math.max(insets.bottom, 12);

  useEffect(() => {
    if (keyboardInset > 0 && messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [keyboardInset, messages.length]);

  const scrollChatToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Fechar Jarvis" />

        <View style={[styles.sheetOuter, { height: sheetHeight, marginBottom: sheetMarginBottom }]}>
          <View style={styles.sheet}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <JarvisAiAvatar size={40} />
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {auctionTitle}
                </Text>
                <Text style={styles.headerSub}>
                  Análise inteligente · {jarvisProviderLabel(provider, modelo)}
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
                    `IA generativa desligada. ${jarvisAiSecretsHint()}`}
                </Text>
              </View>
            ) : null}

            <View style={styles.verdictWrap}>
              <MarketDealVerdictCard
                bidCents={bidCents}
                marketCents={marketCents}
                compact
                variant="default"
              />
            </View>

            <View style={styles.chatBody}>
              {carregando ? (
                <View style={styles.center}>
                  <JarvisScanIndicator label="Analisando o lote…" variant="modern" />
                </View>
              ) : showBoot ? (
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.bootContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeTitle}>Pergunte sobre este lote</Text>
                    <Text style={styles.welcomeText}>
                      Receba veredito de mercado, sugestão de teto e pontos de atenção antes de dar lance.
                    </Text>
                  </View>
                  <JarvisDirectivePanel
                    suggestions={AUCTION_AI_SUGGESTIONS}
                    icons={SUGGESTION_ICONS}
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
                  showsVerticalScrollIndicator={false}
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

              {temChat ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.chipsRow}>
                  {AUCTION_AI_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                      onPress={() => handleSend(s)}
                      disabled={enviando || carregando}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {s.length > 28 ? `${s.slice(0, 26)}…` : s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={[styles.composerWrap, { paddingBottom: composerPadBottom }]}>
                <JarvisTerminalComposer
                  value={entrada}
                  onChangeText={setEntrada}
                  onSend={() => handleSend()}
                  disabled={enviando || carregando}
                  processing={enviando}
                  onFocus={scrollChatToEnd}
                  placeholder="Pergunte sobre lance, mercado, teto…"
                  maxLength={500}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: m.border,
    backgroundColor: m.surface,
  },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: m.text, lineHeight: 22 },
  headerSub: { fontSize: 13, color: m.textSecondary, fontWeight: '500' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
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
  verdictWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  chatBody: { flex: 1, minHeight: 0, backgroundColor: m.background, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },
  bootContent: { padding: 20, gap: 16, paddingBottom: 28 },
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
  welcomeTitle: { fontSize: 17, fontWeight: '700', color: m.text },
  welcomeText: { fontSize: 14, lineHeight: 21, color: m.textSecondary },
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
