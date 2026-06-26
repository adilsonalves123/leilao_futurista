import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatBRL } from '@/src/lib/bids';
import { mockLiberarChatVendedor } from '@/src/services/vendorLotChat';
import { lightColors } from '@/src/theme/lightTokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type VendorSaleStatus = 'awaiting_payment' | 'paid_ready' | 'in_transit' | 'completed';

type BuyerDelivery = {
  name: string;
  addressLine: string;
  cityState: string;
  cep: string;
  phone?: string;
};

type VendorSale = {
  id: string;
  /** ID do pedido (orders) para chat privado do lote */
  orderId: string;
  title: string;
  imageUrl: string;
  endedAt: string;
  soldPriceCents: number;
  status: VendorSaleStatus;
  /** Demo: vendedor já convidado ao chat tripartite */
  chatLiberado?: boolean;
  paymentHoursLeft?: number;
  trackingCode?: string;
  labelQrData?: string;
  barcodeData?: string;
  buyer: BuyerDelivery;
};

const PLATFORM_FEE_RATE = 0.1;

const MOCK_VENDOR_SALES: VendorSale[] = [
  {
    id: 'sale-1',
    orderId: '11111111-1111-1111-1111-111111111101',
    title: 'iPhone 16 Pro Max 256GB',
    imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=200',
    endedAt: '28/05/2026 às 14:32',
    soldPriceCents: 749900,
    status: 'awaiting_payment',
    paymentHoursLeft: 18,
    buyer: {
      name: 'Lucas S.',
      addressLine: 'Rua das Flores, 245 — Centro',
      cityState: 'Curitiba — PR',
      cep: '80010-000',
      phone: '41998765432',
    },
  },
  {
    id: 'sale-2',
    orderId: '11111111-1111-1111-1111-111111111102',
    chatLiberado: true,
    title: 'MacBook Pro M3 Max 512GB',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200',
    endedAt: '27/05/2026 às 09:15',
    soldPriceCents: 1899000,
    status: 'paid_ready',
    labelQrData: 'LUCKCODE-LABEL-MBP3-77492',
    barcodeData: '7894561230987',
    buyer: {
      name: 'Ana M.',
      addressLine: 'Av. Brasil, 1200 — Batel',
      cityState: 'Curitiba — PR',
      cep: '80240-000',
      phone: '41999887766',
    },
  },
  {
    id: 'sale-3',
    orderId: '11111111-1111-1111-1111-111111111103',
    title: 'Drone DJI Mavic 3 Pro',
    imageUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=200',
    endedAt: '25/05/2026 às 20:48',
    soldPriceCents: 589000,
    status: 'in_transit',
    trackingCode: 'BR987654321BR',
    buyer: {
      name: 'Pedro R.',
      addressLine: 'Rua XV de Novembro, 88 — Centro',
      cityState: 'Londrina — PR',
      cep: '86020-080',
      phone: '43991234567',
    },
  },
  {
    id: 'sale-4',
    orderId: '11111111-1111-1111-1111-111111111104',
    title: 'PlayStation 5 Edição Digital',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=200',
    endedAt: '22/05/2026 às 11:05',
    soldPriceCents: 325000,
    status: 'completed',
    trackingCode: 'BR123456789BR',
    buyer: {
      name: 'Julia K.',
      addressLine: 'Alameda Santos, 500 — Jardins',
      cityState: 'São Paulo — SP',
      cep: '01418-000',
      phone: '11987654321',
    },
  },
  {
    id: 'sale-5',
    orderId: '11111111-1111-1111-1111-111111111105',
    title: 'AirPods Pro 2ª Geração',
    imageUrl: 'https://images.unsplash.com/photo-1606841837239-c5a061070ced?q=80&w=200',
    endedAt: '20/05/2026 às 16:22',
    soldPriceCents: 124000,
    status: 'completed',
    trackingCode: 'BR556677889BR',
    buyer: {
      name: 'Marcos T.',
      addressLine: 'Rua Oscar Freire, 310 — Pinheiros',
      cityState: 'São Paulo — SP',
      cep: '05409-010',
      phone: '11976543210',
    },
  },
];

