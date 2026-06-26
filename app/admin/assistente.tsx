import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { useAdminAiAssistant } from '@/src/hooks/useAdminAiAssistant';
import {
  listarErrosSistemaAdmin,
  resolverErroSistemaAdmin,
} from '@/src/services/adminAiAssistant';
import type { AdminSystemErrorRow } from '@/src/types/adminAi';
import { AdminAiAlertsStrip } from './_components/AdminAiAlertsStrip';
import { AdminAiAssistantPanel } from './_components/AdminAiAssistantPanel';

export default function AdminAssistenteScreen() {
  const { temPermissao } = useAdminSession();
  const insets = useSafeAreaInsets();
  const [entrada, setEntrada] = useState('');
  const [erros, setErros] = useState<AdminSystemErrorRow[]>([]);
  const [carregandoErros, setCarregandoErros] = useState(true);
  const [chatExpandido, setChatExpandido] = useState(false);

  const { context, messages, carregando, enviando, erro, modelo, enviarMensagem, recarregarContexto } =
    useAdminAiAssistant(true);

  const carregarErros = useCallback(async () => {
    setCarregandoErros(true);
    try {
      const rows = await listarErrosSistemaAdmin(12);
      setErros(rows);
    } finally {
      setCarregandoErros(false);
    }
  }, []);

  useEffect(() => {
    carregarErros();
  }, [carregarErros]);

  if (!temPermissao('suporte') && !temPermissao('financeiro') && !temPermissao('leiloes')) {
    return <Redirect href="/admin" />;
  }

  async function handleSend(text?: string) {
    const value = (text ?? entrada).trim();
    if (!value) return;
    setEntrada('');
    await enviarMensagem(value);
    await carregarErros();
    await recarregarContexto();
  }

  async function marcarResolvido(errorId: string) {
    const ok = await resolverErroSistemaAdmin(errorId);
    if (ok) {
      await carregarErros();
      await recarregarContexto();
    }
  }

  const panelProps = {
    messages,
    carregando,
    enviando,
    erro,
    entrada,
    onChangeEntrada: setEntrada,
    onSend: handleSend,
    modelo,
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.topBarIcon}>
            <Ionicons name="sparkles" size={18} color={m.purple} />
          </View>
          <View>
            <Text style={styles.topBarEyebrow}>Inteligência operacional</Text>
            <Text style={styles.topBarTitle}>Assistente Adilson</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
          onPress={async () => {
            await carregarErros();
            await recarregarContexto();
          }}>
          <Ionicons name="refresh-outline" size={15} color={m.purple} />
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>

      <AdminAiAlertsStrip alertas={context?.alertas ?? []} resumo={context?.resumo ?? null} />

      <View style={styles.grid}>
        <View style={styles.chatCol}>
          <AdminAiAssistantPanel
            {...panelProps}
            expandido={false}
            onToggleExpand={() => setChatExpandido(true)}
          />
        </View>

        <View style={styles.sideCol}>
          <View style={styles.errorsCard}>
              <View style={styles.errorsHeader}>
                <View style={styles.errorsIconWrap}>
                  <Ionicons name="bug-outline" size={16} color="#F87171" />
                </View>
                <View style={styles.errorsHeaderText}>
                  <Text style={styles.errorsTitle}>Log de erros</Text>
                  <Text style={styles.errorsSub}>Últimos registros do sistema</Text>
                </View>
                <Pressable style={styles.iconBtn} onPress={carregarErros} hitSlop={8}>
                  <Ionicons name="refresh-outline" size={16} color="#9CA3AF" />
                </Pressable>
              </View>

              {carregandoErros ? (
                <View style={styles.errorsLoadingWrap}>
                  <ActivityIndicator color={m.purple} />
                </View>
              ) : erros.length === 0 ? (
                <View style={styles.errorsEmptyWrap}>
                  <View style={styles.errorsEmptyIcon}>
                    <Ionicons name="checkmark-circle" size={36} color="#34D399" />
                  </View>
                  <Text style={styles.errorsEmptyTitle}>Nenhum erro pendente</Text>
                  <Text style={styles.errorsEmpty}>O sistema está operando normalmente</Text>
                </View>
              ) : (
                <ScrollView style={styles.errorsList} showsVerticalScrollIndicator={false}>
                  {erros.map((item) => (
                    <View key={item.id} style={styles.errorItem}>
                      <View style={styles.errorItemTop}>
                        <View
                          style={[
                            styles.severityPill,
                            item.severity === 'critical' && styles.severityCritical,
                            item.severity === 'warning' && styles.severityWarning,
                          ]}>
                          <Text style={styles.severityText}>{item.severity}</Text>
                        </View>
                        <Text style={styles.errorCategory}>{item.category}</Text>
                      </View>
                      <Text style={styles.errorSource}>{item.source}</Text>
                      {item.code ? <Text style={styles.errorCode}>{item.code}</Text> : null}
                      <Text style={styles.errorMessage} numberOfLines={4}>
                        {item.message}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.resolveBtn,
                          pressed && styles.resolveBtnPressed,
                        ]}
                        onPress={() => marcarResolvido(item.id)}>
                        <Ionicons name="checkmark" size={12} color={m.purple} />
                        <Text style={styles.resolveBtnText}>Marcar resolvido</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>

      <Modal
        visible={chatExpandido}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setChatExpandido(false)}
        statusBarTranslucent>
        <View
          style={[
            styles.modalRoot,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) },
          ]}>
          <KeyboardAvoidingView
            style={styles.modalInner}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}>
            <AdminAiAssistantPanel
              {...panelProps}
              expandido
              onToggleExpand={() => setChatExpandido(false)}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({ height: '100%', display: 'flex', flexDirection: 'column' } as object)
      : {}),
  },
  modalRoot: {
    flex: 1,
    backgroundColor: m.background,
  },
  modalInner: { flex: 1, minHeight: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.22)',
  },
  refreshBtnPressed: { opacity: 0.85, backgroundColor: 'rgba(124, 58, 237, 0.16)' },
  refreshText: { fontSize: 12, fontWeight: '700', color: m.purpleBrand },
  grid: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 14,
    ...(Platform.OS !== 'web' ? { flexDirection: 'column' } : {}),
  },
  chatCol: { flex: 2.4, minHeight: 0, minWidth: 0 },
  sideCol: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
    minHeight: 0,
    ...(Platform.OS !== 'web' ? { maxWidth: undefined, minHeight: 280 } : {}),
  },
  errorsCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    overflow: 'hidden',
  },
  errorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  errorsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorsHeaderText: { flex: 1 },
  errorsTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  errorsSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorsLoadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorsEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  errorsEmptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorsEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  errorsEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  errorsList: { flex: 1 },
  errorItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
    gap: 5,
  },
  errorItemTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  severityCritical: { backgroundColor: 'rgba(248,113,113,0.15)' },
  severityWarning: { backgroundColor: 'rgba(251,191,36,0.12)' },
  severityText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorCategory: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  errorSource: { fontSize: 11, fontWeight: '700', color: m.purpleBrand },
  errorCode: {
    fontSize: 11,
    color: '#FCD34D',
  },
  errorMessage: { fontSize: 12, lineHeight: 18, color: '#D1D5DB', fontWeight: '500' },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  resolveBtnPressed: { opacity: 0.85 },
  resolveBtnText: { fontSize: 11, fontWeight: '700', color: m.purpleBrand },
});
