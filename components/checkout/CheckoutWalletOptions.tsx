import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBRL } from '@/src/lib/bids';
import { previewCarteiraCheckout } from '@/src/services/buyerBidHold';
import { checkoutC } from './checkoutTheme';

type Props = {
  auctionId: string;
  totalCents: number;
  useAvailable: boolean;
  useHold: boolean;
  onUseAvailableChange: (value: boolean) => void;
  onUseHoldChange: (value: boolean) => void;
};

export function CheckoutWalletOptions({
  auctionId,
  totalCents,
  useAvailable,
  useHold,
  onUseAvailableChange,
  onUseHoldChange,
}: Props) {
  const [availableCents, setAvailableCents] = useState(0);
  const [winningHoldCents, setWinningHoldCents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void previewCarteiraCheckout(auctionId).then((preview) => {
      if (cancelled) return;
      setAvailableCents(preview?.availableCents ?? 0);
      setWinningHoldCents(preview?.winningHoldCents ?? 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  const appliedAvailable = useAvailable
    ? Math.min(availableCents, totalCents)
    : 0;
  const remainingAfterAvailable = Math.max(totalCents - appliedAvailable, 0);
  const appliedHold = useHold
    ? Math.min(winningHoldCents, remainingAfterAvailable)
    : 0;
  const chargeCents = Math.max(totalCents - appliedAvailable - appliedHold, 0);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Carteira Levou</Text>
        <Text style={styles.sub}>Carregando saldo…</Text>
      </View>
    );
  }

  if (availableCents <= 0 && winningHoldCents <= 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Usar carteira (opcional)</Text>
      <Text style={styles.sub}>
        A caução do lance fica retida por segurança. Usar no pagamento é opcional.
      </Text>

      {availableCents > 0 ? (
        <Pressable
          style={styles.row}
          onPress={() => onUseAvailableChange(!useAvailable)}>
          <Ionicons
            name={useAvailable ? 'checkbox' : 'square-outline'}
            size={22}
            color={checkoutC.accent}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Saldo disponível</Text>
            <Text style={styles.rowValue}>{formatBRL(availableCents)}</Text>
          </View>
        </Pressable>
      ) : null}

      {winningHoldCents > 0 ? (
        <Pressable style={styles.row} onPress={() => onUseHoldChange(!useHold)}>
          <Ionicons
            name={useHold ? 'checkbox' : 'square-outline'}
            size={22}
            color={checkoutC.accent}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Abater caução do lance</Text>
            <Text style={styles.rowValue}>{formatBRL(winningHoldCents)}</Text>
          </View>
        </Pressable>
      ) : null}

      {(appliedAvailable > 0 || appliedHold > 0) && (
        <View style={styles.summary}>
          <Text style={styles.summaryLine}>
            Abatimento: {formatBRL(appliedAvailable + appliedHold)}
          </Text>
          <Text style={styles.summaryCharge}>
            Pix/cartão: {formatBRL(chargeCents)}
          </Text>
        </View>
      )}
    </View>
  );
}

export function calcWalletApplyCents(
  totalCents: number,
  availableCents: number,
  winningHoldCents: number,
  useAvailable: boolean,
  useHold: boolean,
): { available: number; hold: number; charge: number } {
  const appliedAvailable = useAvailable
    ? Math.min(availableCents, totalCents)
    : 0;
  const remaining = Math.max(totalCents - appliedAvailable, 0);
  const appliedHold = useHold ? Math.min(winningHoldCents, remaining) : 0;
  return {
    available: appliedAvailable,
    hold: appliedHold,
    charge: Math.max(totalCents - appliedAvailable - appliedHold, 0),
  };
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: checkoutC.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: checkoutC.cardBorder,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 14, fontWeight: '800', color: checkoutC.text },
  sub: { fontSize: 12, color: checkoutC.textMuted, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: checkoutC.text },
  rowValue: { fontSize: 12, color: checkoutC.accent, fontWeight: '700' },
  summary: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: checkoutC.divider,
    gap: 4,
  },
  summaryLine: { fontSize: 12, color: checkoutC.textSecondary },
  summaryCharge: { fontSize: 14, fontWeight: '800', color: checkoutC.text },
});
