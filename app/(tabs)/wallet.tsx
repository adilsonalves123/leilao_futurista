import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckoutMethodDetails } from '@/components/checkout/CheckoutMethodDetails';
import { isAsaasEnabled } from '@/src/services/asaasPayments';
import {
  consultarStatusRecargaCarteiraAsaas,
  criarRecargaCarteiraAsaas,
} from '@/src/services/asaasWalletDeposit';
import type { CreateAsaasWalletDepositResult } from '@/src/types/asaasPayments';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useFinancialActionGuard } from '@/src/hooks/useFinancialActionGuard';
import { useUserNotifications } from '@/src/hooks/useUserNotifications';
import { useTranslation } from '@/src/i18n/useTranslation';
import { formatBRL } from '@/src/lib/bids';
import {
  getWalletSummary,
  formatGuaranteesDetail,
  totalGuaranteesCents,
  withdrawBlockMessage,
  type WalletSummary,
} from '@/src/services/walletSummary';
import {
  recarregarCarteiraDemo,
  WALLET_TOPUP_OPTIONS_CENTS,
} from '@/src/services/listingWalletBalance';
import { lightColors } from '@/src/theme/lightTokens';

type TransacaoTipo = 'credito' | 'debito';

type Transacao = {
  id: string;
  descricao: string;
  valor: string;
  tipo: TransacaoTipo;
  data: string;
};

const EXTRATO_FINANCEIRO: Transacao[] = [
  {
    id: '1',
    descricao: 'Depósito via PIX',
    valor: '+FTK 500,00',
    tipo: 'credito',
    data: '28 Mai 2026',
  },
  {
    id: '2',
    descricao: 'Lance Retido (MacBook)',
    valor: '-FTK 1.950,00',
    tipo: 'debito',
    data: '27 Mai 2026',
  },
  {
    id: '3',
    descricao: 'Estorno de Lance',
    valor: '+FTK 1.950,00',
    tipo: 'credito',
    data: '27 Mai 2026',
  },
  {
    id: '4',
    descricao: 'Arremate — Monitor Gamer UltraWide',
    valor: '-FTK 1.850,00',
    tipo: 'debito',
    data: '26 Mai 2026',
  },
  {
    id: '5',
    descricao: 'Depósito via PIX',
    valor: '+FTK 2.000,00',
    tipo: 'credito',
    data: '25 Mai 2026',
  },
  {
    id: '6',
    descricao: 'Saque para conta bancária',
    valor: '-FTK 300,00',
    tipo: 'debito',
    data: '24 Mai 2026',
  },
  {
    id: '7',
    descricao: 'Lance Retido (iPhone 15 Pro Max)',
    valor: '-FTK 2.400,00',
    tipo: 'debito',
    data: '23 Mai 2026',
  },
  {
    id: '8',
    descricao: 'Estorno de Lance',
    valor: '+FTK 2.400,00',
    tipo: 'credito',
    data: '23 Mai 2026',
  },
];


/** Horários só para exibição no layout (mock). */
const HORARIO_POR_ID: Record<string, string> = {
  '1': '14:21',
  '2': '11:05',
  '3': '09:42',
  '4': '18:33',
  '5': '10:15',
  '6': '16:50',
  '7': '20:08',
  '8': '21:12',
};

function valorExibicao(valor: string): string {
  return valor.replace(/FTK/g, 'R$');
}

