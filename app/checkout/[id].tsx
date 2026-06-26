import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FluidLightBackground } from '@/components/layout/FluidLightBackground';
import { CheckoutEscrowStrip } from '@/components/checkout/CheckoutEscrowStrip';
import { CheckoutFreightSection } from '@/components/checkout/CheckoutFreightSection';
import { CheckoutMethodDetails } from '@/components/checkout/CheckoutMethodDetails';
import { CheckoutPaymentMethods } from '@/components/checkout/CheckoutPaymentMethods';
import { CheckoutPayBar } from '@/components/checkout/CheckoutPayBar';
import { CheckoutProcessingOverlay } from '@/components/checkout/CheckoutProcessingOverlay';
import { CheckoutPhotoGalleryModal } from '@/components/checkout/CheckoutPhotoGalleryModal';
import { CheckoutProductHero } from '@/components/checkout/CheckoutProductHero';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { CheckoutSuccess } from '@/components/checkout/CheckoutSuccess';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import {
  calcWalletApplyCents,
  CheckoutWalletOptions,
} from '@/components/checkout/CheckoutWalletOptions';
import { previewCarteiraCheckout } from '@/src/services/buyerBidHold';
import { checkoutC } from '@/components/checkout/checkoutTheme';
import { MOCK_BUYER_ID, MOCK_VENDOR_ID } from '@/src/constants/operations';
import { useOperationsStore } from '@/src/hooks/useOperationsStore';
import { calculateCommission, formatBRL } from '@/src/lib/bids';
import { getSupabase } from '@/src/lib/supabase';
import { loadCheckoutAuction } from '@/src/services/checkoutAuction';
import { calculateFreight, type FreightQuote } from '@/src/services/logistics';
import {
  isUuid,
  linkLocalOrderToSupabase,
  persistAuctionPayment,
} from '@/src/services/orderPersistence';
import { useFinancialActionGuard } from '@/src/hooks/useFinancialActionGuard';
import { useKyc } from '@/src/store/kycContext';
import {
  consultarStatusPagamentoAsaas,
  criarCobrancaAsaas,
  isAsaasEnabled,
  mapCheckoutMethodToAsaas,
} from '@/src/services/asaasPayments';
import { resolverRotaPagamento } from '@/src/services/paymentRouter';
import type { PaymentRouteResult } from '@/src/constants/payments';
import type { CreateAsaasPaymentResult } from '@/src/types/asaasPayments';
import type { PaymentMethod } from '@/src/types/operations';