const TIMELINE_STEPS: { key: VendorSaleStatus; label: string }[] = [
  { key: 'awaiting_payment', label: 'Pagamento' },
  { key: 'paid_ready', label: 'Envio' },
  { key: 'in_transit', label: 'Trânsito' },
  { key: 'completed', label: 'Concluído' },
];

const STATUS_META: Record<
  VendorSaleStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  awaiting_payment: {
    label: 'Aguardando Pagamento do Comprador',
    color: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  paid_ready: {
    label: 'Pago - Pronto para Envio',
    color: '#047857',
    bg: '#D1FAE5',
    border: '#A7F3D0',
  },
  in_transit: {
    label: 'Item Postado / Em Trânsito',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    border: '#BFDBFE',
  },
  completed: {
    label: 'Concluído',
    color: lightColors.accent,
    bg: '#F4F0FF',
    border: '#E9E0FF',
  },
};

const EXPANDED_BORDER: Partial<Record<VendorSaleStatus, string>> = {
  awaiting_payment: '#F59E0B',
  completed: '#10B981',
};

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

const MOCK_SENDER = {
  name: 'Adison Silva',
  role: 'Remetente (Vendedor)',
  address: 'Av. Paulista, 1000 — Bela Vista',
  city: 'São Paulo — SP',
  cep: '01310-100',
};

function formatarEnderecoEntrega(buyer: BuyerDelivery): string {
  return `${buyer.addressLine}\n${buyer.cityState}\nCEP ${buyer.cep}`;
}

function calcularResumoFinanceiro(soldPriceCents: number) {
  const taxaPlataformaCents = Math.round(soldPriceCents * PLATFORM_FEE_RATE);
  const totalLiquidoCents = soldPriceCents - taxaPlataformaCents;
  return { soldPriceCents, taxaPlataformaCents, totalLiquidoCents };
}

