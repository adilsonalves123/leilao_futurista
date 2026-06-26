import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PaymentMethod } from '@/src/types/operations';
import { PAYMENT_METHOD_LABELS } from '@/src/constants/operations';
import { checkoutC } from './checkoutTheme';

const METHOD_META: Record<
  PaymentMethod,
  { icon: ComponentProps<typeof Ionicons>['name']; hint: string; accent: string }
> = {
  PIX: { icon: 'qr-code-outline', hint: 'Aprovação instantânea', accent: '#059669' },
  CARTAO: { icon: 'card-outline', hint: 'Parcelamento em até 12x', accent: '#2563EB' },
  CRIPTO: { icon: 'logo-bitcoin', hint: 'USDT · rede Polygon', accent: '#D97706' },
};

const METHODS: PaymentMethod[] = ['PIX', 'CARTAO', 'CRIPTO'];

type Props = {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
};

export function CheckoutPaymentMethods({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Forma de pagamento</Text>
      <View style={styles.grid}>
        {METHODS.map((method) => {
          const meta = METHOD_META[method];
          const active = selected === method;
          return (
            <Pressable
              key={method}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => onSelect(method)}>
              <View style={[styles.iconWrap, { backgroundColor: `${meta.accent}18` }]}>
                <Ionicons name={meta.icon} size={22} color={meta.accent} />
              </View>
              <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>
                {PAYMENT_METHOD_LABELS[method]}
              </Text>
              <Text style={styles.cardHint}>{meta.hint}</Text>
              {active ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark-circle" size={18} color={checkoutC.accent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: checkoutC.text,
    letterSpacing: 0.2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: checkoutC.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: checkoutC.cardBorder,
    padding: 14,
    gap: 6,
    position: 'relative',
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 3,
  },
  cardActive: {
    borderColor: checkoutC.accent,
    backgroundColor: checkoutC.accentSoft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: checkoutC.text },
  cardTitleActive: { color: checkoutC.accent },
  cardHint: { fontSize: 10, color: checkoutC.textMuted, lineHeight: 14 },
  check: { position: 'absolute', top: 10, right: 10 },
});
