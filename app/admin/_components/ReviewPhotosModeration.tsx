import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Review } from '@/src/types/review';
import { adminC, adminStyles } from './adminStyles';

type Props = {
  reviews: Review[];
  titulo?: string;
};

export function ReviewPhotosModeration({ reviews, titulo = 'Fotos das avaliações' }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const comFotos = reviews.filter((r) => r.images.length > 0);

  if (comFotos.length === 0) {
    return (
      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>{titulo}</Text>
        <Text style={styles.empty}>Nenhuma foto de avaliação vinculada a este pedido.</Text>
      </View>
    );
  }

  return (
    <View style={adminStyles.card}>
      <View style={styles.header}>
        <Ionicons name="images-outline" size={18} color={adminC.accent} />
        <Text style={adminStyles.cardTitle}>{titulo}</Text>
      </View>
      <Text style={styles.hint}>
        Evidências enviadas pelo comprador — use para mediar disputas de qualidade.
      </Text>

      {comFotos.map((review) => (
        <View key={review.id} style={styles.reviewBlock}>
          <View style={styles.reviewMeta}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < review.rating ? 'star' : 'star-outline'}
                  size={12}
                  color={i < review.rating ? '#FBBF24' : adminC.textMuted}
                />
              ))}
            </View>
            <Text style={styles.buyer}>{review.buyerName ?? 'Comprador'}</Text>
          </View>
          <Text style={styles.comment} numberOfLines={2}>
            {review.comment}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {review.images.map((uri) => (
              <Pressable key={uri} onPress={() => setLightbox(uri)} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand-outline" size={12} color="#FFF" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}

      <Modal visible={Boolean(lightbox)} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setLightbox(null)}>
          {lightbox ? (
            <Image source={{ uri: lightbox }} style={styles.modalImage} resizeMode="contain" />
          ) : null}
          <Pressable style={styles.modalClose} onPress={() => setLightbox(null)}>
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  hint: { fontSize: 12, color: adminC.textMuted, marginBottom: 14, lineHeight: 18 },
  empty: { fontSize: 13, color: adminC.textMuted, fontStyle: 'italic' },
  reviewBlock: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stars: { flexDirection: 'row', gap: 2 },
  buyer: { fontSize: 12, fontWeight: '700', color: adminC.textSecondary },
  comment: { fontSize: 13, color: adminC.textPrimary, lineHeight: 18 },
  photoRow: { marginTop: 4 },
  photoWrap: {
    width: 96,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  photo: { width: '100%', height: '100%' },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    padding: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: { width: '92%', height: '70%' },
  modalClose: { position: 'absolute', top: 48, right: 24 },
});
