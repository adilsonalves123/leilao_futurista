import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {
  useMaskedRenavamForWinner,
  WinnerVehicleRenavamBlock,
} from '@/components/listing/WinnerVehicleRenavamBlock';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { formatBRL } from '@/src/lib/bids';
import { lightColors } from '@/src/theme/lightTokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LotStatus =
  | 'em_andamento'
  | 'aguardando_pagamento'
  | 'pago'
  | 'em_envio'
  | 'concluido'
  | 'cancelado';

type PaymentMethod = 'pix' | 'boleto' | 'cartao' | 'cripto';

type MyBidLot = {
  id: string;
  orderId: string;
  auctionId: string;
  listingCategory?: string;
  title: string;
  imageUrl: string;
  status: LotStatus;
  summaryMeta: string;
  arremateCents: number;
  timeLeftLabel?: string;
  endedAt?: string;
  orderCode?: string;
  sellerName: string;
  commissionCents?: number;
  shippingCents?: number;
  totalPaidCents?: number;
  paymentMethod?: PaymentMethod | null;
  paymentStatusLabel?: string;
  paymentApprovedAt?: string;
  gateway?: string;
  transactionId?: string;
  deliveryAddress?: string;
  trackingCode?: string;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto bancário',
  cartao: 'Cartão de crédito',
  cripto: 'Criptomoeda',
};

const STATUS_META: Record<
  LotStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  em_andamento: {
    label: 'Em andamento',
    color: '#F59E0B',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  aguardando_pagamento: {
    label: 'Aguardando pagamento',
    color: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  pago: {
    label: 'Pago — aguardando envio',
    color: '#047857',
    bg: '#D1FAE5',
    border: '#A7F3D0',
  },
  em_envio: {
    label: 'Em trânsito',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    border: '#BFDBFE',
  },
  concluido: {
    label: 'Concluído',
    color: lightColors.accent,
    bg: '#F4F0FF',
    border: '#E9E0FF',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB',
  },
};

const EXPANDED_BORDER: Partial<Record<LotStatus, string>> = {
  aguardando_pagamento: '#F59E0B',
  concluido: '#10B981',
  pago: '#10B981',
};

const MOCK_LOTS: MyBidLot[] = [
  {
    id: 'lot-1',
    orderId: '11111111-1111-1111-1111-111111111101',
    auctionId: 'auction-mbp',
    title: 'MacBook Pro M2 512GB',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200',
    status: 'concluido',
    summaryMeta: 'Arrematado em 12/03/2026',
    arremateCents: 845000,
    endedAt: '12/03/2026 às 18:40',
    orderCode: 'LC-45821',
    sellerName: 'Adison Silva',
    commissionCents: 84500,
    shippingCents: 4500,
    totalPaidCents: 934000,
    paymentMethod: 'pix',
    paymentStatusLabel: 'Pagamento confirmado',
    paymentApprovedAt: '12/03/2026 às 19:05',
    gateway: 'Mercado Pago',
    transactionId: 'MP-8847291045',
    deliveryAddress: 'Rua das Flores, 245 — Centro\nCuritiba — PR\nCEP 80010-000',
    trackingCode: 'BR123456789BR',
  },
  {
    id: 'lot-2',
    orderId: '11111111-1111-1111-1111-111111111102',
    auctionId: 'auction-monitor',
    title: 'Monitor Gamer UltraWide 34"',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200',
    status: 'em_andamento',
    summaryMeta: 'Você é o maior lance atual',
    arremateCents: 185000,
    timeLeftLabel: '2h 14min restantes',
    sellerName: 'Tech Store PR',
  },
  {
    id: 'lot-3',
    orderId: '11111111-1111-1111-1111-111111111103',
    auctionId: 'auction-watch',
    title: 'Apple Watch Ultra 2',
    imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?q=80&w=200',
    status: 'aguardando_pagamento',
    summaryMeta: 'Arrematado em 08/03/2026',
    arremateCents: 289000,
    endedAt: '08/03/2026 às 11:22',
    orderCode: 'LC-45790',
    sellerName: 'Relógios Premium',
    commissionCents: 28900,
    shippingCents: 3200,
    totalPaidCents: 321100,
    paymentMethod: null,
    paymentStatusLabel: 'Aguardando seu pagamento',
    deliveryAddress: 'Av. Brasil, 1200 — Batel\nCuritiba — PR\nCEP 80240-000',
  },
  {
    id: 'lot-5',
    orderId: '11111111-1111-1111-1111-111111111105',
    auctionId: '2',
    listingCategory: 'veiculos',
    title: 'Tesla Model S Plaid 2024',
    imageUrl:
      'https://images.unsplash.com/photo-1560958089-b871ba4276f7?q=80&w=200',
    status: 'pago',
    summaryMeta: 'Arrematado em 01/06/2026',
    arremateCents: 42500000,
    endedAt: '01/06/2026 às 14:30',
    orderCode: 'LC-46102',
    sellerName: 'Auto Premium SP',
    commissionCents: 4250000,
    shippingCents: 0,
    totalPaidCents: 46750000,
    paymentMethod: 'pix',
    paymentStatusLabel: 'Pago — aguardando retirada / transferência',
    paymentApprovedAt: '01/06/2026 às 15:10',
    gateway: 'Mercado Pago',
    transactionId: 'MP-9921048871',
    deliveryAddress: 'Retirada combinada com o vendedor — São Paulo, SP',
  },
  {
    id: 'lot-4',
    orderId: '11111111-1111-1111-1111-111111111104',
    auctionId: 'auction-ps5',
    title: 'PlayStation 5 Edição Digital',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=200',
    status: 'em_envio',
    summaryMeta: 'Arrematado em 05/03/2026',
    arremateCents: 325000,
    endedAt: '05/03/2026 às 16:10',
    orderCode: 'LC-45712',
    sellerName: 'Games Center',
    commissionCents: 32500,
    shippingCents: 2800,
    totalPaidCents: 360300,
    paymentMethod: 'cartao',
    paymentStatusLabel: 'Pago — item em envio',
    paymentApprovedAt: '05/03/2026 às 16:45',
    gateway: 'Stripe',
    transactionId: 'ch_3Qx9K2mP8vL1',
    deliveryAddress: 'Alameda Santos, 500 — Jardins\nSão Paulo — SP\nCEP 01418-000',
    trackingCode: 'BR987654321BR',
  },
];

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  purpleSoft: '#F4F0FF',
};

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailCard({ children }: { children: ReactNode }) {
  return <View style={styles.detailCard}>{children}</View>;
}

function DetailRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          highlight && styles.detailValueHighlight,
          mono && styles.detailValueMono,
        ]}
        numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function LotAccordionCard({
  lot,
  expanded,
  onToggle,
  onOpenAuction,
  onPay,
  onCopy,
  onOpenChat,
}: {
  lot: MyBidLot;
  expanded: boolean;
  onToggle: () => void;
  onOpenAuction: () => void;
  onPay: () => void;
  onCopy: (text: string, label: string) => void;
  onOpenChat: () => void;
}) {
  const meta = STATUS_META[lot.status];
  const expandedBorder = expanded ? EXPANDED_BORDER[lot.status] : undefined;
  const isArremate = lot.status !== 'em_andamento';
  const showFinanceiro = isArremate && lot.totalPaidCents != null;
  const comissao = lot.commissionCents ?? Math.round(lot.arremateCents * 0.1);
  const frete = lot.shippingCents ?? 0;
  const total = lot.totalPaidCents ?? lot.arremateCents + comissao + frete;
  const vehicleRenavam = useMaskedRenavamForWinner({
    auctionId: lot.auctionId,
    orderId: lot.orderId,
    listingCategory: lot.listingCategory,
  });

  return (
    <View
      style={[
        styles.lotCard,
        expanded && styles.lotCardExpanded,
        expandedBorder ? { borderColor: expandedBorder, borderWidth: 2 } : null,
      ]}>
      <Pressable
        style={styles.lotHeaderPress}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${lot.title}, ${expanded ? 'recolher' : 'expandir'}`}>
        <View style={styles.lotTop}>
          <Image source={{ uri: lot.imageUrl }} style={styles.lotImage} />
          <View style={styles.lotInfo}>
            <Text style={styles.lotTitle} numberOfLines={2}>
              {lot.title}
            </Text>
            <Text style={styles.lotMeta}>{lot.summaryMeta}</Text>
            <Text style={styles.lotPriceLabel}>
              {lot.status === 'em_andamento' ? 'Seu lance atual' : 'Valor do arremate'}
            </Text>
            <Text style={styles.lotPrice}>{formatBRL(lot.arremateCents)}</Text>
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={C.textMuted}
            />
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedBody}>
          {lot.status === 'em_andamento' && lot.timeLeftLabel ? (
            <View style={styles.noticeBox}>
              <Ionicons name="timer-outline" size={16} color="#B45309" />
              <Text style={styles.noticeText}>
                {lot.timeLeftLabel}. Acompanhe o leilão para não perder o arremate.
              </Text>
            </View>
          ) : null}

          {lot.orderCode ? (
            <DetailSection title="Identificação">
              <DetailCard>
                <DetailRow label="Pedido" value={lot.orderCode} mono />
                {lot.endedAt ? (
                  <>
                    <RowDivider />
                    <DetailRow label="Encerrado em" value={lot.endedAt} />
                  </>
                ) : null}
              </DetailCard>
            </DetailSection>
          ) : null}

          {showFinanceiro ? (
            <DetailSection title="Resumo financeiro">
              <DetailCard>
                <DetailRow label="Valor do lance" value={formatBRL(lot.arremateCents)} />
                <RowDivider />
                <DetailRow label="Taxa da plataforma (10%)" value={formatBRL(comissao)} />
                <RowDivider />
                <DetailRow label="Frete" value={formatBRL(frete)} />
                <RowDivider />
                <DetailRow label="Total" value={formatBRL(total)} highlight />
              </DetailCard>
            </DetailSection>
          ) : null}

          {isArremate ? (
            <DetailSection title="Pagamento">
              <DetailCard>
                <DetailRow
                  label="Status"
                  value={lot.paymentStatusLabel ?? '—'}
                  highlight={lot.status === 'concluido' || lot.status === 'pago'}
                />
                <RowDivider />
                <DetailRow
                  label="Forma de pagamento"
                  value={
                    lot.paymentMethod
                      ? PAYMENT_METHOD_LABELS[lot.paymentMethod]
                      : 'Não informado — aguardando escolha'
                  }
                />
                {lot.paymentApprovedAt ? (
                  <>
                    <RowDivider />
                    <DetailRow label="Aprovado em" value={lot.paymentApprovedAt} />
                  </>
                ) : null}
                {lot.gateway ? (
                  <>
                    <RowDivider />
                    <DetailRow label="Gateway" value={lot.gateway} />
                  </>
                ) : null}
                {lot.transactionId ? (
                  <>
                    <RowDivider />
                    <DetailRow label="ID da transação" value={lot.transactionId} mono />
                  </>
                ) : null}
              </DetailCard>
            </DetailSection>
          ) : null}

          <DetailSection title="Vendedor">
            <DetailCard>
              <View style={styles.personRow}>
                <Ionicons name="storefront-outline" size={18} color={C.accent} />
                <View style={styles.personBody}>
                  <Text style={styles.personName}>{lot.sellerName}</Text>
                  {lot.deliveryAddress ? (
                    <Text style={styles.personSub}>Entrega no endereço cadastrado abaixo</Text>
                  ) : null}
                </View>
              </View>
            </DetailCard>
          </DetailSection>

          {lot.deliveryAddress ? (
            <DetailSection title="Endereço de entrega">
              <DetailCard>
                <View style={styles.personRow}>
                  <Ionicons name="location-outline" size={18} color={C.accent} />
                  <Text style={styles.addressText}>{lot.deliveryAddress}</Text>
                </View>
              </DetailCard>
            </DetailSection>
          ) : null}

          {isArremate && vehicleRenavam.visible ? (
            <DetailSection title="Veículo arrematado">
              <WinnerVehicleRenavamBlock
                auctionId={lot.auctionId}
                orderId={lot.orderId}
                listingCategory={lot.listingCategory}
              />
            </DetailSection>
          ) : null}

          {lot.trackingCode ? (
            <DetailSection title="Rastreamento">
              <DetailCard>
                <View style={styles.trackingRow}>
                  <Text style={styles.trackingCode}>{lot.trackingCode}</Text>
                  <Pressable
                    style={styles.copyBtn}
                    onPress={() => onCopy(lot.trackingCode!, 'Código de rastreio')}
                    accessibilityRole="button"
                    accessibilityLabel="Copiar rastreio">
                    <Ionicons name="copy-outline" size={14} color={C.accent} />
                    <Text style={styles.copyBtnText}>Copiar</Text>
                  </Pressable>
                </View>
              </DetailCard>
            </DetailSection>
          ) : null}

          <DetailSection title="Ações">
            <View style={styles.actionCol}>
              {lot.status === 'em_andamento' ? (
                <Pressable style={styles.actionBtnPrimary} onPress={onOpenAuction}>
                  <Ionicons name="hammer-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Ver Leilão e Dar Lance</Text>
                </Pressable>
              ) : null}

              {lot.status === 'aguardando_pagamento' ? (
                <Pressable style={styles.actionBtnPrimary} onPress={onPay}>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Efetuar Pagamento</Text>
                </Pressable>
              ) : null}

              {lot.status !== 'em_andamento' ? (
                <>
                  <Pressable style={styles.actionBtnPrimary} onPress={onOpenChat}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Chat privado do lote</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnSecondary} onPress={onOpenAuction}>
                    <Ionicons name="open-outline" size={18} color={C.accent} />
                    <Text style={styles.actionBtnSecondaryText}>Ver Anúncio do Item</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </DetailSection>
        </View>
      ) : null}
    </View>
  );
}

export default function MyBidsScreen() {
  const router = useRouter();
  const { expand } = useLocalSearchParams<{ expand?: string }>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const lots = useMemo(() => MOCK_LOTS, []);

  useEffect(() => {
    if (typeof expand === 'string' && lots.some((lot) => lot.id === expand)) {
      setExpandedId(expand);
    }
  }, [expand, lots]);

  const toggleExpand = useCallback((lotId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === lotId ? null : lotId));
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado!', `${label} copiado.`);
  }, []);

  const handlePay = useCallback((lot: MyBidLot) => {
    Alert.alert(
      'Pagamento',
      `Escolha a forma de pagamento para o pedido ${lot.orderCode ?? lot.id}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pix',
          onPress: () => Alert.alert('Pix', 'QR Code de pagamento em breve nesta tela.'),
        },
        {
          text: 'Cartão',
          onPress: () =>
            Alert.alert('Cartão', 'Checkout com cartão será aberto em breve.'),
        },
      ],
    );
  }, []);

  return (
    <SubScreenLayout
      title="Meus Lotes / Arremates"
      subtitle="Toque em um lote para ver a transação completa">
      <View style={styles.summaryCard}>
        <Ionicons name="hammer-outline" size={22} color={C.accent} />
        <View style={styles.summaryTextWrap}>
          <Text style={styles.summaryTitle}>{lots.length} lotes na sua conta</Text>
          <Text style={styles.summaryDesc}>
            Lance em disputa, pagamentos, envio e histórico de arremates.
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {lots.map((lot) => (
          <LotAccordionCard
            key={lot.id}
            lot={lot}
            expanded={expandedId === lot.id}
            onToggle={() => toggleExpand(lot.id)}
            onOpenAuction={() => router.push(`/auction/${lot.auctionId}`)}
            onPay={() => handlePay(lot)}
            onCopy={handleCopy}
            onOpenChat={() =>
              router.push({
                pathname: '/my-bids/chat/[orderId]',
                params: {
                  orderId: lot.orderId,
                  title: lot.title,
                  code: lot.orderCode ?? '',
                },
              })
            }
          />
        ))}
      </View>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryTextWrap: { flex: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  summaryDesc: { fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 18 },
  list: { gap: 14 },
  lotCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lotCardExpanded: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lotHeaderPress: { padding: 14, paddingBottom: 10 },
  lotTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  lotImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6' },
  lotInfo: { flex: 1 },
  lotTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, lineHeight: 20 },
  lotMeta: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  lotPriceLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  lotPrice: { fontSize: 18, fontWeight: '800', color: C.accent, marginTop: 2 },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  detailSection: { gap: 8 },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 2,
  },
  detailCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: { fontSize: 12, color: C.textMuted, flex: 1 },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    flex: 1.2,
    textAlign: 'right',
  },
  detailValueHighlight: { fontSize: 15, fontWeight: '800', color: C.accent },
  detailValueMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },
  rowDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  personRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  personBody: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  personSub: { fontSize: 12, color: C.textMuted },
  addressText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trackingCode: { fontSize: 15, fontWeight: '800', color: C.textPrimary, flex: 1 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.purpleSoft,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: C.accent },
  actionCol: { gap: 10 },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.purpleSoft,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: C.accent },
});
