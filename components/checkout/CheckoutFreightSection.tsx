import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { FreightQuote } from '@/src/services/logistics';
import { formatBRL } from '@/src/lib/bids';
import { checkoutC } from './checkoutTheme';

type Props = {
  cep: string;
  onCepChange: (value: string) => void;
  onRecalculate: () => void;
  loading: boolean;
  quote: FreightQuote | null;
  destinationLabel?: string | null;
};

function formatCepInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function CheckoutFreightSection({
  cep,
  onCepChange,
  onRecalculate,
  loading,
  quote,
  destinationLabel,
}: Props) {
  const cepValido = cep.replace(/\D/g, '').length === 8;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={18} color={checkoutC.accent} />
        <Text style={styles.sectionTitle}>Frete para entrega</Text>
      </View>

      <View style={styles.cepRow}>
        <View style={styles.cepField}>
          <Text style={styles.label}>CEP de destino</Text>
          <TextInput
            style={styles.input}
            value={formatCepInput(cep)}
            onChangeText={(t) => onCepChange(t.replace(/\D/g, '').slice(0, 8))}
            placeholder="00000-000"
            placeholderTextColor={checkoutC.textMuted}
            keyboardType="number-pad"
            maxLength={9}
          />
        </View>
        <Pressable
          style={[styles.calcBtn, (!cepValido || loading) && styles.calcBtnDisabled]}
          onPress={onRecalculate}
          disabled={!cepValido || loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {destinationLabel ? (
        <Text style={styles.addressHint}>
          <Ionicons name="location-outline" size={12} color={checkoutC.textMuted} />{' '}
          {destinationLabel}
        </Text>
      ) : null}

      <View style={styles.quoteBox}>
        {loading ? (
          <Text style={styles.quoteLoading}>Calculando frete…</Text>
        ) : quote ? (
          <>
            <View style={styles.quoteMain}>
              <Text style={styles.quotePrice}>{formatBRL(quote.priceCents)}</Text>
              <Text style={styles.quoteEta}>
                {quote.estimatedDays} dia{quote.estimatedDays !== 1 ? 's' : ''} úteis
              </Text>
            </View>
            {quote.source === 'melhor_envio' && quote.carrier ? (
              <Text style={styles.quoteCarrier}>
                {quote.carrier}
                {quote.serviceName ? ` · ${quote.serviceName}` : ''}
              </Text>
            ) : (
              <Text style={styles.quoteCarrier}>Estimativa Levou Logistics</Text>
            )}
          </>
        ) : (
          <Text style={styles.quoteLoading}>Informe o CEP para calcular o frete.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: checkoutC.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: checkoutC.cardBorder,
    padding: 16,
    gap: 12,
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: checkoutC.text },
  cepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  cepField: { flex: 1, gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: checkoutC.textMuted },
  input: {
    backgroundColor: checkoutC.inputBg,
    borderWidth: 1,
    borderColor: checkoutC.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: checkoutC.text,
  },
  calcBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: checkoutC.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcBtnDisabled: { opacity: 0.45 },
  addressHint: { fontSize: 12, color: checkoutC.textSecondary, lineHeight: 18 },
  quoteBox: {
    backgroundColor: checkoutC.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: checkoutC.accentBorder,
    padding: 14,
    gap: 4,
  },
  quoteMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  quotePrice: { fontSize: 20, fontWeight: '800', color: checkoutC.accent },
  quoteEta: { fontSize: 12, fontWeight: '600', color: checkoutC.textSecondary },
  quoteCarrier: { fontSize: 11, color: checkoutC.textMuted },
  quoteLoading: { fontSize: 13, color: checkoutC.textMuted },
});
