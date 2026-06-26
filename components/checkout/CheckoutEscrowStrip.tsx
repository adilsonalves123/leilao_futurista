import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { checkoutC } from './checkoutTheme';

const ITEMS = [
  { icon: 'shield-checkmark' as const, text: 'Pagamento em custódia Levou' },
  { icon: 'lock-closed' as const, text: 'Vendedor só recebe após confirmação' },
  { icon: 'time' as const, text: '48h para confirmar ou disputar' },
];

export function CheckoutEscrowStrip() {
  return (
    <View style={styles.wrap}>
      {ITEMS.map((item) => (
        <View key={item.text} style={styles.item}>
          <Ionicons name={item.icon} size={14} color={checkoutC.success} />
          <Text style={styles.text}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: checkoutC.successSoft,
    borderWidth: 1,
    borderColor: checkoutC.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: { fontSize: 10, fontWeight: '600', color: checkoutC.success },
});
