import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LotChatPanel } from '@/src/components/lot-chat/LotChatPanel';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import type { AdminPedidoDetalhe } from '@/src/admin/types';
import {
  METODO_PAGAMENTO_PEDIDO_LABEL,
  STATUS_PEDIDO_LABEL,
} from '@/src/admin/types';
import { formatBRL } from '@/src/lib/bids';
import { obterPedidoAdmin } from '@/src/services/adminPedidos';
import { obterDisputaAdmin } from '@/src/services/adminDisputas';
import { listarReviewsPorPedido } from '@/src/services/reviews';
import type { Review } from '@/src/types/review';
import { formatarDataPedidoAdmin } from '@/src/admin/pedidosMock';
import { AdminLeilaoPendenciaBadge } from '../_components/AdminLeilaoPendenciaBadge';
import { AdminOperacionalFluxoPanel } from '../_components/AdminOperacionalFluxoPanel';
import { OrderContactCard } from '../_components/OrderContactCard';
import { OrderEventLog } from '../_components/OrderEventLog';
import { OrderTimelineVisual } from '../_components/OrderTimelineVisual';
import { ReviewPhotosModeration } from '../_components/ReviewPhotosModeration';
import { adminC, adminStyles } from '../_components/adminStyles';

const STATUS_CORES: Record<string, { bg: string; text: string }> = {
  pendente_pagamento: { bg: '#422006', text: '#FCD34D' },
  pago: { bg: '#1E3A5F', text: '#93C5FD' },
  em_envio: { bg: '#312E81', text: '#C4B5FD' },
  aguardando_confirmacao: { bg: '#422006', text: '#FDE68A' },
  finalizado: { bg: '#064E3B', text: '#6EE7B7' },
  em_disputa: { bg: '#450A0A', text: '#FCA5A5' },
  estornado: { bg: '#374151', text: '#D1D5DB' },
};

function FinanceRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.financeRow}>
      <Text style={styles.financeLabel}>{label}</Text>
      <Text style={[styles.financeValue, highlight && styles.financeHighlight]}>{value}</Text>
    </View>
  );
}

