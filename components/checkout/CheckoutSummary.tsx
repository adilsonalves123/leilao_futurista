import { StyleSheet, Text, View } from 'react-native';
import { formatBRL } from '@/src/lib/bids';
import { checkoutC } from './checkoutTheme';

type RowProps = {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  bold?: boolean;
};

function SummaryRow({ label, value, muted, highlight, bold }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
          highlight && styles.rowValueHighlight,
        ]}>
        {value}
      </Text>
    </View>
  );
}

type Props = {
  subtotalCents: number;
  commissionCents: number;
  shippingCents: number;
  shippingLabel: string;
  shippingLoading?: boolean;
  totalCents: number;
  paymentProviderLabel?: string | null;
  gatewayFeeCents?: number;
};

export function CheckoutSummary({
  subtotalCents,
  commissionCents,
  shippingCents,
  shippingLabel,
  shippingLoading,
  totalCents,
  paymentProviderLabel,
  gatewayFeeCents,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Resumo do pagamento</Text>
      <SummaryRow label="Lance vencedor" value={formatBRL(subtotalCents)} />
      <SummaryRow
        label="Taxa da plataforma (10%)"
        value={formatBRL(commissionCents)}
        muted
        highlight
      />
      <Text style={styles.commissionHint}>
        Retida do vendedor na liquidação — não aumenta seu total.
      </Text>
      <SummaryRow
        label={shippingLabel}
        value={shippingLoading ? 'Calculando…' : formatBRL(shippingCents)}
      />
      {paymentProviderLabel ? (
        <SummaryRow
          label="Processador"
          value={paymentProviderLabel}
          muted
        />
      ) : null}
      {gatewayFeeCents != null && gatewayFeeCents > 0 ? (
        <>
          <SummaryRow
            label="Taxa estimada do meio de pagamento"
            value={formatBRL(gatewayFeeCents)}
            muted
          />
          <Text style={styles.commissionHint}>
            Em caso de desistência sem culpa do vendedor, a taxa pode não ser reembolsada.
          </Text>
        </>
      ) : null}
      <View style={styles.divider} />
      <SummaryRow label="Total a pagar" value={formatBRL(totalCents)} bold />
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
    gap: 10,
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: checkoutC.text, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: checkoutC.text, flex: 1, paddingRight: 8 },
  rowLabelMuted: { color: checkoutC.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: checkoutC.text },
  rowValueBold: { fontSize: 20, fontWeight: '800', color: checkoutC.accent },
  rowValueHighlight: { color: checkoutC.accentBright },
  commissionHint: { fontSize: 10, color: checkoutC.textMuted, lineHeight: 14, marginTop: -4 },
  divider: { height: 1, backgroundColor: checkoutC.divider, marginVertical: 4 },
});
