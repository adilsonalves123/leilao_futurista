import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { useUserNotifications } from '@/src/hooks/useUserNotifications';
import {
  formatarTempoNotificacao,
  KIND_META,
} from '@/src/services/userNotifications';
import { marcarNotificacaoComoLida } from '@/src/lib/notificationFeed';
import type { UserNotification } from '@/src/types/notifications';
import { lightColors } from '@/src/theme/lightTokens';

export default function NotificationsScreen() {
  const router = useRouter();
  const { itens, carregando, recarregar } = useUserNotifications();

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );

  async function abrirNotificacao(item: UserNotification) {
    await marcarNotificacaoComoLida(item.id);
    recarregar();

    if (item.kind === 'payment_confirmed' && item.orderId) {
      router.push(`/order/${item.orderId}`);
      return;
    }
    if (item.auctionId) {
      router.push(`/auction/${item.auctionId}`);
    }
  }

  return (
    <SubScreenLayout title="Notificações" subtitle="Atualizações dos seus leilões">
      {carregando ? (
        <ActivityIndicator color={lightColors.accent} style={{ marginTop: 24 }} />
      ) : itens.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhuma atividade ainda</Text>
          <Text style={styles.emptyDesc}>
            Lance em leilões, receba lances nos seus anúncios ou confirme pagamentos para ver
            alertas aqui.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {itens.map((item) => {
            const meta = KIND_META[item.kind];
            return (
              <Pressable
                key={item.id}
                style={[styles.row, item.unread && styles.rowUnread]}
                accessibilityRole="button"
                onPress={() => abrirNotificacao(item)}>
                <View style={[styles.iconWrap, item.unread && styles.iconWrapUnread]}>
                  <Ionicons
                    name={meta.icon}
                    size={18}
                    color={item.unread ? lightColors.accent : '#9CA3AF'}
                  />
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.desc}>{item.description}</Text>
                  <Text style={styles.time}>{formatarTempoNotificacao(item.createdAtMs)}</Text>
                </View>
                {item.unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
  },
  rowUnread: { borderColor: '#E9E0FF', backgroundColor: '#FDFCFF' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: '#F4F0FF' },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1625' },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: lightColors.accent,
    marginTop: 4,
  },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1625' },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
