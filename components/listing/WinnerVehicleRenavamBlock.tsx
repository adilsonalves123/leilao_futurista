import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  getMaskedRenavamForWinner,
  type WinnerRenavamLookup,
} from '@/src/services/winnerVehicleRenavam';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#E9E0FF',
  accentSoft: '#F4F0FF',
};

type Props = WinnerRenavamLookup & {
  /** Quando informado e não for veículo, não busca nem exibe nada. */
  listingCategory?: string | null;
};

export function useMaskedRenavamForWinner({
  auctionId,
  orderId,
  listingCategory,
}: Props) {
  const isVehicle = !listingCategory || listingCategory === 'veiculos';
  const [maskedRenavam, setMaskedRenavam] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isVehicle || !auctionId) {
      setMaskedRenavam(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getMaskedRenavamForWinner({ auctionId, orderId })
      .then((masked) => {
        if (!cancelled) setMaskedRenavam(masked);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auctionId, orderId, isVehicle]);

  const visible = isVehicle && (loading || !!maskedRenavam);

  return { maskedRenavam, loading, visible };
}

export function WinnerVehicleRenavamBlock(props: Props) {
  const { maskedRenavam, loading, visible } = useMaskedRenavamForWinner(props);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Ionicons name="car-outline" size={18} color={C.accent} />
        <Text style={styles.title}>Confirmação do veículo</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={C.accent} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.label}>RENAVAM (parcial)</Text>
          <Text style={styles.value} accessibilityLabel="RENAVAM parcial para conferência">
            {maskedRenavam}
          </Text>
          <Text style={styles.hint}>
            Disponível só para você como arrematante. Confira os últimos dígitos com o vendedor e
            com o documento do veículo antes da transferência.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  label: { fontSize: 11, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase' },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  hint: { fontSize: 11, color: C.textMuted, lineHeight: 16, marginTop: 4 },
  loader: { alignSelf: 'flex-start', marginVertical: 8 },
});
