import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { listarMeusAnuncios, type VendorListingResumo } from '@/src/services/vendorListings';
import { lightColors } from '@/src/theme/lightTokens';

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<VendorListingResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const data = await listarMeusAnuncios();
    setListings(data);
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  return (
    <SubScreenLayout title="Meus Anúncios" subtitle="Itens ativos criados por você">
      {carregando ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={lightColors.accent} />
        </View>
      ) : (
        <View style={styles.list}>
          {listings.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              accessibilityRole="button"
              onPress={() => router.push(`/my-listings/${item.id}`)}>
              <Image source={{ uri: item.imageUrl }} style={styles.img} />
              <View style={styles.body}>
                <View style={styles.top}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: `${item.statusColor}18` }]}>
                    <View style={[styles.badgeDot, { backgroundColor: item.statusColor }]} />
                    <Text style={[styles.badgeText, { color: item.statusColor }]}>
                      {item.gestaoStatusLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bidLabel}>Maior lance</Text>
                <Text style={styles.bidValue}>{item.highestBidLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      )}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    gap: 12,
  },
  img: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6' },
  body: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1625', lineHeight: 18 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  bidLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  bidValue: { fontSize: 15, fontWeight: '800', color: lightColors.accent },
});
