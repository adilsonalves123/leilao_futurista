import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { StarRatingInput } from '@/components/reviews/StarRatingInput';
import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { salvarAvaliacaoComprador } from '@/src/services/buyerReviews';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  border: '#F3F4F6',
};

export default function RateBuyerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    auctionId?: string;
    buyerId?: string;
    vendorId?: string;
    titulo?: string;
    buyerName?: string;
  }>();

  const orderId = String(params.orderId ?? '');
  const auctionId = String(params.auctionId ?? '');
  const buyerId = String(params.buyerId ?? '');
  const vendorId = String(params.vendorId ?? MOCK_VENDOR_ID);
  const titulo = params.titulo ? String(params.titulo) : 'Anúncio';
  const buyerName = params.buyerName ? String(params.buyerName) : 'Comprador';

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit() {
    if (comment.trim().length < 10) {
      Alert.alert('Comentário curto', 'Escreva pelo menos 10 caracteres sobre a experiência.');
      return;
    }

    setEnviando(true);
    try {
      await salvarAvaliacaoComprador({
        orderId,
        auctionId,
        buyerId,
        vendorId,
        rating,
        comment: comment.trim(),
      });

      Alert.alert('Avaliação enviada', 'Obrigado! Sua nota ajuda a comunidade de vendedores.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao enviar avaliação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Avaliar comprador</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {buyerName} · {titulo}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Sua nota</Text>
            <StarRatingInput value={rating} onChange={setRating} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Comentário</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Como foi a comunicação, prazo de pagamento e recebimento do item…"
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={600}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/600</Text>
          </View>

          <Pressable
            style={[styles.submitBtn, enviando && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Publicar avaliação</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textArea: {
    minHeight: 120,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 21,
  },
  charCount: { fontSize: 11, color: C.textMuted, textAlign: 'right' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