export default function AdminPedidoDetalheScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pedido, setPedido] = useState<AdminPedidoDetalhe | null>(null);
  const [temDisputa, setTemDisputa] = useState(false);
  const [reviewsPedido, setReviewsPedido] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setNaoEncontrado(false);
    try {
      const dados = await obterPedidoAdmin(String(id));
      if (!dados) {
        setNaoEncontrado(true);
        setPedido(null);
      } else {
        setPedido(dados);
        const revs = await listarReviewsPorPedido(dados.id);
        setReviewsPedido(revs);
        if (dados.status === 'em_disputa') {
          const disputa = await obterDisputaAdmin(dados.id).catch(() => null);
          setTemDisputa(Boolean(disputa));
        } else {
          setTemDisputa(false);
        }
      }
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao('suporte')) {
    return <Redirect href="/admin/equipe" />;
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adminC.accent} />
        <Text style={styles.loadingText}>Carregando pedido…</Text>
      </View>
    );
  }

  if (naoEncontrado || !pedido) {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={48} color={adminC.textMuted} />
        <Text style={styles.notFoundTitle}>Pedido não encontrado</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar à lista</Text>
        </Pressable>
      </View>
    );
  }

  const statusCores = STATUS_CORES[pedido.status] ?? STATUS_CORES.pendente_pagamento;
  const aprovadoFmt = pedido.pagamento.aprovadoEm
    ? formatarDataPedidoAdmin(pedido.pagamento.aprovadoEm)
    : '—';

  const orderId = pedido.id;

  return (
    <View style={styles.page}>
      <View style={styles.pageTop}>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#C4B5FD" />
          <Text style={styles.backLinkText}>Voltar aos pedidos</Text>
        </Pressable>

        <View style={styles.header}>
          <Image source={{ uri: pedido.imagemLeilao }} style={styles.heroImg} />
          <View style={styles.headerText}>
            <Text style={styles.codigo}>{pedido.codigo}</Text>
            <Text style={adminStyles.pageTitle}>{pedido.tituloLeilao}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusCores.bg }]}>
                <Text style={[styles.statusText, { color: statusCores.text }]}>
                  {STATUS_PEDIDO_LABEL[pedido.status]}
                </Text>
              </View>
              {pedido.pendencia ? (
                <AdminLeilaoPendenciaBadge pendencia={pedido.pendencia} />
              ) : null}
            </View>
            <Text style={styles.meta}>
              Criado em {formatarDataPedidoAdmin(pedido.criadoEm)}
              {pedido.codigoRastreio ? ` · Rastreio ${pedido.codigoRastreio}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {pedido.status === 'em_disputa' && temDisputa ? (
        <Pressable
          style={styles.disputaBanner}
          onPress={() =>
            router.push(`/admin/disputas/${encodeURIComponent(pedido.id)}` as never)
          }>
          <Ionicons name="scale-outline" size={22} color="#FCA5A5" />
          <View style={styles.disputaBannerText}>
            <Text style={styles.disputaBannerTitle}>Disputa aberta neste pedido</Text>
            <Text style={styles.disputaBannerSub}>
              Abra a sala de mediação para ver evidências, chat e emitir veredito.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FCA5A5" />
        </Pressable>
      ) : null}

      <View style={styles.split}>
        <ScrollView
          style={styles.colPedido}
          contentContainerStyle={styles.colPedidoContent}
          showsVerticalScrollIndicator>
          <View style={styles.grid}>
        <View style={styles.colMain}>
          {pedido.pendencia ? (
            <View style={adminStyles.card}>
              <AdminOperacionalFluxoPanel
                pendencia={pedido.pendencia}
                timeline={pedido.timeline}
                eventos={pedido.eventos}
                pedidoId={pedido.id}
                pedidoCodigo={pedido.codigo}
                leilaoId={pedido.leilaoId}
                vencedor={pedido.comprador.nome}
                rastreio={pedido.codigoRastreio}
              />
            </View>
          ) : null}

          {!pedido.pendencia ? (
            <View
              style={[
                adminStyles.card,
                Platform.OS === 'web'
                  ? ({
                      backgroundImage:
                        'linear-gradient(145deg, rgba(31,41,55,0.8) 0%, rgba(17,24,39,0.95) 100%)',
                    } as object)
                  : null,
              ]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="git-branch-outline" size={18} color={adminC.accent} />
                <Text style={adminStyles.cardTitle}>Timeline do pedido</Text>
              </View>
              <OrderTimelineVisual etapas={pedido.timeline} />
            </View>
          ) : null}

          <View style={adminStyles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={adminC.accent} />
              <Text style={adminStyles.cardTitle}>Log de eventos</Text>
            </View>
            <Text style={styles.sectionHint}>
              Histórico interno para identificar onde o processo travou.
            </Text>
            <OrderEventLog eventos={pedido.eventos} />
          </View>

          <ReviewPhotosModeration reviews={reviewsPedido} />
        </View>

        <View style={styles.colSide}>
          <View style={adminStyles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={18} color={adminC.accent} />
              <Text style={adminStyles.cardTitle}>Contato das partes</Text>
            </View>
            <View style={styles.contacts}>
              <OrderContactCard
                titulo="Comprador"
                icone="person-outline"
                parte={pedido.comprador}
                mostrarCpf
              />
              <OrderContactCard
                titulo="Vendedor"
                icone="storefront-outline"
                parte={pedido.vendedor}
              />
            </View>
          </View>

          <View
            style={[
              adminStyles.card,
              Platform.OS === 'web'
                ? ({
                    backgroundImage:
                      'linear-gradient(145deg, rgba(49,46,129,0.35) 0%, rgba(17,24,39,0.95) 100%)',
                  } as object)
                : null,
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={18} color={adminC.accent} />
              <Text style={adminStyles.cardTitle}>Dados financeiros</Text>
            </View>
            <FinanceRow label="Valor do arremate" value={formatBRL(pedido.itemCents)} highlight />
            <FinanceRow label="Comissão plataforma" value={formatBRL(pedido.comissaoCents)} />
            <FinanceRow label="Frete" value={formatBRL(pedido.freteCents)} />
            <FinanceRow label="Total pago" value={formatBRL(pedido.valorCents)} highlight />
            <View style={styles.divider} />
            <FinanceRow
              label="Método de pagamento"
              value={METODO_PAGAMENTO_PEDIDO_LABEL[pedido.pagamento.metodo]}
            />
            <FinanceRow label="Gateway" value={pedido.pagamento.gateway} />
            <FinanceRow
              label="ID transação"
              value={pedido.pagamento.transacaoId ?? '—'}
            />
            <FinanceRow label="Aprovado em" value={aprovadoFmt} />
            {pedido.pagamento.comprovanteUrl ? (
              <Pressable
                style={styles.comprovanteBtn}
                onPress={() => Linking.openURL(pedido.pagamento.comprovanteUrl!).catch(() => {})}>
                <Ionicons name="document-attach-outline" size={16} color="#C4B5FD" />
                <Text style={styles.comprovanteText}>Abrir comprovante</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
        </ScrollView>

        <View style={styles.colChat}>
          <LotChatPanel orderId={orderId} mode="admin" embedded />
        </View>
      </View>
    </View>
  );
}

const webFlex =
  Platform.OS === 'web'
    ? ({ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 } as object)
    : {};

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, ...webFlex },
  pageTop: { flexShrink: 0, marginBottom: 16 },
  split: {
    flex: 1,
    minHeight: 0,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 20,
    ...webFlex,
  },
  colPedido: { flex: 1, minWidth: 0, minHeight: 0 },
  colPedidoContent: { paddingBottom: 32 },
  colChat: {
    width: Platform.OS === 'web' ? 400 : ('100%' as unknown as number),
    minWidth: Platform.OS === 'web' ? 340 : undefined,
    maxWidth: '100%' as unknown as number,
    flexShrink: 0,
    minHeight: Platform.OS === 'web' ? 0 : 420,
    ...(Platform.OS === 'web' ? ({ height: '100%' as unknown as number, ...webFlex } as object) : {}),
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { color: adminC.textMuted, fontSize: 14, marginTop: 8 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: adminC.textPrimary },
  backBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: adminC.accent,
  },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backLinkText: { color: '#C4B5FD', fontWeight: '700', fontSize: 14 },
  header: { flexDirection: 'row', gap: 18, marginBottom: 24, alignItems: 'flex-start' },
  heroImg: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: adminC.border,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerText: { flex: 1, gap: 6 },
  codigo: { fontSize: 14, fontWeight: '800', color: '#93C5FD', fontFamily: 'monospace' },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  meta: { fontSize: 13, color: adminC.textMuted, marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'flex-start',
  },
  colMain: { flex: 1, minWidth: 320, gap: 0 },
  colSide: { width: 360, minWidth: 300, maxWidth: '100%' as unknown as number, gap: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: adminC.textMuted, marginBottom: 14, lineHeight: 18 },
  contacts: { gap: 12, marginTop: 8 },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  financeLabel: { fontSize: 13, color: adminC.textMuted, fontWeight: '600' },
  financeValue: { fontSize: 14, color: adminC.textPrimary, fontWeight: '700' },
  financeHighlight: { color: '#6EE7B7', fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  comprovanteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: adminC.accent,
  },
  comprovanteText: { color: '#C4B5FD', fontWeight: '700', fontSize: 13 },
  disputaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    backgroundColor: 'rgba(69, 10, 10, 0.45)',
  },
  disputaBannerText: { flex: 1, gap: 4 },
  disputaBannerTitle: { fontSize: 14, fontWeight: '800', color: '#FCA5A5' },
  disputaBannerSub: { fontSize: 12, color: adminC.textMuted, lineHeight: 17 },
});
