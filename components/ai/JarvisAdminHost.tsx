import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAiAssistantPanel } from '@/app/admin/_components/AdminAiAssistantPanel';
import { AuctionAiFab } from '@/components/ai/AuctionAiFab';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { useAdminAiAssistant } from '@/src/hooks/useAdminAiAssistant';
import { shouldHideAdminJarvisFab } from '@/src/store/jarvisContext';

export function JarvisAdminHost() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [entrada, setEntrada] = useState('');

  const hideFab = shouldHideAdminJarvisFab(pathname);

  const { messages, carregando, enviando, erro, enviarMensagem, recarregarContexto } =
    useAdminAiAssistant(!hideFab);

  if (hideFab) return null;

  async function handleSend(text?: string) {
    const value = (text ?? entrada).trim();
    if (!value) return;
    setEntrada('');
    await enviarMensagem(value);
    await recarregarContexto();
  }

  return (
    <>
      <AuctionAiFab onPress={() => setOpen(true)} bottomOffset={Math.max(insets.bottom + 20, 24)} />

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.sheetOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandleRow}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetActions}>
                  <Pressable
                    style={styles.expandBtn}
                    onPress={() => {
                      setOpen(false);
                      router.push('/admin/assistente');
                    }}>
                    <Ionicons name="expand-outline" size={14} color={m.purple} />
                    <Text style={styles.expandText}>Tela cheia</Text>
                  </Pressable>
                  <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
                    <Ionicons name="close" size={18} color={m.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.panelBody}>
                <AdminAiAssistantPanel
                  messages={messages}
                  carregando={carregando}
                  enviando={enviando}
                  erro={erro}
                  entrada={entrada}
                  onChangeEntrada={setEntrada}
                  onSend={handleSend}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: m.backdrop },
  backdropTap: { flex: 1 },
  sheetOuter: { maxHeight: '92%' },
  sheet: {
    height: '88%',
    minHeight: 520,
    backgroundColor: m.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  sheetHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: m.borderStrong,
  },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: m.purpleSoft,
  },
  expandText: {
    fontSize: 11,
    fontWeight: '700',
    color: m.purpleDeep,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.surfaceMuted,
    borderWidth: 1,
    borderColor: m.border,
  },
  panelBody: { flex: 1, minHeight: 0, paddingHorizontal: 8, paddingBottom: 8 },
});
