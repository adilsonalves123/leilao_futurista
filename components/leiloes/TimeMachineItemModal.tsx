import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { lightColors } from '@/src/theme/lightTokens';

export type TimeMachineHistoryItem = {
  id: string;
  title: string;
  date: string;
  price: string;
  user: string;
  img: string;
  category: string;
  endedAt: string;
  bidCount: number;
  startPrice: string;
  conservation: string;
};

type Props = {
  item: TimeMachineHistoryItem | null;
  visible: boolean;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function TimeMachineItemModal({ item, visible, onClose }: Props) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </Pressable>

          <Image source={{ uri: item.img }} style={styles.heroImage} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ENCERRADO</Text>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.category}>{item.category}</Text>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Arrematado por</Text>
            <Text style={styles.priceValue}>{item.price}</Text>
            <Text style={styles.priceHint}>Lance inicial: {item.startPrice}</Text>
          </View>

          <View style={styles.details}>
            <DetailRow label="Data" value={item.date} />
            <DetailRow label="Horário" value={item.endedAt} />
            <DetailRow label="Arrematante" value={item.user} />
            <DetailRow label="Lances" value={`${item.bidCount} lances`} />
            <DetailRow label="Conservação" value={item.conservation} />
          </View>

          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#E9E0FF',
  accentSoft: '#F4F0FF',
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 4,
    paddingRight: 28,
  },
  category: { fontSize: 12, color: C.textMuted, marginBottom: 12 },
  priceBox: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  priceLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#10B981', marginTop: 2 },
  priceHint: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  details: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: C.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
