import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisputeMediaPicker } from '@/components/disputes/DisputeMediaPicker';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useOperationsStore } from '@/src/hooks/useOperationsStore';
import { getSupabaseOrderIdForLocal } from '@/src/services/orderPersistence';
import { abrirDisputaComprador } from '@/src/services/buyerDisputes';
import {
  DISPUTE_CATEGORY_LABELS,
  type DisputeCategory,
} from '@/src/types/adminDisputas';
import { colors, radii, spacing } from '@/src/theme/tokens';

const CATEGORIAS: DisputeCategory[] = [
  'produto_diferente',
  'produto_danificado',
  'nao_recebido',
  'incompleto',
  'outro',
];

export default function OrderDisputeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { localId } = useLocalSearchParams<{ localId?: string }>();
  const { getOrder, openDispute } = useOperationsStore();

  const order = getOrder(String(localId ?? ''));
  const [supabaseOrderId, setSupabaseOrderId] = useState<string | null>(null);
  const [category, setCategory] = useState<DisputeCategory>('produto_danificado');
  const [reason, setReason] = useState('');
  const [media, setMedia] = useState<{ uri: string; kind: 'foto' | 'video' }[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!localId) return;
    getSupabaseOrderIdForLocal(String(localId)).then(setSupabaseOrderId);
  }, [localId]);

  async function handleSubmit() {
    if (!order || !localId) return;

    if (reason.trim().length < 15) {
      Alert.alert('Descreva o problema', 'Escreva pelo menos 15 caracteres explicando a disputa.');
      return;
    }

    if (media.length === 0) {
      Alert.alert(
        'Adicione evidências',
        'Envie ao menos uma foto ou vídeo para abrir a disputa.',
      );
      return;
    }

    setEnviando(true);
    try {
      if (supabaseOrderId) {
        await abrirDisputaComprador({
          orderId: supabaseOrderId,
          category,
          reason: reason.trim(),
          mediaUris: media.map((m) => m.uri),
        });
      }

      openDispute(String(localId));
      Alert.alert(
        'Disputa aberta',
        'Seu pagamento está congelado. A equipe Levou analisará as evidências em breve.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível abrir a disputa.');
    } finally {
      setEnviando(false);
    }
  }

  if (!order) {
    return (
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Pedido não encontrado.</Text>
      </View>
    );
  }

  if (order.status !== 'AGUARDANDO_CONFIRMACAO') {
    return (
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ title: 'Disputa' }} />
        <GlassPanel>
          <Text style={styles.muted}>
            Este pedido não está mais no prazo de confirmação/disputa.
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </Pressable>
        </GlassPanel>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Abrir disputa' }} />
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.neonCyan} />
          <Text style={styles.backLinkText}>Voltar ao pedido</Text>
        </Pressable>

        <Text style={styles.title}>Reportar problema</Text>
        <Text style={styles.sub}>
          Pedido {order.id} · {formatBRLShort(order.totalCents)}
        </Text>

        {!supabaseOrderId ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Modo offline: a disputa será registrada localmente. Conecte ao Supabase para
              sincronizar com a sala de mediação.
            </Text>
          </View>
        ) : null}

        <GlassPanel style={styles.panel}>
          <Text style={styles.sectionTitle}>Motivo</Text>
          <View style={styles.chips}>
            {CATEGORIAS.map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(cat)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {DISPUTE_CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Explique o que aconteceu com o produto ou a entrega…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
            editable={!enviando}
          />

          <DisputeMediaPicker items={media} onChange={setMedia} disabled={enviando} />
        </GlassPanel>

        <Pressable
          style={[styles.submitBtn, enviando && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={enviando}>
          {enviando ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Ionicons name="scale-outline" size={18} color={colors.background} />
              <Text style={styles.submitText}>Enviar disputa</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatBRLShort(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { color: colors.neonCyan, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: colors.neonCyan },
  sub: { color: colors.textMuted, marginTop: -4 },
  muted: { color: colors.textMuted },
  warnBox: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  warnText: { fontSize: 12, color: '#FDE68A', lineHeight: 18 },
  panel: { gap: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    borderColor: colors.neonPink,
    backgroundColor: 'rgba(255, 0, 128, 0.12)',
  },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.neonPink },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.neonPink,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.background, fontWeight: '800', fontSize: 15 },
  backBtn: {
    marginTop: spacing.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
  },
  backBtnText: { color: colors.neonCyan, fontWeight: '700' },
});
