import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAYMENT_METHOD_LABELS } from '@/src/constants/operations';
import type { PaymentMethod } from '@/src/types/operations';
import { formatBRL } from '@/src/lib/bids';
import { checkoutC } from './checkoutTheme';

type Props = {
  totalCents: number;
  method: PaymentMethod;
  paying: boolean;
  disabled: boolean;
  onPay: () => void;
  actionLabel?: string;
};

export function CheckoutPayBar({
  totalCents,
  method,
  paying,
  disabled,
  onPay,
  actionLabel,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inner}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatBRL(totalCents)}</Text>
        </View>
        <Pressable
          style={[styles.payBtn, (disabled || paying) && styles.payBtnDisabled]}
          onPress={onPay}
          disabled={disabled || paying}>
          {paying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              <Text style={styles.payBtnText}>
                {actionLabel ?? `Pagar com ${PAYMENT_METHOD_LABELS[method]}`}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderTopColor: checkoutC.divider,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  totalCol: { gap: 2 },
  totalLabel: { fontSize: 11, fontWeight: '600', color: checkoutC.textMuted },
  totalValue: { fontSize: 20, fontWeight: '800', color: checkoutC.accent },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: checkoutC.accent,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  payBtnDisabled: { opacity: 0.55 },
  payBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
