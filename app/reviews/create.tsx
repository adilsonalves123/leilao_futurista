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
import { ReviewPhotoPicker } from '@/components/reviews/ReviewPhotoPicker';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';
import { MOCK_BUYER_ID } from '@/src/constants/operations';
import { getSupabase } from '@/src/lib/supabase';
import { criarReview } from '@/src/services/reviews';
import { colors, radii, spacing } from '@/src/theme/tokens';

export default function CreateReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    auctionId?: string;
    vendorId?: string;
    titulo?: string;
  }>();

  const orderId = String(params.orderId ?? '');
  const auctionId = String(params.auctionId ?? '');
  const vendorId = String(params.vendorId ?? MOCK_BUYER_ID);
  const titulo = params.titulo ? String(params.titulo) : 'Seu pedido';

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit() {
    if (comment.trim().length < 10) {
      Alert.alert('Comentário curto', 'Escreva pelo menos 10 caracteres sobre sua experiência.');
      return;
    }

    setEnviando(true);
    try {
      let buyerId = MOCK_BUYER_ID;
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) buyerId = data.user.id;
      }

      await criarReview({
        orderId,
        auctionId,
        vendorId,
        buyerId,
        rating,
        comment,
        imageUris: photos,
      });

      Alert.alert('Avaliação enviada', 'Obrigado! Suas fotos ajudam a comunidade.', [
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
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Avaliar compra</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {titulo}
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
              placeholder="Conte como foi receber o produto: qualidade, embalagem, prazo…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={800}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/800</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Fotos reais do produto</Text>
            <Text style={styles.sectionHint}>
              Até 4 imagens — tire na hora ou escolha da galeria
            </Text>
            <ReviewPhotoPicker uris={photos} onChange={setPhotos} />
          </View>

          <Pressable
            style={[styles.submitBtn, enviando && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="star" size={18} color={colors.background} />
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
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neonCyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  textArea: {
    minHeight: 120,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.neonCyan,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: colors.background, fontWeight: '800', fontSize: 15 },
});
