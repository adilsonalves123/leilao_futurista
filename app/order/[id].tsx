import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet } from 'react-native';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Text, View } from '@/components/Themed';
import { TRANSACTION_STATUS_LABELS } from '@/src/constants/operations';
import { hoursRemaining } from '@/src/lib/businessHours';
import { useOperationsStore } from '@/src/hooks/useOperationsStore';
import { formatBRL } from '@/src/lib/bids';
import {
  useMaskedRenavamForWinner,
  WinnerVehicleRenavamBlock,
} from '@/components/listing/WinnerVehicleRenavamBlock';
import { getSupabaseOrderIdForLocal } from '@/src/services/orderPersistence';
import { compradorConfirmarRecebimento } from '@/src/services/buyerOrders';
import { obterDisputaComprador, type BuyerDispute } from '@/src/services/buyerDisputes';
import { DISPUTE_CATEGORY_LABELS, DISPUTE_STATUS_LABELS } from '@/src/types/adminDisputas';
import { colors, spacing } from '@/src/theme/tokens';
function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getOrder, confirmReceipt, state } = useOperationsStore();
  const order = getOrder(id ?? '');

  const [remaining, setRemaining] = useState(0);
  const [supabaseOrderId, setSupabaseOrderId] = useState<string | null>(null);
  const [disputa, setDisputa] = useState<BuyerDispute | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const handleConfirmReceipt = useCallback(async () => {
    if (!order || confirmando) return;

    if (supabaseOrderId) {
      setConfirmando(true);
      try {
        const result = await compradorConfirmarRecebimento(supabaseOrderId);
        if (!result.ok) {
          Alert.alert(
            'Não foi possível confirmar',
            result.message ?? 'Tente novamente em instantes.',
          );
          return;
        }
      } finally {
        setConfirmando(false);
      }
    }

    confirmReceipt(order.id);
    Alert.alert('Recebimento confirmado', 'O vendedor foi notificado e a garantia do lote foi liberada.');
  }, [confirmando, confirmReceipt, order, supabaseOrderId]);
  useEffect(() => {
    if (!id) return;
    getSupabaseOrderIdForLocal(id).then(setSupabaseOrderId);
  }, [id]);

  useEffect(() => {
    if (!supabaseOrderId || order?.status !== 'EM_DISPUTA') {
      setDisputa(null);
      return;
    }
    obterDisputaComprador(supabaseOrderId).then(setDisputa);
  }, [supabaseOrderId, order?.status]);

  useEffect(() => {
    if (!order?.confirmationDeadlineAt) return;
    const tick = () => setRemaining(hoursRemaining(order.confirmationDeadlineAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order?.confirmationDeadlineAt, state.orders]);

  if (!order) {
    return (
      <View style={styles.container}>
        <Text muted>Pedido não encontrado.</Text>
      </View>
    );
  }

  const canConfirmOrDispute = order.status === 'AGUARDANDO_CONFIRMACAO';
  const isSettled = order.status === 'LIQUIDADO' || order.status === 'ESTORNADO';
  const vehicleRenavam = useMaskedRenavamForWinner({
    auctionId: order.auctionId,
    orderId: supabaseOrderId ?? undefined,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading} timer>
        Meu pedido
      </Text>
      <Text muted>Pedido {order.id}</Text>

      <GlassPanel style={styles.panel}>
        <Text style={styles.status}>
          {TRANSACTION_STATUS_LABELS[order.status] ?? order.status}
        </Text>
        <Text muted>Total pago: {formatBRL(order.totalCents)}</Text>
        <Text muted>
          Pagamento: {order.paymentMethod === 'PIX' ? 'Pix' : order.paymentMethod === 'CARTAO' ? 'Cartão' : 'Cripto'}
        </Text>
      </GlassPanel>

      {vehicleRenavam.visible ? (
        <WinnerVehicleRenavamBlock
          auctionId={order.auctionId}
          orderId={supabaseOrderId ?? undefined}
        />
      ) : null}

      {canConfirmOrDispute ? (
        <GlassPanel style={styles.timerPanel}>
          <Text style={styles.timerLabel}>Prazo para confirmar ou disputar</Text>
          <Text style={styles.timer} timer>
            {formatRemaining(remaining)}
          </Text>
          <Text muted style={styles.timerHint}>
            Após 48h sem reclamações, o pagamento será liberado automaticamente ao vendedor.
          </Text>
          <Pressable
            style={[styles.confirmBtn, confirmando && styles.confirmBtnDisabled]}
            disabled={confirmando}
            onPress={() => void handleConfirmReceipt()}>
            <Text style={styles.confirmBtnText}>
              {confirmando ? 'Confirmando…' : 'Confirmar recebimento'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.disputeBtn}
            onPress={() =>
              router.push({ pathname: '/order/dispute', params: { localId: order.id } } as never)
            }>
            <Text style={styles.disputeBtnText}>Abrir disputa</Text>
          </Pressable>
        </GlassPanel>
      ) : null}

      {order.status === 'EM_DISPUTA' ? (
        <GlassPanel style={styles.disputePanel}>
          <Text style={styles.disputeActive}>Disputa aberta — saldo congelado</Text>
          <Text muted>
            {disputa
              ? `${DISPUTE_CATEGORY_LABELS[disputa.category]} · ${DISPUTE_STATUS_LABELS[disputa.status]}`
              : 'Aguardando intervenção do Painel Admin.'}
          </Text>
          {disputa?.reason ? <Text muted style={styles.disputeReason}>{disputa.reason}</Text> : null}
          {disputa?.evidence.length ? (
            <View style={styles.evidenceRow}>
              {disputa.evidence.slice(0, 4).map((ev) =>
                ev.kind === 'video' ? (
                  <View key={ev.id} style={styles.evidenceVideo}>
                    <Text style={styles.evidenceVideoText}>Vídeo</Text>
                  </View>
                ) : (
                  <Image key={ev.id} source={{ uri: ev.mediaUrl }} style={styles.evidenceImg} />
                ),
              )}
            </View>
          ) : null}
        </GlassPanel>
      ) : null}

      {isSettled ? (
        <GlassPanel>
          <Text style={styles.settled}>
            {order.status === 'LIQUIDADO'
              ? 'Pedido finalizado. Comissão repassada ao vendedor e plataforma.'
              : 'Valor estornado ao comprador.'}
          </Text>
          {order.status === 'LIQUIDADO' ? (
            <Pressable
              style={styles.reviewBtn}
              onPress={() =>
                router.push({
                  pathname: '/reviews/create',
                  params: {
                    orderId: supabaseOrderId ?? order.id,
                    auctionId: order.auctionId,
                    vendorId: order.vendorId,
                    titulo: `Pedido ${order.id}`,
                  },
                } as never)
              }>
              <Text style={styles.reviewBtnText}>Avaliar com fotos reais</Text>
            </Pressable>
          ) : null}
        </GlassPanel>
      ) : null}
      {order.status === 'RETIDO_EM_CUSTODIA' || order.status === 'EM_TRANSITO' ? (
        <GlassPanel>
          <Text muted>
            Aguardando entrega. Você será notificado quando puder confirmar o recebimento.
          </Text>
        </GlassPanel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  heading: { fontSize: 22, color: colors.neonCyan },
  panel: { gap: spacing.sm },
  status: { fontSize: 16, fontWeight: '700', color: colors.cyberGreen },
  timerPanel: { gap: spacing.sm, alignItems: 'center' },
  timerLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  timer: { fontSize: 36, letterSpacing: 4, color: colors.neonPink },
  timerHint: { textAlign: 'center', fontSize: 12 },
  confirmBtn: {
    backgroundColor: colors.cyberGreen,
    padding: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm,
  },
  confirmBtnText: { color: colors.background, fontWeight: '700' },
  confirmBtnDisabled: { opacity: 0.6 },
  disputeBtn: {
    borderWidth: 1,
    borderColor: colors.neonPink,
    padding: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  disputeBtnText: { color: colors.neonPink, fontWeight: '700' },
  disputeActive: { color: colors.neonPink, fontWeight: '700' },
  disputePanel: { gap: spacing.sm },
  disputeReason: { fontSize: 13, lineHeight: 18 },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  evidenceImg: { width: 64, height: 64, borderRadius: 8 },
  evidenceVideo: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceVideoText: { fontSize: 10, color: colors.textMuted },
  settled: { color: colors.cyberGreen },
  reviewBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.neonCyan,
    padding: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  reviewBtnText: { color: colors.background, fontWeight: '700' },
});