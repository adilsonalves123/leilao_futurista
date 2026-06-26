import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import {
  mediaExibicaoVendedor,
  type VendorPublicProfile,
} from '@/src/services/vendorPublicProfile';

type Props = {
  profile: VendorPublicProfile;
  onPress: () => void;
};

function Stars({ rating }: { rating: number }) {
  const arredondado = Math.round(rating);
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < arredondado ? 'star' : 'star-outline'}
          size={12}
          color={i < arredondado ? '#FBBF24' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

export function VendorPublicCard({ profile, onPress }: Props) {
  const media = mediaExibicaoVendedor(profile);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${profile.nomeExibicao}`}>
      <View style={styles.avatar}>
        <Ionicons name="storefront-outline" size={22} color="#7C3AED" />
      </View>
      <View style={styles.body}>
        <Text style={styles.handle}>{profile.handle}</Text>
        <Text style={styles.nome}>{profile.nomeExibicao}</Text>
        <View style={styles.metaRow}>
          {profile.sellerBadge ? <SellerBadgeChip badge={profile.sellerBadge} compact /> : null}
          {profile.kycAprovado ? (
            <View style={styles.kycChip}>
              <Ionicons name="shield-checkmark" size={11} color="#047857" />
              <Text style={styles.kycText}>KYC</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.statsRow}>
          <Stars rating={media} />
          <Text style={styles.statText}>
            {media > 0 ? media.toFixed(1).replace('.', ',') : '—'} ·{' '}
            {profile.vendasConcluidas} venda{profile.vendasConcluidas === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  handle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  nome: { fontSize: 15, fontWeight: '800', color: '#1A1625' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  kycChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  kycText: { fontSize: 10, fontWeight: '800', color: '#047857' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  stars: { flexDirection: 'row', gap: 1 },
  statText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
});