/** Gradiente diagonal: índigo no canto do olho → navy escuro no canto oposto. */
function HeroBalanceGradient() {
  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      pointerEvents="none">
      <Defs>
        <LinearGradient
          id="walletHeroGrad"
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={C.heroGradStart} />
          <Stop offset="0.5" stopColor={C.heroGradMid} />
          <Stop offset="1" stopColor={C.heroGradEnd} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#walletHeroGrad)" />
    </Svg>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [recarregando, setRecarregando] = useState(false);
  const [pixSession, setPixSession] = useState<CreateAsaasWalletDepositResult | null>(null);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const usarAsaas = isAsaasEnabled();
  const { naoLidas, recarregar: recarregarNotificacoes } = useUserNotifications();
  const { confirmarAcaoFinanceira } = useFinancialActionGuard();

  const carregarSaldo = useCallback(async () => {
    const summary = await getWalletSummary();
    setWalletSummary(summary);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarSaldo();
    }, [carregarSaldo]),
  );

  useEffect(() => {
    recarregarNotificacoes();
  }, [recarregarNotificacoes]);

  const garantiasCents = walletSummary ? totalGuaranteesCents(walletSummary) : 0;

  const saldoResumo = useMemo(() => {
    if (!walletSummary) {
      return [
        { label: t('wallet.guaranteesActive'), valor: '—' },
        { label: t('wallet.freeToUse'), valor: '—' },
        { label: t('wallet.withdrawable'), valor: '—', highlight: true },
      ];
    }
    return [
      {
        label: t('wallet.guaranteesActive'),
        valor: formatBRL(garantiasCents),
        muted: garantiasCents === 0,
      },
      {
        label: t('wallet.freeToUse'),
        valor: formatBRL(walletSummary.availableCents),
      },
      {
        label: t('wallet.withdrawable'),
        valor: formatBRL(walletSummary.withdrawableCents),
        highlight: true,
        muted: !walletSummary.canWithdraw,
      },
    ];
  }, [garantiasCents, t, walletSummary]);

  const withdrawHint = walletSummary ? withdrawBlockMessage(walletSummary, t) : '';

  const abrirSaque = useCallback(async () => {
    if (!walletSummary) return;

    if (!walletSummary.canWithdraw) {
      Alert.alert('Saque indisponível', withdrawHint || t('wallet.withdrawBlockedEmpty'));
      return;
    }

    const confirmado = await confirmarAcaoFinanceira('security.confirmWalletPrompt');
    if (!confirmado) return;

    Alert.alert(
      t('wallet.withdraw'),
      `${t('wallet.withdrawSoon')}\n\nValor elegível agora: ${formatBRL(walletSummary.withdrawableCents)}`,
    );
  }, [confirmarAcaoFinanceira, t, walletSummary, withdrawHint]);

  const executarRecargaDemo = useCallback(
    async (amountCents: number) => {
      setRecarregando(true);
      try {
        const resultado = await recarregarCarteiraDemo(amountCents);
        if (!resultado.ok) {
          Alert.alert('Recarga demo', resultado.erro ?? 'Não foi possível creditar.');
          return;
        }
        await carregarSaldo();
        Alert.alert(
          'Saldo creditado',
          `+${formatBRL(amountCents)} adicionados.\nNovo saldo total: ${formatBRL(resultado.newBalance)}`,
        );
      } finally {
        setRecarregando(false);
      }
    },
    [carregarSaldo],
  );

  const executarRecargaPix = useCallback(
    async (amountCents: number) => {
      setRecarregando(true);
      try {
        const resultado = await criarRecargaCarteiraAsaas(amountCents);
        if (!resultado.ok) {
          Alert.alert('Recarga Pix', resultado.error ?? 'Não foi possível gerar o Pix.');
          return;
        }
        if (!resultado.pixCopyPaste?.trim()) {
          Alert.alert(
            'Recarga Pix',
            'O Asaas não retornou o código Pix. Verifique se há chave Pix cadastrada no painel Asaas.',
          );
          return;
        }
        setPixSession(resultado);
        setPixModalVisible(true);
      } finally {
        setRecarregando(false);
      }
    },
    [],
  );

  const abrirRecargaPix = useCallback(async () => {
    if (recarregando) return;

    const confirmado = await confirmarAcaoFinanceira('security.confirmWalletPrompt');
    if (!confirmado) return;

    Alert.alert(
      'Adicionar saldo via Pix',
      'O valor entra na carteira após confirmação do Asaas. Use para lances e publicações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        ...WALLET_TOPUP_OPTIONS_CENTS.map((cents) => ({
          text: `+ ${formatBRL(cents)}`,
          onPress: () => executarRecargaPix(cents),
        })),
      ],
    );
  }, [confirmarAcaoFinanceira, executarRecargaPix, recarregando]);

  const abrirRecargaDemo = useCallback(async () => {
    if (recarregando) return;

    const confirmado = await confirmarAcaoFinanceira('security.confirmWalletPrompt');
    if (!confirmado) return;

    Alert.alert(
      'Recarga demo',
      'Crédito fictício para testar Destaque e Destaque Plus. Não é cobrança real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        ...WALLET_TOPUP_OPTIONS_CENTS.map((cents) => ({
          text: `+ ${formatBRL(cents)}`,
          onPress: () => executarRecargaDemo(cents),
        })),
      ],
    );
  }, [confirmarAcaoFinanceira, executarRecargaDemo, recarregando]);

  useEffect(() => {
    if (!pixModalVisible || !pixSession?.asaasPaymentId) return;

    let cancelled = false;
    const interval = setInterval(() => {
      void consultarStatusRecargaCarteiraAsaas(pixSession.asaasPaymentId!).then(async (status) => {
        if (cancelled || !status.ok || !status.received) return;

        setPixModalVisible(false);
        setPixSession(null);
        await carregarSaldo();
        const summary = await getWalletSummary();
        Alert.alert(
          'Saldo creditado',
          `+${formatBRL(status.amountCents ?? 0)} confirmados.\nTotal na conta: ${formatBRL(summary.totalCents)}`,
        );
      });
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pixModalVisible, pixSession?.asaasPaymentId, carregarSaldo]);

  const renderTransacao = ({ item }: { item: Transacao }) => {
    const hora = HORARIO_POR_ID[item.id] ?? '12:00';

    return (
      <TouchableOpacity style={styles.txRow} activeOpacity={0.7}>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.descricao}
          </Text>
          <Text style={styles.txMeta}>
            {item.data} • {hora}
          </Text>
        </View>
        <Text style={styles.txValor}>{valorExibicao(item.valor)}</Text>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
          <Text style={styles.pageTitle}>
            {t('wallet.title')} <Text style={styles.pageTitleBrand}>{t('wallet.brand')}</Text>
          </Text>
          <Text style={styles.pageSubtitle}>{t('wallet.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel={`Notificações${naoLidas > 0 ? `, ${naoLidas} novas` : ''}`}>
          <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          {naoLidas > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {naoLidas > 9 ? '9+' : String(naoLidas)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <HeroBalanceGradient />
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>{t('wallet.availableBalance')}</Text>
            <TouchableOpacity
              onPress={() => setSaldoVisivel((v) => !v)}
              hitSlop={10}
              activeOpacity={0.7}>
              <Ionicons
                name={saldoVisivel ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroBalance}>
            {saldoVisivel
              ? formatBRL(walletSummary?.totalCents ?? 0)
              : '••••••••'}
          </Text>
          {saldoVisivel && walletSummary ? (
            <Text style={styles.heroFreeLine}>
              {t('wallet.freeToUse')}: {formatBRL(walletSummary.availableCents)}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.heroLockedPill}
            activeOpacity={0.85}
            onPress={() => router.push('/help/carteira-duvidas')}
            accessibilityRole="button"
            accessibilityLabel={t('wallet.howBlockingWorks')}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#FFF" />
            <Text style={styles.heroLockedText}>
              {garantiasCents > 0
                ? t('wallet.lockedInBids', { amount: formatBRL(garantiasCents) })
                : t('wallet.noGuarantees')}
            </Text>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          {garantiasCents > 0 && walletSummary && saldoVisivel ? (
            <Text style={styles.heroGuaranteeDetail}>
              {formatGuaranteesDetail(walletSummary, t)}
            </Text>
          ) : null}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Ionicons name="hammer-outline" size={16} color="#FFF" />
              <Text style={styles.heroStatText}>12{'\n'}{t('wallet.activeAuctions')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="trophy-outline" size={16} color="#FFF" />
              <Text style={styles.heroStatText}>3{'\n'}{t('wallet.wonPurchases')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="star-outline" size={16} color="#FFF" />
              <Text style={styles.heroStatText}>24{'\n'}{t('wallet.favorites')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="eye-outline" size={16} color="#FFF" />
              <Text style={styles.heroStatText}>8{'\n'}{t('wallet.watching')}</Text>
            </View>
          </View>
        </View>
      </View>

      {usarAsaas ? (
        <View style={styles.pixTopupBanner}>
          <Ionicons name="qr-code-outline" size={16} color={C.accent} />
          <Text style={styles.pixTopupText}>
            Recarregue via Pix (Asaas). O saldo fica disponível para lances, garantias e checkout.
          </Text>
        </View>
      ) : (
        <View style={styles.demoTopupBanner}>
          <Ionicons name="flask-outline" size={16} color={C.accent} />
          <Text style={styles.demoTopupText}>
            Ambiente de testes: use &quot;Recarga demo&quot; para creditar saldo e publicar com
            Destaque / Plus.
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionPill, styles.actionPillAdd, recarregando && styles.actionPillDisabled]}
          activeOpacity={0.75}
          onPress={usarAsaas ? abrirRecargaPix : abrirRecargaDemo}
          disabled={recarregando}>
          <Ionicons name={usarAsaas ? 'qr-code-outline' : 'add'} size={18} color="#FFFFFF" />
          <Text style={[styles.actionPillText, styles.actionPillTextAdd]}>
            {recarregando
              ? 'Gerando…'
              : usarAsaas
                ? 'Adicionar via Pix'
                : 'Recarga demo'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionPill,
            styles.actionPillSacar,
            (!walletSummary?.canWithdraw || walletSummary.withdrawableCents <= 0) &&
              styles.actionPillDisabled,
          ]}
          activeOpacity={0.75}
          onPress={() => void abrirSaque()}
          disabled={!walletSummary}>
          <Ionicons name="arrow-up-outline" size={18} color={C.sacarText} />
          <Text style={[styles.actionPillText, styles.actionPillTextSacar]}>{t('wallet.withdraw')}</Text>
        </TouchableOpacity>
      </View>

      {withdrawHint ? (
        <View style={styles.withdrawBlockCard}>
          <Ionicons name="information-circle-outline" size={18} color="#92400E" />
          <Text style={styles.withdrawBlockText}>{withdrawHint}</Text>
        </View>
      ) : null}

      <View style={styles.balanceSheet}>
        {saldoResumo.map((linha, index) => (
          <View
            key={linha.label}
            style={[
              styles.balanceLine,
              index < saldoResumo.length - 1 && styles.balanceLineBorder,
            ]}>
            <Text
              style={[
                styles.balanceLineLabel,
                'muted' in linha && linha.muted && styles.balanceLineLabelMuted,
              ]}>
              {linha.label}
            </Text>
            <Text
              style={[
                styles.balanceLineValue,
                'highlight' in linha && linha.highlight && styles.balanceLineValueHighlight,
                'muted' in linha && linha.muted && styles.balanceLineValueMuted,
              ]}>
              {linha.valor}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.infoCard}
        activeOpacity={0.75}
        onPress={() => router.push('/help/como-funciona-leilao')}
        accessibilityRole="button"
        accessibilityLabel={t('wallet.howAuctionWorks')}>
        <View style={styles.infoCardLeft}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="information-circle-outline" size={18} color={C.accent} />
          </View>
          <Text style={styles.infoCardText}>{t('wallet.howAuctionWorks')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </TouchableOpacity>

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>{t('wallet.transactionHistory')}</Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
          <Text style={styles.filterText}>{t('wallet.filter')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = () => (
    <Text style={styles.securityNote}>{t('wallet.securityNote')}</Text>
  );

  return (
    <View style={styles.root}>
      <Modal
        visible={pixModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPixModalVisible(false)}>
        <View style={styles.pixModalBackdrop}>
          <View style={styles.pixModalCard}>
            <View style={styles.pixModalHeader}>
              <Text style={styles.pixModalTitle}>Pix — recarga da carteira</Text>
              <Pressable onPress={() => setPixModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            </View>
            {pixSession ? (
              <CheckoutMethodDetails
                method="PIX"
                totalCents={pixSession.amountCents ?? 0}
                orderSeed={pixSession.asaasPaymentId ?? 'wallet'}
                pixCopyPaste={pixSession.pixCopyPaste}
                pixQrBase64={pixSession.pixQrBase64}
                asaasSandbox={pixSession.asaasSandbox}
                awaitingPayment
              />
            ) : null}
            <Text style={styles.pixModalHint}>
              Confirmamos automaticamente quando o Asaas receber o pagamento.
            </Text>
          </View>
        </View>
      </Modal>

      <FlatList
        data={EXTRATO_FINANCEIRO}
        keyExtractor={(item) => item.id}
        renderItem={renderTransacao}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        ItemSeparatorComponent={null}
      />
    </View>
  );
}

const C = {
  accent: lightColors.accent,
  heroGradStart: '#4338CA',
  heroGradMid: '#312E72',
  heroGradEnd: '#0A192F',
  bg: '#FFFFFF',
  textPrimary: '#1A1625',
  textSecondary: '#6B7280',
  label: '#4B5563',
  black: '#000000',
  textMuted: '#9CA3AF',
  line: '#E5E7EB',
  actionBg: '#F3F4F6',
  actionBorder: '#E5E7EB',
  demoBannerBg: '#F4F0FF',
  demoBannerBorder: '#E9E0FF',
  addSaldo: '#10B981',
  addSaldoBorder: '#059669',
  sacar: '#FACC15',
  sacarBorder: '#EAB308',
  sacarText: '#713F12',
  purpleTint: '#FAF5FF',
  purpleTintBorder: '#EDE9FE',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  listContent: { paddingHorizontal: 20 },

  headerBlock: { marginBottom: 4 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageHeaderText: { flex: 1, paddingRight: 12 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.4,
  },
  pageTitleBrand: { color: C.textPrimary, fontWeight: '800' },
  pageSubtitle: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '400',
  },
  notifBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  heroCard: {
    backgroundColor: C.heroGradEnd,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  heroContent: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  heroBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroFreeLine: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 10,
  },
  heroGuaranteeDetail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 2,
  },
  heroLockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroLockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
    gap: 4,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 12,
  },

  demoTopupBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.demoBannerBg,
    borderWidth: 1,
    borderColor: C.demoBannerBorder,
  },
  demoTopupText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: C.label,
    fontWeight: '500',
  },
  pixTopupBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pixTopupText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#065F46',
    fontWeight: '500',
  },
  pixModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pixModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  pixModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pixModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
  },
  pixModalHint: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  actionPillDisabled: {
    opacity: 0.55,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionPillAdd: {
    backgroundColor: C.addSaldo,
    borderColor: C.addSaldoBorder,
  },
  actionPillSacar: {
    backgroundColor: C.sacar,
    borderColor: C.sacarBorder,
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionPillTextAdd: {
    color: '#FFFFFF',
  },
  actionPillTextSacar: {
    color: C.sacarText,
  },
  withdrawBlockCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  withdrawBlockText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#92400E',
    fontWeight: '500',
  },

  balanceSheet: {
    marginBottom: 12,
    marginTop: 2,
  },
  balanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  balanceLineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  balanceLineLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: C.label,
    letterSpacing: -0.1,
    flex: 1,
    paddingRight: 8,
  },
  balanceLineLabelMuted: {
    color: C.textMuted,
  },
  balanceLineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.black,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  balanceLineValueHighlight: {
    color: C.accent,
  },
  balanceLineValueMuted: {
    color: C.textMuted,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.purpleTint,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.purpleTintBorder,
  },
  infoCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -0.15,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  filterBtn: { paddingVertical: 6, paddingLeft: 8 },
  filterText: { fontSize: 14, fontWeight: '500', color: C.textMuted },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    gap: 12,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  txMeta: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
    fontWeight: '400',
  },
  txValor: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },

  securityNote: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.line,
    fontWeight: '400',
  },
});
