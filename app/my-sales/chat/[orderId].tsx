import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LotChatPanel } from '@/src/components/lot-chat/LotChatPanel';
import { lightColors } from '@/src/theme/lightTokens';

export default function VendorLotChatScreen() {
  const { orderId, title } = useLocalSearchParams<{ orderId: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!orderId) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#1A1625" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title ?? 'Chat com comprador'}
          </Text>
          <Text style={styles.headerSub}>Conversa do lote arrematado</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <LotChatPanel orderId={String(orderId)} mode="vendor" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1625' },
  headerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  panel: { flex: 1, padding: 12 },
});