function buildLabelHtml(sale: VendorSale): string {
  const qrData = encodeURIComponent(sale.labelQrData ?? sale.id);
  const barcode = sale.barcodeData ?? '7894561230987';
  const tracking = sale.trackingCode ?? `BR${sale.id.replace(/\D/g, '').slice(0, 9)}BR`;
  const buyer = sale.buyer;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #1A1625; }
    .label { border: 2px solid #7C3AED; border-radius: 12px; padding: 20px; max-width: 480px; }
    .header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #E9E0FF; padding-bottom: 14px; margin-bottom: 16px; }
    .logo { font-size: 22px; font-weight: 800; color: #7C3AED; }
    .logo span { color: #1A1625; }
    .badge { font-size: 10px; background: #F4F0FF; color: #7C3AED; padding: 4px 10px; border-radius: 20px; font-weight: 700; margin-left: auto; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; font-weight: 700; margin-bottom: 4px; }
    .section-name { font-size: 14px; font-weight: 700; }
    .section-detail { font-size: 11px; color: #6B7280; line-height: 1.5; }
    .product { background: #FAFAFE; border-radius: 8px; padding: 10px; margin-bottom: 16px; }
    .codes { text-align: center; margin: 16px 0; }
    .qr { width: 160px; height: 160px; }
    .barcode { font-family: monospace; font-size: 16px; letter-spacing: 3px; font-weight: 700; margin-top: 8px; }
    .footer { font-size: 9px; color: #9CA3AF; text-align: center; border-top: 1px solid #F3F4F6; padding-top: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="logo">Luck<span>Code</span></div>
      <div class="badge">ETIQUETA OFICIAL</div>
    </div>
    <div class="section">
      <div class="section-title">Remetente (Vendedor)</div>
      <div class="section-name">${MOCK_SENDER.name}</div>
      <div class="section-detail">${MOCK_SENDER.address}<br/>${MOCK_SENDER.city} — CEP ${MOCK_SENDER.cep}</div>
    </div>
    <div class="section">
      <div class="section-title">Destinatário (Comprador)</div>
      <div class="section-name">${buyer.name}</div>
      <div class="section-detail">${buyer.addressLine}<br/>${buyer.cityState} — CEP ${buyer.cep}</div>
    </div>
    <div class="product">
      <div class="section-title">Produto</div>
      <div class="section-name">${sale.title}</div>
      <div class="section-detail">Rastreio: ${tracking}</div>
    </div>
    <div class="codes">
      <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}" alt="QR Code" />
      <div class="barcode">${barcode}</div>
    </div>
    <div class="footer">Frete pré-pago pelo comprador · Apresente na agência dos Correios ou transportadora</div>
  </div>
</body>
</html>`;
}

async function generateLabelPdf(sale: VendorSale): Promise<string> {
  const html = buildLabelHtml(sale);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

function statusIndex(status: VendorSaleStatus): number {
  return TIMELINE_STEPS.findIndex((s) => s.key === status);
}

function SaleTimeline({ currentStatus }: { currentStatus: VendorSaleStatus }) {
  const activeIdx = statusIndex(currentStatus);

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, index) => {
        const done = index <= activeIdx;
        const isCurrent = index === activeIdx;
        const meta = STATUS_META[step.key];
        return (
          <View key={step.key} style={styles.timelineStep}>
            <View style={styles.timelineDotRow}>
              <View
                style={[
                  styles.timelineDot,
                  done && { backgroundColor: meta.color, borderColor: meta.color },
                  isCurrent && styles.timelineDotCurrent,
                ]}
              />
              {index < TIMELINE_STEPS.length - 1 ? (
                <View style={[styles.timelineLine, done && { backgroundColor: meta.color }]} />
              ) : null}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                done && { color: meta.color, fontWeight: isCurrent ? '700' : '600' },
              ]}
              numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FinancialRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.finRow}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[styles.finValue, highlight && styles.finValueHighlight]}>{value}</Text>
    </View>
  );
}

function LabelModal({
  visible,
  sale,
  onClose,
}: {
  visible: boolean;
  sale: VendorSale | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!sale) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sale.labelQrData ?? sale.id)}`;
  const barcode = sale.barcodeData ?? '7894561230987';
  const buyer = sale.buyer;

  async function handlePdfAction(mode: 'save' | 'share') {
    setIsGenerating(true);
    try {
      const uri = await generateLabelPdf(sale!);
      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert('PDF gerado', 'Etiqueta salva com sucesso.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: mode === 'save' ? 'Salvar Etiqueta' : 'Compartilhar Etiqueta',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar a etiqueta. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16, maxHeight: '92%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Etiqueta de Postagem</Text>
            <Pressable
              style={styles.modalCloseIcon}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={C.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            <View style={styles.labelCard}>
              <View style={styles.labelCardHeader}>
                <View style={styles.labelLogoRow}>
                  <Ionicons name="flash" size={20} color={C.accent} />
                  <Text style={styles.labelLogoText}>
                    Luck<Text style={styles.labelLogoAccent}>Code</Text>
                  </Text>
                </View>
                <View style={styles.labelOfficialBadge}>
                  <Text style={styles.labelOfficialBadgeText}>OFICIAL</Text>
                </View>
              </View>

              <View style={styles.labelAddressBlock}>
                <Text style={styles.labelAddressRole}>Remetente (Vendedor)</Text>
                <Text style={styles.labelAddressName}>{MOCK_SENDER.name}</Text>
                <Text style={styles.labelAddressDetail}>
                  {MOCK_SENDER.address}{'\n'}
                  {MOCK_SENDER.city} — CEP {MOCK_SENDER.cep}
                </Text>
              </View>

              <View style={styles.labelDivider} />

              <View style={styles.labelAddressBlock}>
                <Text style={styles.labelAddressRole}>Destinatário (Comprador)</Text>
                <Text style={styles.labelAddressName}>{buyer.name}</Text>
                <Text style={styles.labelAddressDetail}>{formatarEnderecoEntrega(buyer)}</Text>
              </View>

              <View style={styles.labelProductBox}>
                <Text style={styles.labelAddressRole}>Produto</Text>
                <Text style={styles.labelProductTitle}>{sale.title}</Text>
              </View>

              <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />

              <View style={styles.barcodeBox}>
                <View style={styles.barcodeBars}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i % 3 === 0 ? 3 : 2,
                        height: 44,
                        backgroundColor: '#1A1625',
                        opacity: i % 5 === 0 ? 1 : 0.7,
                      }}
                    />
                  ))}
                </View>
                <Text style={styles.barcodeText}>{barcode}</Text>
              </View>

              <Text style={styles.qrHint}>
                Apresente o QR Code ou código de barras na agência dos Correios ou transportadora.
              </Text>
            </View>
          </ScrollView>

          {isGenerating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.generatingText}>Gerando PDF...</Text>
            </View>
          ) : (
            <View style={styles.modalActionsRow}>
              <Pressable
                style={styles.modalActionPrimary}
                onPress={() => handlePdfAction('save')}
                accessibilityRole="button"
                accessibilityLabel="Salvar etiqueta">
                <Text style={styles.modalActionPrimaryText}>Salvar Etiqueta</Text>
              </Pressable>
              <Pressable
                style={styles.modalActionSecondary}
                onPress={() => handlePdfAction('share')}
                accessibilityRole="button"
                accessibilityLabel="Compartilhar etiqueta">
                <Text style={styles.modalActionSecondaryText}>Compartilhar</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.modalDismissBtn} onPress={onClose}>
            <Text style={styles.modalDismissBtnText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SaleStatusExtras({
  sale,
  onCopyTracking,
}: {
  sale: VendorSale;
  onCopyTracking: (code: string) => void;
}) {
  if (sale.status === 'awaiting_payment') {
    return (
      <View style={styles.noticeBox}>
        <Ionicons name="time-outline" size={16} color="#B45309" />
        <Text style={styles.noticeText}>
          O comprador tem {sale.paymentHoursLeft ?? 24} horas para efetuar o pagamento. Caso dê
          calote, você receberá a indenização de 10% em Cash.
        </Text>
      </View>
    );
  }

  if (sale.status === 'paid_ready') {
    return (
      <Text style={styles.hintText}>
        O frete já foi pago pelo comprador. Após gerar a etiqueta, cole no pacote e despache sem
        custo adicional.
      </Text>
    );
  }

  if (sale.status === 'in_transit' && sale.trackingCode) {
    return (
      <View style={styles.trackingBlock}>
        <Text style={styles.trackingLabel}>Código de Rastreio</Text>
        <View style={styles.trackingRow}>
          <Text style={styles.trackingCode}>{sale.trackingCode}</Text>
          <Pressable
            style={styles.copyBtn}
            onPress={() => onCopyTracking(sale.trackingCode!)}
            accessibilityRole="button"
            accessibilityLabel="Copiar código de rastreio">
            <Ionicons name="copy-outline" size={14} color={C.accent} />
            <Text style={styles.copyBtnText}>Copiar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (sale.status === 'completed') {
    return (
      <View style={[styles.noticeBox, styles.completedNotice]}>
        <Ionicons name="wallet-outline" size={16} color={C.accent} />
        <Text style={[styles.noticeText, styles.completedNoticeText]}>
          Venda finalizada — saldo liberado na sua carteira.
        </Text>
      </View>
    );
  }

  return null;
}

function SaleAccordionCard({
  sale,
  expanded,
  onToggle,
  onGenerateLabel,
  onCopyTracking,
  onOpenChat,
}: {
  sale: VendorSale;
  expanded: boolean;
  onToggle: () => void;
  onGenerateLabel: (sale: VendorSale) => void;
  onCopyTracking: (code: string) => void;
  onOpenChat: (sale: VendorSale) => void;
}) {
  const chatHabilitado = sale.chatLiberado === true;
  const meta = STATUS_META[sale.status];
  const expandedBorder = expanded ? EXPANDED_BORDER[sale.status] : undefined;
  const financeiro = calcularResumoFinanceiro(sale.soldPriceCents);
  const podeGerarEtiqueta = sale.status === 'paid_ready' || sale.status === 'in_transit';

  return (
    <View
      style={[
        styles.saleCard,
        expanded && styles.saleCardExpanded,
        expandedBorder ? { borderColor: expandedBorder, borderWidth: 2 } : null,
      ]}>
      <Pressable
        style={styles.saleHeaderPress}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${sale.title}, ${expanded ? 'recolher' : 'expandir'} detalhes`}>
        <View style={styles.saleTop}>
          <Image source={{ uri: sale.imageUrl }} style={styles.saleImage} />
          <View style={styles.saleInfo}>
            <Text style={styles.saleTitle} numberOfLines={2}>
              {sale.title}
            </Text>
            <Text style={styles.saleDate}>Encerrado em {sale.endedAt}</Text>
            <Text style={styles.salePriceLabel}>Valor do arremate</Text>
            <Text style={styles.salePrice}>{formatBRL(sale.soldPriceCents)}</Text>
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
          <SaleTimeline currentStatus={sale.status} />

          <SaleStatusExtras sale={sale} onCopyTracking={onCopyTracking} />

          <DetailSection title="Resumo financeiro">
            <View style={styles.detailCard}>
              <FinancialRow label="Valor do lance" value={formatBRL(financeiro.soldPriceCents)} />
              <View style={styles.finDivider} />
              <FinancialRow
                label="Taxa da plataforma (10%)"
                value={`− ${formatBRL(financeiro.taxaPlataformaCents)}`}
              />
              <View style={styles.finDivider} />
              <FinancialRow
                label="Total líquido"
                value={formatBRL(financeiro.totalLiquidoCents)}
                highlight
              />
            </View>
          </DetailSection>

          <DetailSection title="Dados do comprador">
            <View style={styles.detailCard}>
              <View style={styles.buyerRow}>
                <Ionicons name="person-outline" size={18} color={C.accent} />
                <View style={styles.buyerBody}>
                  <Text style={styles.buyerName}>{sale.buyer.name}</Text>
                  <Text style={styles.buyerAddress}>{formatarEnderecoEntrega(sale.buyer)}</Text>
                </View>
              </View>
            </View>
          </DetailSection>

          <DetailSection title="Ações">
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtnPrimary, !podeGerarEtiqueta && styles.actionBtnDisabled]}
                onPress={() => onGenerateLabel(sale)}
                disabled={!podeGerarEtiqueta}
                accessibilityRole="button"
                accessibilityLabel="Gerar etiqueta de postagem">
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Gerar Etiqueta</Text>
              </Pressable>

              {chatHabilitado ? (
                <Pressable
                  style={styles.actionBtnSecondary}
                  onPress={() => onOpenChat(sale)}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir chat com comprador">
                  <Ionicons name="chatbubbles-outline" size={18} color={C.accent} />
                  <Text style={styles.actionBtnSecondaryText}>Abrir Chat com Comprador</Text>
                </Pressable>
              ) : (
                <View style={styles.chatAguardando}>
                  <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} />
                  <Text style={styles.chatAguardandoText}>Aguardando liberação do suporte</Text>
                </View>
              )}
            </View>
            {!podeGerarEtiqueta ? (
              <Text style={styles.actionHint}>
                A etiqueta ficará disponível após a confirmação do pagamento.
              </Text>
            ) : null}
          </DetailSection>
        </View>
      ) : null}
    </View>
  );
}

export default function MySalesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [labelSale, setLabelSale] = useState<VendorSale | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sales = useMemo(() => MOCK_VENDOR_SALES, []);

  useEffect(() => {
    for (const sale of sales) {
      if (sale.chatLiberado) {
        mockLiberarChatVendedor(sale.orderId).catch(() => {});
      }
    }
  }, [sales]);

  const handleCopyTracking = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copiado!', 'Código de rastreio copiado para a área de transferência.');
  }, []);

  const toggleExpand = useCallback((saleId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === saleId ? null : saleId));
  }, []);

  const handleOpenChat = useCallback(
    async (sale: VendorSale) => {
      const { consultarAcessoChatVendedor } = await import('@/src/services/vendorLotChat');
      const acesso = await consultarAcessoChatVendedor(sale.orderId);
      if (!acesso.chatLiberado) {
        Alert.alert(
          'Chat indisponível',
          'Aguardando liberação do suporte. A plataforma precisa incluir você na conversa.',
        );
        return;
      }
      router.push({
        pathname: '/my-sales/chat/[orderId]',
        params: { orderId: sale.orderId, title: sale.title },
      });
    },
    [router],
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Minhas Vendas</Text>
          <Text style={styles.headerSubtitle}>Toque em uma venda para ver detalhes</Text>
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Ionicons name="storefront-outline" size={22} color={C.accent} />
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>{sales.length} lotes encerrados</Text>
              <Text style={styles.summaryDesc}>
                Expanda cada venda para ver financeiro, comprador e ações de envio.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SaleAccordionCard
            sale={item}
            expanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id)}
            onGenerateLabel={setLabelSale}
            onCopyTracking={handleCopyTracking}
            onOpenChat={handleOpenChat}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <LabelModal visible={!!labelSale} sale={labelSale} onClose={() => setLabelSale(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  headerSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
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
  separator: { height: 14 },
  saleCard: {
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
  saleCardExpanded: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  saleHeaderPress: {
    padding: 14,
    paddingBottom: 10,
  },
  saleTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  saleImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6' },
  saleInfo: { flex: 1 },
  saleTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, lineHeight: 20 },
  saleDate: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  salePriceLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  salePrice: { fontSize: 18, fontWeight: '800', color: C.accent, marginTop: 2 },
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
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  finLabel: { fontSize: 13, color: C.textSecondary, flex: 1 },
  finValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  finValueHighlight: { fontSize: 16, fontWeight: '800', color: C.accent },
  finDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  buyerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  buyerBody: { flex: 1, gap: 4 },
  buyerName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  buyerAddress: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  actionRow: { gap: 10 },
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
  actionBtnDisabled: { opacity: 0.45 },
  actionHint: { fontSize: 11, color: C.textMuted, lineHeight: 16, marginTop: 4 },
  chatAguardando: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F9FAFB',
  },
  chatAguardandoText: { fontSize: 12, fontWeight: '600', color: C.textMuted, textAlign: 'center' },
  hintText: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timelineDotCurrent: { transform: [{ scale: 1.25 }] },
  timelineLine: {
    position: 'absolute',
    left: '55%',
    width: '90%',
    height: 2,
    backgroundColor: '#E5E7EB',
    top: 4,
  },
  timelineLabel: { fontSize: 9, color: C.textMuted, marginTop: 6, textAlign: 'center' },
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
  completedNotice: {
    backgroundColor: '#F4F0FF',
    borderColor: '#E9E0FF',
  },
  noticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  completedNoticeText: { color: C.textSecondary },
  trackingBlock: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 8,
  },
  trackingLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase' },
  trackingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  trackingCode: { fontSize: 15, fontWeight: '800', color: C.textPrimary, letterSpacing: 0.5, flex: 1 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalScroll: { paddingBottom: 8 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalCloseIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCard: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#E9E0FF',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FAFAFE',
  },
  labelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0FF',
    paddingBottom: 12,
    marginBottom: 14,
  },
  labelLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelLogoText: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  labelLogoAccent: { color: C.accent },
  labelOfficialBadge: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  labelOfficialBadgeText: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  labelAddressBlock: { marginBottom: 12 },
  labelAddressRole: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  labelAddressName: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  labelAddressDetail: { fontSize: 11, color: C.textSecondary, lineHeight: 16 },
  labelDivider: { height: 1, backgroundColor: '#E9E0FF', marginVertical: 4, marginBottom: 12 },
  labelProductBox: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  labelProductTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginTop: 2 },
  qrImage: { width: 200, height: 200, alignSelf: 'center', marginBottom: 12 },
  qrHint: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 16, marginTop: 10 },
  barcodeBox: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  barcodeBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 8 },
  barcodeText: { fontSize: 13, fontWeight: '700', color: C.textPrimary, letterSpacing: 2 },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  generatingText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalActionPrimary: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalActionPrimaryText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  modalActionSecondary: {
    flex: 1,
    backgroundColor: '#F4F0FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  modalActionSecondaryText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  modalDismissBtn: {
    width: '100%',
    backgroundColor: C.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDismissBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
});
