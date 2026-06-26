import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BuyerPhotosCarousel } from '@/components/reviews/BuyerPhotosCarousel';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { listarMinhasReviews, mediaAvaliacoes } from '@/src/services/reviews';
import type { Review } from '@/src/types/review';
import { MOCK_BUYER_ID } from '@/src/constants/operations';
import { colors } from '@/src/theme/tokens';

function Stars({ count }: { count: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={14}
          color={i < count ? '#FBBF24' : colors.glassBorder}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    listarMinhasReviews(MOCK_BUYER_ID).then(setReviews);
  }, []);

  const media = mediaAvaliacoes(reviews);

  return (
    <SubScreenLayout title="Minhas Avaliações" subtitle="Feedback que você publicou na plataforma">
      <View style={styles.summary}>
        <Text style={styles.summaryScore}>{media > 0 ? media.toFixed(1).replace('.', ',') : '—'}</Text>
        <Stars count={Math.round(media)} />
        <Text style={styles.summaryCount}>{reviews.length} avaliação(ões)</Text>
      </View>

      <View style={styles.list}>
        {reviews.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Stars count={item.rating} />
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.auctionTitle ? (
              <Text style={styles.auctionTitle}>{item.auctionTitle}</Text>
            ) : null}
            <Text style={styles.text}>{item.comment}</Text>
            {item.images.length > 0 ? (
              <View style={styles.thumbsRow}>
                {item.images.slice(0, 4).map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.thumb} />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {reviews.some((r) => r.images.length > 0) ? (
        <BuyerPhotosCarousel
          images={reviews.flatMap((r) => r.images)}
          title="Suas fotos publicadas"
          variant="dark"
        />
      ) : null}

      <Pressable
        style={styles.newBtn}
        onPress={() =>
          router.push({
            pathname: '/reviews/create',
            params: {
              orderId: 'ord-demo',
              auctionId: 'l-macbook-03',
              vendorId: 'v-tech',
              titulo: 'MacBook Pro M3 Max',
            },
          } as never)
        }>
        <Ionicons name="add-circle-outline" size={18} color={colors.neonCyan} />
        <Text style={styles.newBtnText}>Nova avaliação (demo)</Text>
      </Pressable>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  summary: {
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    marginBottom: 16,
  },
  summaryScore: { fontSize: 36, fontWeight: '800', color: colors.neonCyan },
  stars: { flexDirection: 'row', gap: 2, marginTop: 6 },
  summaryCount: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auctionTitle: { fontSize: 12, fontWeight: '700', color: colors.neonCyan, marginTop: 8 },
  text: { fontSize: 13, color: colors.textPrimary, marginTop: 8, lineHeight: 19 },
  date: { fontSize: 11, color: colors.textMuted },
  thumbsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.glassBorder },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neonCyan,
  },
  newBtnText: { color: colors.neonCyan, fontWeight: '700' },
});