type ProcessingStep = 'pagamento' | 'custodia' | 'etiqueta';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEndereco(perfil: {
  enderecoLogradouro?: string | null;
  enderecoNumero?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoUf?: string | null;
}): string | null {
  const parts = [
    perfil.enderecoLogradouro,
    perfil.enderecoNumero,
    perfil.enderecoBairro,
    perfil.enderecoCidade && perfil.enderecoUf
      ? `${perfil.enderecoCidade}/${perfil.enderecoUf}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export default function CheckoutScreen() {
  const { id, amountCents: amountCentsParam } = useLocalSearchParams<{
    id: string;
    amountCents?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { payOrder } = useOperationsStore();
  const { perfil } = useKyc();
  const { confirmarAcaoFinanceira } = useFinancialActionGuard();

  const [auctionLoading, setAuctionLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [originCep, setOriginCep] = useState('01310100');
  const [loadedPriceCents, setLoadedPriceCents] = useState(0);

  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [cep, setCep] = useState('');
  const [freightQuote, setFreightQuote] = useState<FreightQuote | null>(null);
  const [loadingFreight, setLoadingFreight] = useState(false);

  const [paying, setPaying] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('pagamento');
  const [showProcessing, setShowProcessing] = useState(false);

  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [supabaseOrderCode, setSupabaseOrderCode] = useState<string | null>(null);
  const [paymentRoute, setPaymentRoute] = useState<PaymentRouteResult | null>(null);
  const [asaasSession, setAsaasSession] = useState<CreateAsaasPaymentResult | null>(null);
  const [awaitingAsaasPayment, setAwaitingAsaasPayment] = useState(false);
  const [useWalletAvailable, setUseWalletAvailable] = useState(false);
  const [useWalletHold, setUseWalletHold] = useState(false);
  const [walletAvailableCents, setWalletAvailableCents] = useState(0);
  const [walletHoldCents, setWalletHoldCents] = useState(0);

  const arremateInformado = amountCentsParam ? Number(amountCentsParam) : NaN;
  const precoInformado =
    Number.isFinite(arremateInformado) && arremateInformado > 0
      ? Math.round(arremateInformado)
      : 0;
  const subtotalCents = precoInformado > 0 ? precoInformado : loadedPriceCents;

  useEffect(() => {
    if (perfil?.cep) {
      setCep(perfil.cep.replace(/\D/g, '').slice(0, 8));
    }
  }, [perfil?.cep]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAuctionLoading(true);
      const info = await loadCheckoutAuction(id ?? '1', precoInformado);
      if (cancelled) return;
      setTitle(info.title);
      setImageUrl(info.imageUrl);
      setImageUrls(info.imageUrls);
      setOriginCep(info.originCep);
      setLoadedPriceCents(info.priceCents);
      setAuctionLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, precoInformado]);

  const recalcularFrete = useCallback(async () => {
    const destino = cep.replace(/\D/g, '');
    if (destino.length !== 8) return;

    setLoadingFreight(true);
    try {
      const quote = await calculateFreight({
        fromCep: originCep,
        toCep: destino,
        weightKg: 1.2,
        dimensionsCm: { height: 15, width: 20, length: 30 },
        insuranceValueBrl: (subtotalCents / 100) || 100,
      });
      setFreightQuote(quote);
    } finally {
      setLoadingFreight(false);
    }
  }, [cep, originCep, subtotalCents]);

  useEffect(() => {
    if (cep.replace(/\D/g, '').length === 8 && !auctionLoading) {
      void recalcularFrete();
    }
  }, [cep, auctionLoading, recalcularFrete]);

  const shippingCents = freightQuote?.priceCents ?? 0;
  const commissionCents = calculateCommission(subtotalCents);
  const totalCents = subtotalCents + shippingCents;

  useEffect(() => {
    if (!isUuid(id ?? '')) return;
    void previewCarteiraCheckout(id!).then((preview) => {
      if (!preview) return;
      setWalletAvailableCents(preview.availableCents);
      setWalletHoldCents(preview.winningHoldCents);
    });
  }, [id]);

  const walletApply = calcWalletApplyCents(
    totalCents,
    walletAvailableCents,
    walletHoldCents,
    useWalletAvailable,
    useWalletHold,
  );

  useEffect(() => {
    if (totalCents <= 0) {
      setPaymentRoute(null);
      return;
    }

    let cancelled = false;
    void resolverRotaPagamento(method, totalCents).then((route) => {
      if (!cancelled) setPaymentRoute(route);
    });

    return () => {
      cancelled = true;
    };
  }, [method, totalCents]);
  const shippingLabel =
    freightQuote?.source === 'melhor_envio'
      ? 'Frete (Melhor Envio)'
      : 'Frete estimado';

  const destinationLabel = perfil ? formatEndereco(perfil) : null;
  const orderSeed = useMemo(
    () => `${id ?? 'demo'}-${Date.now()}`,
    [id, paidOrderId],
  );

  const podePagar =
    subtotalCents > 0 &&
    cep.replace(/\D/g, '').length === 8 &&
    freightQuote !== null &&
    !loadingFreight;

  const usarAsaas =
    isAsaasEnabled() &&
    paymentRoute?.paymentProvider === 'asaas' &&
    method !== 'CRIPTO';

  const finalizarPagamentoLocal = useCallback(
    async (supabaseOrderId: string | null | undefined, orderCode: string | null | undefined) => {
      const orderId = payOrder({
        listingId: `auction-${id}`,
        auctionId: id ?? '1',
        buyerId: MOCK_BUYER_ID,
        vendorId: MOCK_VENDOR_ID,
        itemCents: subtotalCents,
        shippingCents,
        paymentMethod: method,
      });

      if (!orderId) {
        throw new Error('Não foi possível registrar o pagamento local.');
      }

      if (supabaseOrderId && isUuid(supabaseOrderId)) {
        await linkLocalOrderToSupabase(orderId, supabaseOrderId);
      }

      setSupabaseOrderCode(orderCode ?? null);
      setPaidOrderId(orderId);
      setAsaasSession(null);
      setAwaitingAsaasPayment(false);
    },
    [id, method, payOrder, shippingCents, subtotalCents],
  );

  useEffect(() => {
    if (!awaitingAsaasPayment || !asaasSession?.asaasPaymentId) return;

    let cancelled = false;
    const interval = setInterval(() => {
      void consultarStatusPagamentoAsaas(asaasSession.asaasPaymentId!).then(async (status) => {
        if (cancelled || !status.ok || !status.paid) return;

        try {
          setProcessingStep('custodia');
          setShowProcessing(true);
          await finalizarPagamentoLocal(status.orderId, status.orderCode);
          setProcessingStep('etiqueta');
        } catch (e) {
          Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao concluir pagamento.');
        } finally {
          setShowProcessing(false);
        }
      });
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [asaasSession?.asaasPaymentId, awaitingAsaasPayment, finalizarPagamentoLocal]);

  async function handlePay() {
    if (!podePagar) {
      Alert.alert(
        'Quase lá',
        'Informe um CEP válido e aguarde o cálculo do frete antes de pagar.',
      );
      return;
    }

    const confirmado = await confirmarAcaoFinanceira('security.confirmPaymentPrompt');
    if (!confirmado) {
      return;
    }

    setPaying(true);

    try {
      const auctionId = id ?? '';

      if (usarAsaas && isUuid(auctionId)) {
        setShowProcessing(true);
        setProcessingStep('pagamento');

        const cobranca = await criarCobrancaAsaas({
          auctionId,
          itemCents: subtotalCents,
          shippingCents,
          paymentMethod: mapCheckoutMethodToAsaas(method),
          walletApplyAvailableCents: walletApply.available,
          walletApplyHoldCents: walletApply.hold,
        });

        if (!cobranca.ok) {
          throw new Error(cobranca.error ?? 'Falha ao criar cobrança Asaas.');
        }

        if (cobranca.paidWithWalletOnly) {
          await finalizarPagamentoLocal(cobranca.orderId, cobranca.orderCode);
          setShowProcessing(false);
          return;
        }

        setAsaasSession(cobranca);
        setSupabaseOrderCode(cobranca.orderCode ?? null);
        setAwaitingAsaasPayment(true);
        setShowProcessing(false);

        if (method === 'CARTAO' && cobranca.invoiceUrl) {
          await Linking.openURL(cobranca.invoiceUrl);
        }

        if (method === 'PIX') {
          Alert.alert(
            'Pix gerado',
            `Pague ${formatBRL(cobranca.chargeCents ?? totalCents)} pelo app do banco. Confirmamos automaticamente quando o Asaas receber.`,
          );
        }
        return;
      }

      setShowProcessing(true);
      setProcessingStep('pagamento');
      await delay(900);
      setProcessingStep('custodia');

      const orderId = payOrder({
        listingId: `auction-${id}`,
        auctionId: id ?? '1',
        buyerId: MOCK_BUYER_ID,
        vendorId: MOCK_VENDOR_ID,
        itemCents: subtotalCents,
        shippingCents,
        paymentMethod: method,
      });

      if (!orderId) {
        throw new Error('Não foi possível registrar o pagamento local.');
      }

      let buyerId = MOCK_BUYER_ID;
      const supabase = getSupabase();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user?.id) buyerId = authData.user.id;
      }

      setProcessingStep('etiqueta');
      await delay(700);

      if (isUuid(auctionId) && isUuid(buyerId)) {
        const persisted = await persistAuctionPayment({
          auctionId,
          buyerId,
          itemCents: subtotalCents,
          shippingCents,
          paymentMethod: method,
          gatewayTransactionId: `demo-${orderId}`,
        });

        if (persisted) {
          await linkLocalOrderToSupabase(orderId, persisted.orderId);
          setSupabaseOrderCode(persisted.orderCode);
        }
      }

      setPaidOrderId(orderId);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível concluir o pagamento.');
    } finally {
      setShowProcessing(false);
      setPaying(false);
    }
  }

  if (auctionLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <FluidLightBackground />
        <ActivityIndicator size="large" color={checkoutC.accent} />
        <Text style={styles.loadingText}>Preparando checkout…</Text>
      </View>
    );
  }

  if (paidOrderId) {
    return (
      <View style={styles.root}>
        <FluidLightBackground />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}>
          <CheckoutSteps activeStep="custodia" />
          <CheckoutSuccess
            title={title}
            totalCents={totalCents}
            method={method}
            orderCode={supabaseOrderCode}
            onTrackOrder={() =>
              router.push({ pathname: '/order/[id]', params: { id: paidOrderId } })
            }
            onGoHome={() => router.replace('/(tabs)')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FluidLightBackground />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={checkoutC.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pagamento</Text>
          <Text style={styles.headerSub}>Escrow Levou · proteção total</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <CheckoutSteps activeStep="pagamento" />
        <CheckoutProductHero
          title={title}
          imageUrl={imageUrl}
          imageCount={imageUrls.length || 1}
          priceCents={subtotalCents}
          onPressPhotos={() => setGaleriaAberta(true)}
        />
        <CheckoutEscrowStrip />
        <CheckoutPaymentMethods selected={method} onSelect={setMethod} />
        <CheckoutMethodDetails
          method={method}
          totalCents={totalCents}
          orderSeed={orderSeed}
          pixCopyPaste={asaasSession?.pixCopyPaste}
          pixQrBase64={asaasSession?.pixQrBase64}
          asaasSandbox={asaasSession?.asaasSandbox}
          invoiceUrl={asaasSession?.invoiceUrl}
          awaitingPayment={awaitingAsaasPayment}
        />
        <CheckoutFreightSection
          cep={cep}
          onCepChange={setCep}
          onRecalculate={() => void recalcularFrete()}
          loading={loadingFreight}
          quote={freightQuote}
          destinationLabel={destinationLabel}
        />
        {isUuid(id ?? '') ? (
          <CheckoutWalletOptions
            auctionId={id!}
            totalCents={totalCents}
            useAvailable={useWalletAvailable}
            useHold={useWalletHold}
            onUseAvailableChange={setUseWalletAvailable}
            onUseHoldChange={setUseWalletHold}
          />
        ) : null}
        <CheckoutSummary
          subtotalCents={subtotalCents}
          commissionCents={commissionCents}
          shippingCents={shippingCents}
          shippingLabel={shippingLabel}
          shippingLoading={loadingFreight}
          totalCents={walletApply.charge > 0 && (useWalletAvailable || useWalletHold) ? walletApply.charge : totalCents}
          paymentProviderLabel={paymentRoute?.providerDisplayName ?? null}
          gatewayFeeCents={
            walletApply.charge > 0 ? paymentRoute?.gatewayFeeCents : 0
          }
        />
      </ScrollView>

      <CheckoutPayBar
        totalCents={totalCents}
        method={method}
        paying={paying || awaitingAsaasPayment}
        disabled={!podePagar || awaitingAsaasPayment}
        actionLabel={
          awaitingAsaasPayment
            ? 'Aguardando pagamento…'
            : usarAsaas && method === 'PIX'
              ? 'Gerar Pix Asaas'
              : undefined
        }
        onPay={() => void handlePay()}
      />

      <CheckoutProcessingOverlay visible={showProcessing} step={processingStep} />

      <CheckoutPhotoGalleryModal
        visible={galeriaAberta}
        title={title}
        priceCents={subtotalCents}
        imageUrls={imageUrls.length ? imageUrls : imageUrl ? [imageUrl] : []}
        onClose={() => setGaleriaAberta(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: checkoutC.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: checkoutC.textMuted, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: checkoutC.cardBorder,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: checkoutC.text },
  headerSub: { fontSize: 11, color: checkoutC.textMuted, fontWeight: '600' },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
});
