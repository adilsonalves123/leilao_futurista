import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BuyerPhotosCarousel } from '@/components/reviews/BuyerPhotosCarousel';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import {
  extrairFotosReviews,
  listarReviewsPorVendedor,
  mediaAvaliacoes,
} from '@/src/services/reviews';
import {
  mediaExibicaoVendedor,
  obterPerfilVendedorPublico,
  type VendorPublicProfile,
} from '@/src/services/vendorPublicProfile';
import type { Review } from '@/src/types/review';

function Stars({ count }: { count: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={14}
          color={i < count ? '#FBBF24' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={16} color="#7C3AED" />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function VendorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendorId = id?.trim() ?? '';
  const [perfil, setPerfil] = useState<VendorPublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      setNaoEncontrado(true);
      setCarregando(false);
      return;
    }

    let cancelled = false;
    setCarregando(true);
    setNaoEncontrado(false);

    Promise.all([obterPerfilVendedorPublico(vendorId), listarReviewsPorVendedor(vendorId)])
      .then(([dados, revs]) => {
        if (cancelled) return;
        if (!dados) {
          setNaoEncontrado(true);
          setPerfil(null);
          setReviews([]);
          return;
        }
        setPerfil(dados);
        setReviews(revs);
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (carregando) {
    return (
      <SubScreenLayout title="Vendedor" subtitle="Carregando perfil…">
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      </SubScreenLayout>
    );
  }

  if (naoEncontrado || !perfil) {
    return (
      <SubScreenLayout title="Vendedor" subtitle="Perfil público">
        <EmptyState
          icon="person-outline"
          title="Vendedor não encontrado"
          description="Este perfil não existe ou não está disponível publicamente."
        />
      </SubScreenLayout>
    );
  }

  const media = mediaExibicaoVendedor(perfil);
  const mediaReviews = mediaAvaliacoes(reviews);
  const fotos = extrairFotosReviews(reviews);

  return (
    <SubScreenLayout title={perfil.nomeExibicao} subtitle="Perfil público do vendedor">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={32} color="#7C3AED" />
          </View>
          <Text style={styles.handle}>{perfil.handle}</Text>
          <View style={styles.badgeRow}>
            {perfil.sellerBadge ? <SellerBadgeChip badge={perfil.sellerBadge} /> : null}
            {perfil.kycAprovado ? (
              <View style={styles.kycChip}>
                <Ionicons name="shield-checkmark" size={12} color="#047857" />
                <Text style={styles.kycText}>Identidade verificada</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.score}>{media > 0 ? media.toFixed(1).replace('.', ',') : '—'}</Text>
          <Stars count={Math.round(media)} />
          <Text style={styles.count}>
            {perfil.totalAvaliacoes} avaliação{perfil.totalAvaliacoes === 1 ? '' : 'ões'} ·{' '}
            {fotos.length} foto{fotos.length === 1 ? '' : 's'} reais
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricPill icon="trophy-outline" label="vendas" value={perfil.vendasConcluidas} />
          <MetricPill icon="star-outline" label="avaliações" value={perfil.totalAvaliacoes} />
          <MetricPill
            icon="trending-up-outline"
            label="reputação"
            value={media > 0 ? media.toFixed(1).replace('.', ',') : '—'}
          />
        </View>

        {fotos.length > 0 ? (
          <BuyerPhotosCarousel
            images={fotos}
            buyerNames={reviews.flatMap((r) => r.images.map(() => r.buyerName ?? 'Comprador'))}
            subtitle="Imagens enviadas por compradores após receberem o produto"
            variant="light"
          />
        ) : null}

        <Text style={styles.sectionTitle}>Avaliações recentes</Text>

        {reviews.length === 0 ? (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="Sem avaliações ainda"
            description="Este vendedor ainda não recebeu avaliações públicas de compradores."
          />
        ) : (
          <View style={styles.list}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Stars count={r.rating} />
                  <Text style={styles.date}>
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                {r.auctionTitle ? <Text style={styles.item}>{r.auctionTitle}</Text> : null}
                <Text style={styles.comment}>{r.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {reviews.length > 0 && perfil.totalAvaliacoes > 0 ? (
          <Text style={styles.footerHint}>
            Média das avaliações: {mediaReviews.toFixed(1).replace('.', ',')} estrelas
          </Text>
        ) : null}
      </ScrollView>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  summary: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  handle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 8 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  kycChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  kycText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  score: { fontSize: 32, fontWeight: '800', color: '#7C3AED' },
  stars: { flexDirection: 'row', gap: 2, marginTop: 4 },
  count: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricPill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#1A1625' },
  metricLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1625',
    marginBottom: 10,
    marginTop: 8,
  },
  list: { gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item: { fontSize: 12, fontWeight: '700', color: '#7C3AED', marginTop: 8 },
  comment: { fontSize: 13, color: '#1A1625', marginTop: 6, lineHeight: 19 },
  date: { fontSize: 11, color: '#9CA3AF' },
  footerHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});
