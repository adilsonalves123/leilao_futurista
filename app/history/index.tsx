import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import {
  formatarVistoEm,
  listarLeiloesVistosRecentemente,
  type RecentlyViewedAuction,
} from '@/src/lib/recentlyViewedAuctions';
import { appColors, appRadii, appSpacing } from '@/src/theme/lightTokens';

export default function HistoryScreen() {
  const router = useRouter();
  const [itens, setItens] = useState<RecentlyViewedAuction[]>([]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarLeiloesVistosRecentemente().then((lista) => {
        if (ativo) setItens(lista);
      });
      return () => {
        ativo = false;
      };
    }, []),
  );

  return (
    <SubScreenLayout title="Histórico" subtitle="Itens vistos recentemente">
      {itens.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Nenhum item visto ainda"
          description="Os leilões que você abrir aparecerão aqui para acesso rápido."
          actionLabel="Explorar leilões"
          onAction={() => router.push('/(tabs)/leiloes')}
        />
      ) : (
        <View style={styles.list}>
          {itens.map((item) => (
            <Pressable
              key={item.auctionId}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`Abrir leilão ${item.title}`}
              onPress={() => router.push(`/auction/${item.auctionId}`)}>
              <Image source={{ uri: item.imageUrl }} style={styles.img} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.viewedAt}>{formatarVistoEm(item.viewedAtMs)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={appColors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: appColors.surface,
    borderRadius: appRadii.xl,
    borderWidth: 1,
    borderColor: appColors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: appSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    gap: appSpacing.md,
  },
  img: { width: 48, height: 48, borderRadius: appRadii.sm, backgroundColor: appColors.surfaceMuted },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: appColors.textPrimary },
  viewedAt: { fontSize: 11, color: appColors.textMuted, marginTop: 2 },
});
