import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatBRL } from '@/src/lib/bids';
import { PAYMENT_METHOD_LABELS } from '@/src/constants/operations';
import type { PaymentMethod } from '@/src/types/operations';
import { checkoutC } from './checkoutTheme';

type Props = {
  title: string;
  totalCents: number;
  method: PaymentMethod;
  orderCode?: string | null;
  onTrackOrder: () => void;
  onGoHome: () => void;
};

export function CheckoutSuccess({
  title,
  totalCents,
  method,
  orderCode,
  onTrackOrder,
  onGoHome,
}: Props) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [opacity, scale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.successBadge, badgeStyle]}>
        <Ionicons name="checkmark" size={42} color="#FFFFFF" />
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        <Text style={styles.heading}>Pagamento confirmado!</Text>
        <Text style={styles.sub}>
          {title} · {formatBRL(totalCents)} via {PAYMENT_METHOD_LABELS[method]}
        </Text>

        <View style={styles.custodyCard}>
          <View style={styles.custodyHeader}>
            <Ionicons name="shield-checkmark" size={22} color={checkoutC.success} />
            <Text style={styles.custodyTitle}>Custódia Levou ativa</Text>
          </View>
          <Text style={styles.custodyText}>
            O valor ficou retido com segurança. O vendedor gera a etiqueta no painel dele e você
            acompanha a entrega pelo app.
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>RETIDO_EM_CUSTODIA</Text>
          </View>
          {orderCode ? (
            <Text style={styles.orderCode}>Pedido: {orderCode}</Text>
          ) : null}
        </View>

        <Pressable style={styles.primaryBtn} onPress={onTrackOrder}>
          <Text style={styles.primaryBtnText}>Acompanhar pedido</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onGoHome}>
          <Text style={styles.secondaryBtnText}>Voltar ao início</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
    gap: 24,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: checkoutC.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: checkoutC.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  content: { width: '100%', gap: 16, alignItems: 'center' },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: checkoutC.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    color: checkoutC.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  custodyCard: {
    width: '100%',
    backgroundColor: checkoutC.successSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: checkoutC.successBorder,
    padding: 18,
    gap: 10,
  },
  custodyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  custodyTitle: { fontSize: 16, fontWeight: '800', color: checkoutC.success },
  custodyText: { fontSize: 13, color: checkoutC.textSecondary, lineHeight: 20 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: checkoutC.successBorder,
  },
  statusPillText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: checkoutC.success,
  },
  orderCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: checkoutC.textMuted,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: checkoutC.accent,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: checkoutC.accent, fontWeight: '700', fontSize: 14 },
});
