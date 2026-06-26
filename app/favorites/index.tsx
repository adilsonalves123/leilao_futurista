import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import {
  listFavoriteAuctions,
  removeFavoriteAuction,
  type FavoriteAuction,
} from '@/src/lib/auctionFavorites';
import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteAuction[]>([]);

  const recarregar = useCallback(async () => {
    const lista = await listFavoriteAuctions();
    setFavorites(lista);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  async function remover(id: string) {
    await removeFavoriteAuction(id);
    await recarregar();
  }

  return (
    <SubScreenLayout title="Favoritos" subtitle="Leilões salvos com o coraçãozinho">
      {favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Nenhum favorito ainda"
          description="Toque no coração nos leilões da Home ou em Leilões para salvar aqui."
          actionLabel="Explorar leilões"
          onAction={() => router.push('/(tabs)/leiloes')}
        />
      ) : (
        <View style={styles.list}>
          {favorites.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Abrir leilão ${item.title}`}
              onPress={() => router.push(`/auction/${item.id}`)}>
              <Image source={{ uri: item.img }} style={styles.img} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.priceLabel}>Lance atual</Text>
                <Text style={styles.price}>{item.price}</Text>
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={13} color={appColors.textMuted} />
                  <Text style={styles.timer}>{item.timer}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => void remover(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remover dos favoritos">
                <Ionicons name="heart" size={20} color={appColors.accent} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: { gap: appSpacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.surface,
    borderRadius: appRadii.lg,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: appSpacing.md,
    gap: appSpacing.md,
  },
  img: { width: 72, height: 72, borderRadius: appRadii.md, backgroundColor: appColors.surfaceMuted },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: appColors.textPrimary },
  priceLabel: { fontSize: 11, color: appColors.textMuted, marginTop: 6 },
  price: { fontSize: 15, fontWeight: '800', color: appColors.accent, marginTop: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  timer: { fontSize: 12, fontWeight: '600', color: appColors.textSecondary },
});
