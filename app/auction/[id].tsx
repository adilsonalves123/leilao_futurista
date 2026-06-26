import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingTechnicalSheetTable } from '@/components/listing/ListingTechnicalSheetTable';
import { LiveAuctionChat } from '@/components/live-auction/LiveAuctionChat';
import { AuctionAiInlineCard } from '@/components/ai/AuctionAiInlineCard';
import { buildTechSheetDisplayRows } from '@/src/constants/electronicsTechSheet';
import { useLiveAuctionChat } from '@/src/hooks/useLiveAuctionChat';
import { KycBidBlockedModal } from '@/components/kyc/KycBidBlockedModal';
import { BuyerPhotosCarousel } from '@/components/reviews/BuyerPhotosCarousel';
import { VendorPublicCard } from '@/components/seller/VendorPublicCard';
import { AuctionSellerLine } from '@/components/seller/AuctionSellerLine';
import { resumirPolitica } from '@/components/policies/policyContent';
import { useAppPolicy } from '@/components/policies/useAppPolicy';
import { useJarvis } from '@/src/store/jarvisContext';
import { formatBRL, getNextMinimumBid } from '@/src/lib/bids';
import { isUuidAuctionId, normalizeAuctionId } from '@/src/lib/auctionIds';
import { loadBuyerAuctionDetail, type BuyerAuctionDetail } from '@/src/services/auctionDetail';
import { registrarLeilaoVisto } from '@/src/lib/recentlyViewedAuctions';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import {
  obterUsernameAtual,
  registrarLanceSistemaChatAoVivo,
} from '@/src/services/liveAuctionChat';
import { getAuctionById } from '@/src/mocks/auctions';
import { previewRetencaoLance } from '@/src/services/buyerBidHold';
import { registrarLanceComNotificacao } from '@/src/services/userNotifications';
import {
  extrairFotosReviews,
  listarReviewsPorLeilao,
} from '@/src/services/reviews';
import {
  obterPerfilVendedorPublico,
  type VendorPublicProfile,
} from '@/src/services/vendorPublicProfile';
import { useFinancialActionGuard } from '@/src/hooks/useFinancialActionGuard';
import { useKyc } from '@/src/store/kycContext';
import type { StatusVerificacao } from '@/src/types/kyc';

const C = {
  bg: '#FFFFFF',
  white: '#FFFFFF',
  textPrimary: '#111111',
  textMuted: '#8A8A8A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  line: '#E8E8E8',
  accent: '#7C3AED',
  accentLight: '#A78BFA',
  accentSoft: '#FAF5FF',
  accentBorder: '#EDE9FE',
  ink: '#0A192F',
  liveRed: '#EF4444',
  criticalRed: '#FF3B30',
  gold: '#B8860B',
};

const CRITICAL_FLASH_MS = 650;

const MOCK_PRODUCT = {
  title: 'iPhone 16 Pro Max',
  specs: [
    { label: '256GB', icon: 'cube-outline' as const },
    { label: 'Novo', icon: 'pricetag-outline' as const },
  ],
  img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=800',
};

const MOCK_TECH_SHEET_ROWS = buildTechSheetDisplayRows({
  type_id: 'celular',
  values: {
    marca: 'Apple',
    modelo: 'iPhone 16 Pro Max',
    armazenamento_gb: '256 GB',
    saude_bateria: '100%',
    estado_tela: 'Perfeita',
    pecas_originais: 'Sim',
  },
});

const INITIAL_PRICE_CENTS = 145800;
const AUCTION_DURATION_SEC = 45;

const MAX_RECENT_BIDS = 4;

type RecentBid = {
  id: string;
  userName: string;
  amountCents: number;
  timestamp: Date;
};

const INITIAL_RECENT_BIDS: RecentBid[] = [
  { id: 'init-1', userName: 'Ana M.', amountCents: 142800, timestamp: new Date(Date.now() - 14000) },
  { id: 'init-2', userName: 'Pedro R.', amountCents: 144300, timestamp: new Date(Date.now() - 8000) },
  { id: 'init-3', userName: 'Lucas S.', amountCents: 145800, timestamp: new Date(Date.now() - 3000) },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUICK_BID_INCREMENTS = [
  { label: '+ R$ 50', cents: 5000 },
  { label: '+ R$ 100', cents: 10000 },
  { label: '+ R$ 200', cents: 20000 },
  { label: '+ R$ 500', cents: 50000 },
];

const STATS = [
  { icon: 'flame' as const, value: '28', label: 'lances' },
  { icon: 'people' as const, value: '152', label: 'participantes' },
  { icon: 'trophy' as const, value: 'Top 1º', label: 'lugar' },
];

const SIDEBAR_WIDTH_EXPANDED = 72;
const SIDEBAR_WIDTH_COLLAPSED = 44;

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function parseInputToCents(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) ? 0 : Math.round(val * 100);
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBidTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function bidUserInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.shimmerBlock, style, { opacity }]} />;
}

function AuctionDetailSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <ShimmerBlock style={styles.skeletonCircle} />
          <ShimmerBlock style={styles.skeletonPillSm} />
          <View style={{ flex: 1 }} />
          <ShimmerBlock style={styles.skeletonCircle} />
        </View>

        <ShimmerBlock style={styles.skeletonHero} />

        <View style={styles.contentSheet}>
          <ShimmerBlock style={styles.skeletonLineSm} />
          <ShimmerBlock style={styles.skeletonLineLg} />
          <View style={styles.skeletonSpecRow}>
            <ShimmerBlock style={styles.skeletonPillMd} />
            <ShimmerBlock style={styles.skeletonPillMd} />
          </View>

          <View style={styles.skeletonBidPanel}>
            <View style={styles.skeletonBidHeader}>
              <ShimmerBlock style={styles.skeletonBidTimer} />
              <ShimmerBlock style={styles.skeletonBidPrice} />
            </View>
            <ShimmerBlock style={styles.skeletonBidChip} />
            <View style={styles.skeletonQuickRow}>
              <ShimmerBlock style={styles.skeletonQuickBtn} />
              <ShimmerBlock style={styles.skeletonQuickBtn} />
              <ShimmerBlock style={styles.skeletonQuickBtn} />
              <ShimmerBlock style={styles.skeletonQuickBtn} />
            </View>
            <ShimmerBlock style={styles.skeletonBidInput} />
            <ShimmerBlock style={styles.skeletonBidCta} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type BidCtaButtonProps = {
  disabled: boolean;
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function BidCtaButton({ disabled, onPress, label, icon }: BidCtaButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  function handlePress() {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button">
      <Animated.View
        style={[styles.bidCta, disabled && styles.bidCtaBlocked, { transform: [{ scale }] }]}>
        <Text style={styles.bidCtaText}>{label}</Text>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

function BidFeedPill({ bid, isNewest }: { bid: RecentBid; isNewest: boolean }) {
  const fadeAnim = useRef(new Animated.Value(isNewest ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNewest ? 10 : 0)).current;

  useEffect(() => {
    if (!isNewest) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [isNewest, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.bidFeedPill,
        isNewest && styles.bidFeedPillNewest,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}>
      <View style={[styles.bidFeedAvatar, isNewest && styles.bidFeedAvatarNewest]}>
        <Text style={[styles.bidFeedAvatarText, isNewest && styles.bidFeedAvatarTextNewest]}>
          {bidUserInitial(bid.userName)}
        </Text>
      </View>
      <View style={styles.bidFeedContent}>
        <Text style={styles.bidFeedPillName} numberOfLines={1}>
          {bid.userName}
        </Text>
        <Text style={[styles.bidFeedPillAmount, isNewest && styles.bidFeedPillAmountNewest]}>
          {formatBRL(bid.amountCents)}
        </Text>
      </View>
      <Text style={styles.bidFeedPillTime}>{formatBidTime(bid.timestamp)}</Text>
    </Animated.View>
  );
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { podeDarLance, perfil } = useKyc();
  const { confirmarAcaoFinanceira } = useFinancialActionGuard();
  const { policy: termoArremate, carregando: carregandoTermo } = useAppPolicy(
    'comprador_termo_arremate',
  );
  const statusKyc: StatusVerificacao = perfil?.statusVerificacao ?? 'pendente';

  const [buyerDetail, setBuyerDetail] = useState<BuyerAuctionDetail | null>(null);
  const [vendorPerfil, setVendorPerfil] = useState<VendorPublicProfile | null>(null);
  const [auctionLoading, setAuctionLoading] = useState(true);

  const [currentPriceCents, setCurrentPriceCents] = useState(INITIAL_PRICE_CENTS);
  const minimumBid = getNextMinimumBid(currentPriceCents);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [bidInput, setBidInput] = useState(() =>
    centsToInput(getNextMinimumBid(INITIAL_PRICE_CENTS)),
  );
  const [bidHoldPreview, setBidHoldPreview] = useState<{
    holdCents: number;
    holdDescription: string;
  } | null>(null);
  const [leaderName, setLeaderName] = useState('—');
  const [leaderIsUser, setLeaderIsUser] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('Você');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [recentBids, setRecentBids] = useState<RecentBid[]>(INITIAL_RECENT_BIDS);
  const [isBidsExpanded, setIsBidsExpanded] = useState(false);
  const [kycModalVisible, setKycModalVisible] = useState(false);
  const [buyerPhotoUrls, setBuyerPhotoUrls] = useState<string[]>([]);
  const { openJarvis, setAuctionContext, setFabBottomOffset } = useJarvis();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sidebarAnim = useRef(new Animated.Value(1)).current;
  const bidFeedOpacity = useRef(new Animated.Value(1)).current;

  const auctionId = normalizeAuctionId(typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? '' : '');
  const mockAuction = getAuctionById(auctionId);
  const productTitle = buyerDetail?.title ?? mockAuction?.title ?? MOCK_PRODUCT.title;
  const productImageUrl =
    buyerDetail?.imageUrl ?? mockAuction?.imageUrl ?? MOCK_PRODUCT.img;
  const productSpecs = useMemo(() => {
    if (buyerDetail?.conservationState || buyerDetail?.category) {
      const specs: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [];
      if (buyerDetail.conservationState) {
        specs.push({ label: buyerDetail.conservationState, icon: 'pricetag-outline' });
      }
      if (buyerDetail.category) {
        specs.push({ label: buyerDetail.category, icon: 'cube-outline' });
      }
      return specs;
    }
    return MOCK_PRODUCT.specs;
  }, [buyerDetail]);
  const leilaoEncerrado = secondsLeft <= 0;
  const leilaoAoVivo = !leilaoEncerrado;
  const usuarioVenceu = leilaoEncerrado && leaderIsUser;
  const podeConfirmarLance = podeDarLance && !leilaoEncerrado;
  const estimatedMarketCents = buyerDetail?.estimatedMarketCents ?? null;
  const aiFabBottomOffset = insets.bottom + (secondsLeft > 0 ? 76 : 24);
  const chatAoVivo = useLiveAuctionChat({ auctionId: auctionId || (id ?? '1247'), enabled: leilaoAoVivo });

  useEffect(() => {
    setFabBottomOffset(aiFabBottomOffset);
  }, [aiFabBottomOffset, setFabBottomOffset]);

  useEffect(() => {
    if (!auctionId) {
      setAuctionContext(null);
      return;
    }
    setAuctionContext({
      auctionId: auctionId || (id ?? ''),
      auctionTitle: productTitle,
      bidCents: currentPriceCents,
      marketCents: estimatedMarketCents,
      description: buyerDetail?.description,
      conservationState: buyerDetail?.conservationState,
      category: buyerDetail?.category,
    });
    return () => setAuctionContext(null);
  }, [
    auctionId,
    id,
    productTitle,
    currentPriceCents,
    estimatedMarketCents,
    buyerDetail?.description,
    buyerDetail?.conservationState,
    buyerDetail?.category,
    setAuctionContext,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!auctionId) {
      setAuctionLoading(false);
      return;
    }

    setAuctionLoading(true);
    loadBuyerAuctionDetail(auctionId).then((detail) => {
      if (cancelled) return;

      if (detail) {
        setBuyerDetail(detail);
        setCurrentPriceCents(detail.currentPriceCents);
        setBidInput(centsToInput(getNextMinimumBid(detail.currentPriceCents)));
        setLeaderName(detail.leaderName);
        setLeaderIsUser(detail.leaderIsUser);
        if (detail.recentBids.length) {
          setRecentBids(
            detail.recentBids.map((b) => ({
              id: b.id,
              userName: b.userName,
              amountCents: b.amountCents,
              timestamp: b.timestamp,
            })),
          );
        } else {
          setRecentBids([]);
        }
      } else if (mockAuction) {
        setCurrentPriceCents(mockAuction.priceCents);
        setBidInput(centsToInput(getNextMinimumBid(mockAuction.priceCents)));
        setSecondsLeft(AUCTION_DURATION_SEC);
        setRecentBids(INITIAL_RECENT_BIDS);
        setLeaderName('Lucas S.');
      } else {
        setSecondsLeft(AUCTION_DURATION_SEC);
        setRecentBids(INITIAL_RECENT_BIDS);
        setLeaderName('Lucas S.');
      }

      setAuctionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [auctionId, mockAuction]);

  useEffect(() => {
    if (!auctionId) return;
    registrarLeilaoVisto({
      auctionId,
      title: productTitle,
      imageUrl: productImageUrl,
    });
  }, [auctionId, productTitle, productImageUrl]);

  useEffect(() => {
    obterUsernameAtual().then((nome) => {
      if (nome && nome !== 'Participante') setUserDisplayName(nome);
    });
  }, []);

  const bidCents = parseInputToCents(bidInput);
  const isUrgent = secondsLeft < 120;

  useEffect(() => {
    if (bidCents <= 0 || leilaoEncerrado) {
      setBidHoldPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      previewRetencaoLance(
        bidCents,
        isUuidAuctionId(auctionId) ? auctionId : undefined,
      ).then((preview) => {
        if (cancelled) return;
        setBidHoldPreview(
          preview.holdCents > 0
            ? { holdCents: preview.holdCents, holdDescription: preview.holdDescription }
            : null,
        );
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bidCents, auctionId, leilaoEncerrado]);
  const isCriticalUrgent = secondsLeft <= 59 && secondsLeft > 0;

  const heroWidthCollapsed = windowWidth - 32;
  const heroWidthExpanded = Math.round(windowWidth * 0.76);
  const heroHeightCollapsed = Math.min(
    Math.round(windowHeight * 0.32),
    Math.round(heroWidthCollapsed * 0.72),
  );
  const heroHeightExpanded = Math.min(
    Math.round(windowHeight * 0.30),
    Math.round(heroWidthExpanded * 0.72),
  );
  const isLandscape = windowWidth > windowHeight;
  const modalImageWidth = windowWidth - insets.left - insets.right;
  const modalImageHeight = windowHeight - insets.top - insets.bottom - 24;

  useEffect(() => {
    listarReviewsPorLeilao(id ?? '1').then((reviews) => {
      setBuyerPhotoUrls(extrairFotosReviews(reviews));
    });
  }, [id]);

  useEffect(() => {
    const sellerId = buyerDetail?.sellerId;
    if (!sellerId) {
      setVendorPerfil(null);
      return;
    }

    let cancelled = false;
    obterPerfilVendedorPublico(sellerId).then((perfil) => {
      if (!cancelled) setVendorPerfil(perfil);
    });

    return () => {
      cancelled = true;
    };
  }, [buyerDetail?.sellerId]);

  useEffect(() => {
    if (auctionLoading) return;

    if (buyerDetail?.endsAtMs) {
      const tick = () => {
        setSecondsLeft(Math.max(0, Math.floor((buyerDetail.endsAtMs - Date.now()) / 1000)));
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [buyerDetail?.endsAtMs, auctionLoading]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      Animated.timing(bidFeedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    } else {
      bidFeedOpacity.setValue(1);
    }
  }, [secondsLeft, bidFeedOpacity]);

  useEffect(() => {
    if (!isCriticalUrgent) {
      setIsFlashActive(false);
      return;
    }

    const flashInterval = setInterval(() => {
      setIsFlashActive((prev) => !prev);
    }, CRITICAL_FLASH_MS);

    return () => clearInterval(flashInterval);
  }, [isCriticalUrgent]);

  useEffect(() => {
    if (!isUrgent || isCriticalUrgent) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 700, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isUrgent, isCriticalUrgent, pulseAnim]);

  const timerOpacity = pulseAnim.interpolate({
    inputRange: [0.55, 1],
    outputRange: [0.7, 1],
  });

  const urgentBorderColor = pulseAnim.interpolate({
    inputRange: [0.55, 1],
    outputRange: [C.accent, C.border],
  });

  useEffect(() => {
    Animated.spring(sidebarAnim, {
      toValue: isSidebarCollapsed ? 0 : 1,
      friction: 9,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [isSidebarCollapsed, sidebarAnim]);

  const sidebarWidth = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED],
  });

  const sidebarTextOpacity = sidebarAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  const sidebarPaddingH = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 10],
  });

  const sidebarTextHeight = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 34],
  });

  const productImageWidth = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heroWidthCollapsed, heroWidthExpanded],
  });

  const productImageHeight = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heroHeightCollapsed, heroHeightExpanded],
  });

  const productRowMinHeight = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heroHeightCollapsed + 8, heroHeightExpanded + 8],
  });

  const productImageOffsetX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SIDEBAR_WIDTH_EXPANDED - SIDEBAR_WIDTH_COLLAPSED) / 2],
  });

  const sidebarTranslateY = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-Math.round(heroHeightCollapsed * 0.28), -Math.round(heroHeightExpanded * 0.3)],
  });

  function openImageModal() {
    setIsImageModalVisible(true);
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => !prev);
  }

  function closeImageModal() {
    setIsImageModalVisible(false);
  }

  function addQuickBid(cents: number) {
    if (leilaoEncerrado) return;
    setBidInput((prev) => {
      const current = parseInputToCents(prev);
      const base = current > 0 ? current : minimumBid;
      return centsToInput(base + cents);
    });
  }

  function clearBid() {
    setBidInput('');
  }

  function handleBidPress() {
    if (leilaoEncerrado) return;
    if (!podeDarLance) {
      setKycModalVisible(true);
      return;
    }
    handleConfirmBid();
  }

  async function handleConfirmBid() {
    if (!podeDarLance) {
      setKycModalVisible(true);
      return;
    }

    const amountCents = parseInputToCents(bidInput);

    if (!bidInput.trim() || amountCents <= 0) {
      Alert.alert('Lance inválido', 'Informe um valor válido para o lance.');
      return;
    }

    if (amountCents < minimumBid) {
      Alert.alert(
        'Lance abaixo do mínimo',
        `O lance deve ser de no mínimo ${formatBRL(minimumBid)} (lance atual: ${formatBRL(currentPriceCents)}).`,
      );
      return;
    }

    if (secondsLeft <= 0) {
      Alert.alert('Leilão encerrado', 'Este leilão já foi finalizado.');
      return;
    }

    const confirmado = await confirmarAcaoFinanceira('security.confirmBidPrompt');
    if (!confirmado) {
      return;
    }

    const bidderId = await obterIdUsuarioAtual();
    if (!bidderId) {
      Alert.alert('Login necessário', 'Entre na sua conta para dar lances.');
      return;
    }

    let sellerId: string | null = MOCK_VENDOR_ID;
    let auctionTitle = productTitle;

    if (isSupabaseConfigured() && isUuidAuctionId(auctionId)) {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from('auctions')
          .select('seller_id, title')
          .eq('id', auctionId)
          .maybeSingle();
        if (data) {
          sellerId = data.seller_id as string;
          auctionTitle = (data.title as string) || auctionTitle;
        }
      }
    }

    const resultado = await registrarLanceComNotificacao({
      auctionId,
      auctionTitle,
      sellerId,
      amountCents,
      bidderId,
    });

    if (!resultado.ok) {
      const msg = resultado.message ?? 'Tente novamente.';
      Alert.alert(
        'Erro ao registrar lance',
        msg.includes('Saldo disponível')
          ? `${msg}\n\nRecarregue a carteira — a caução do lance é retida conforme a faixa do item (não é pagamento automático).`
          : msg,
      );
      return;
    }

    const msgLance = await registrarLanceSistemaChatAoVivo(auctionId, amountCents);
    if (msgLance) {
      chatAoVivo.publicarMensagem(msgLance);
    }

    const nomeExibicao = userDisplayName || 'Você';
    setCurrentPriceCents(amountCents);
    setLeaderName(nomeExibicao);
    setLeaderIsUser(true);
    setBidInput(centsToInput(getNextMinimumBid(amountCents)));

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecentBids((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        userName: nomeExibicao,
        amountCents,
        timestamp: new Date(),
      },
    ].slice(-MAX_RECENT_BIDS));

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert(
      'Lance confirmado!',
      `Você é o líder com ${formatBRL(amountCents)}. Aguarde o fim do cronômetro para arrematar.`,
    );
  }

  function abrirCheckoutArremate() {
    router.push({
      pathname: '/checkout/[id]',
      params: {
        id: auctionId || (id ?? '1'),
        amountCents: String(currentPriceCents),
      },
    });
  }

  if (auctionLoading) {
    return <AuctionDetailSkeleton />;
  }

  if (isUuidAuctionId(auctionId) && !buyerDetail) {
    return (
      <View style={[styles.root, styles.centeredState]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
        <Text style={styles.loadingText}>Leilão não encontrado ou indisponível.</Text>
        <Pressable style={styles.backLinkBtn} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}>
        {/* TOP BAR */}
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
          </Pressable>

          <View style={[styles.liveBadge, leilaoEncerrado && styles.liveBadgeEnded]}>
            <View style={[styles.liveDot, leilaoEncerrado && styles.liveDotEnded]} />
            <Text style={styles.liveText}>{leilaoEncerrado ? 'Encerrado' : 'Ao vivo'}</Text>
          </View>

          <View style={styles.viewersBadge}>
            <Ionicons name="eye-outline" size={14} color={C.textMuted} />
            <Text style={styles.viewersText}>2.543</Text>
          </View>

          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="share-outline" size={18} color={C.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={C.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* PRODUTO + CARD FLUTUANTE */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.productRow, { minHeight: productRowMinHeight }]}>
            <Animated.View
              style={[
                styles.floatingStatsCard,
                Platform.OS === 'web' && styles.floatingStatsCardBlur,
                {
                  width: sidebarWidth,
                  paddingHorizontal: sidebarPaddingH,
                  transform: [{ translateY: sidebarTranslateY }],
                },
              ]}>
              <Pressable
                style={styles.sidebarToggle}
                onPress={toggleSidebar}
                hitSlop={6}
                accessibilityLabel={isSidebarCollapsed ? 'Expandir estatísticas' : 'Recolher estatísticas'}>
                <Ionicons
                  name={isSidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
                  size={14}
                  color={C.accent}
                />
              </Pressable>

              {STATS.map((stat, index) => (
                <View
                  key={stat.label}
                  style={[
                    styles.statItem,
                    isSidebarCollapsed && styles.statItemCollapsed,
                    index < STATS.length - 1 && styles.statItemBorder,
                  ]}>
                  <Ionicons name={stat.icon} size={isSidebarCollapsed ? 16 : 18} color={C.accent} />
                  <Animated.View
                    style={{
                      opacity: sidebarTextOpacity,
                      maxHeight: sidebarTextHeight,
                      overflow: 'hidden',
                      alignItems: 'center',
                    }}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </Animated.View>
                </View>
              ))}
            </Animated.View>

            <Animated.View
              style={[
                styles.productImageWrap,
                {
                  width: productImageWidth,
                  height: productImageHeight,
                  marginLeft: productImageOffsetX,
                },
              ]}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={openImageModal}
                style={styles.heroProductTouchable}
                accessibilityRole="button"
                accessibilityLabel="Ampliar imagem do produto">
                <Image
                  source={{ uri: productImageUrl }}
                  style={styles.heroProduct}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <Pressable
                style={styles.heroExpandBtn}
                onPress={openImageModal}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Expandir imagem em tela cheia">
                <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          </Animated.View>

          <View style={styles.pagination}>
            <View style={styles.paginationDotActive} />
            <Text style={styles.paginationText} includeFontPadding>
              1 / 6
            </Text>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.paginationDot} />
            ))}
          </View>
        </View>

        {/* CARD PRINCIPAL — cantos arredondados superiores */}
        <View style={styles.contentSheet}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.auctionId}>Leilão #{id ?? '1247'}</Text>
              <Text style={styles.productTitle}>{productTitle}</Text>
              <View style={styles.specsRow}>
                {productSpecs.map((spec) => (
                  <View key={spec.label} style={styles.specItem}>
                    <Ionicons name={spec.icon} size={13} color={C.textMuted} />
                    <Text style={styles.specText}>{spec.label}</Text>
                  </View>
                ))}
              </View>
              {vendorPerfil ? (
                <AuctionSellerLine
                  seller={{
                    sellerId: vendorPerfil.id,
                    sellerName: vendorPerfil.nomeExibicao,
                    sellerBadge: vendorPerfil.sellerBadge,
                  }}
                  compact
                />
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.bookmarkBtn}
              onPress={() => setIsSaved((prev) => !prev)}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Remover dos salvos' : 'Salvar leilão'}
              accessibilityState={{ selected: isSaved }}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={C.accent}
              />
            </TouchableOpacity>
          </View>

          {vendorPerfil ? (
            <View style={styles.vendorSection}>
              <Text style={styles.vendorSectionLabel}>Vendedor</Text>
              <VendorPublicCard
                profile={vendorPerfil}
                onPress={() =>
                  router.push(`/vendor/${encodeURIComponent(vendorPerfil.id)}` as never)
                }
              />
            </View>
          ) : null}

          {buyerPhotoUrls.length > 0 ? (
            <BuyerPhotosCarousel
              images={buyerPhotoUrls}
              title="Fotos reais de compradores"
              subtitle="Imagens verificadas de quem já arrematou este lote"
              variant="light"
            />
          ) : null}

          <ListingTechnicalSheetTable rows={MOCK_TECH_SHEET_ROWS} />

          <AuctionAiInlineCard onPress={openJarvis} />

          {/* PAINEL DE LANCE — fintech / credibilidade */}
          <View style={[styles.bidPanel, leilaoEncerrado && styles.bidPanelEnded]}>
            {leilaoEncerrado ? (
              <View style={styles.bidEndedBanner}>
                <Ionicons name="flag-outline" size={16} color={C.textSecondary} />
                <Text style={styles.bidEndedBannerText}>Leilão encerrado</Text>
              </View>
            ) : null}

            <View style={styles.bidPanelHeader}>
              <Animated.View
                style={[
                  styles.bidTimerCard,
                  leilaoEncerrado && styles.bidTimerCardEnded,
                  !leilaoEncerrado && !isCriticalUrgent && isUrgent && { borderColor: urgentBorderColor },
                  !leilaoEncerrado && isCriticalUrgent && isFlashActive && styles.bidTimerCardCritical,
                ]}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={
                    leilaoEncerrado
                      ? C.textMuted
                      : isCriticalUrgent && isFlashActive
                        ? '#FFF'
                        : C.accent
                  }
                />
                <Text
                  style={[
                    styles.bidTimerLabel,
                    isCriticalUrgent && isFlashActive && styles.bidTimerLabelCritical,
                  ]}>
                  {leilaoEncerrado ? 'Encerrado' : 'Tempo restante'}
                </Text>
                <Animated.Text
                  style={[
                    styles.bidTimerValue,
                    !isCriticalUrgent && isUrgent && { opacity: timerOpacity },
                    isCriticalUrgent && isFlashActive && styles.bidTimerValueCritical,
                  ]}>
                  {leilaoEncerrado ? '00:00:00' : formatCountdown(secondsLeft)}
                </Animated.Text>
                {(isCriticalUrgent || isUrgent) && !leilaoEncerrado ? (
                  <Text
                    style={[
                      styles.bidTimerHint,
                      isCriticalUrgent && isFlashActive && styles.bidTimerHintCritical,
                    ]}>
                    {isCriticalUrgent ? 'Últimos segundos' : 'Encerramento iminente'}
                  </Text>
                ) : null}
              </Animated.View>

              <View style={[styles.bidPriceCard, leilaoEncerrado && styles.bidPriceCardEnded]}>
                <Text style={styles.bidPriceEyebrow}>
                  {leilaoEncerrado ? 'Lance final' : 'Lance atual'}
                </Text>
                <Text style={styles.bidPriceValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatBRL(currentPriceCents)}
                </Text>
                <View style={styles.leaderRow}>
                  <Ionicons name="ribbon-outline" size={13} color={leaderIsUser ? C.accent : C.gold} />
                  <Text
                    style={[styles.leaderName, leaderIsUser && styles.leaderNameYou]}
                    numberOfLines={1}>
                    {leaderIsUser ? `${leaderName} (você)` : leaderName}
                  </Text>
                  <View style={[styles.leaderChip, leaderIsUser && styles.leaderChipYou]}>
                    <Text style={[styles.leaderChipText, leaderIsUser && styles.leaderChipTextYou]}>
                      Líder
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.bidPanelDivider} />

            {leilaoEncerrado ? (
              <View style={styles.bidEndedSummary}>
                <View style={styles.bidEndedSummaryRow}>
                  <Text style={styles.bidEndedSummaryLabel}>Vencedor</Text>
                  <Text style={styles.bidEndedSummaryValue} numberOfLines={1}>
                    {leaderName}
                  </Text>
                </View>
                <View style={styles.bidEndedSummaryRow}>
                  <Text style={styles.bidEndedSummaryLabel}>Valor arrematado</Text>
                  <Text style={styles.bidEndedSummaryAmount}>{formatBRL(currentPriceCents)}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.minimumChip}>
                  <Text style={styles.minimumChipLabel}>Próximo lance mínimo</Text>
                  <Text style={styles.minimumChipValue}>{formatBRL(minimumBid)}</Text>
                </View>

                <View style={styles.quickBidRow}>
                  {QUICK_BID_INCREMENTS.map((item) => (
                    <Pressable
                      key={item.label}
                      style={styles.quickBidBtn}
                      onPress={() => addQuickBid(item.cents)}>
                      <Text style={styles.quickBidBtnText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.bidFieldLabel}>Seu lance</Text>
                <View style={styles.bidInputWrap}>
                  <Text style={styles.bidInputPrefix}>R$</Text>
                  <TextInput
                    style={styles.bidInput}
                    value={bidInput}
                    onChangeText={setBidInput}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={C.textMuted}
                    selectTextOnFocus
                  />
                  {bidInput.length > 0 ? (
                    <Pressable style={styles.clearBtn} onPress={clearBid} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={C.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                {bidHoldPreview ? (
                  <View style={styles.bidHoldCard}>
                    <Ionicons name="information-circle-outline" size={18} color={C.accent} />
                    <Text style={styles.bidHoldCardText}>
                      Caução retida: {formatBRL(bidHoldPreview.holdCents)} ·{' '}
                      {bidHoldPreview.holdDescription}
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {usuarioVenceu ? (
              <View style={styles.winnerBanner}>
                <Ionicons name="trophy" size={22} color="#B45309" />
                <View style={styles.winnerBannerText}>
                  <Text style={styles.winnerTitle}>Parabéns! Você venceu o leilão</Text>
                  <Text style={styles.winnerSub}>
                    Arremate de {formatBRL(currentPriceCents)} — siga para o pagamento e cálculo de
                    frete.
                  </Text>
                </View>
              </View>
            ) : null}

            <BidCtaButton
              disabled={leilaoEncerrado && !usuarioVenceu}
              onPress={usuarioVenceu ? abrirCheckoutArremate : handleBidPress}
              label={
                leilaoEncerrado
                  ? usuarioVenceu
                    ? `Ir para pagamento · ${formatBRL(currentPriceCents)}`
                    : 'Leilão encerrado'
                  : podeDarLance
                    ? `Confirmar lance · ${formatBRL(bidCents > 0 ? bidCents : minimumBid)}`
                    : 'Complete o KYC para dar lance'
              }
              icon={
                leilaoEncerrado
                  ? usuarioVenceu
                    ? 'card-outline'
                    : 'time-outline'
                  : podeDarLance
                    ? 'arrow-forward'
                    : 'lock-closed-outline'
              }
            />

            <Text style={styles.bidLegalText}>
              {leilaoEncerrado
                ? usuarioVenceu
                  ? 'Use o botão acima para pagar e ver o frete estimado (Melhor Envio).'
                  : `Leilão encerrado. Vencedor: ${leaderName} com ${formatBRL(currentPriceCents)}.`
                : podeDarLance
                  ? carregandoTermo
                    ? 'Carregando termo vinculante de arremate…'
                    : termoArremate
                      ? resumirPolitica(termoArremate.content, 180)
                      : 'Lance vinculante conforme termo de arremate do cadastro KYC.'
                  : 'Para dar lances, conclua o cadastro (KYC) e aguarde aprovação.'}
            </Text>

            <View style={styles.bidTrustRow}>
              <View style={styles.bidTrustBadge}>
                <Ionicons name="shield-checkmark" size={14} color={C.accent} />
                <Text style={styles.bidTrustText}>Levou Escrow</Text>
              </View>
              <View style={styles.bidTrustDot} />
              <Text style={styles.bidTrustSub}>Pagamento protegido</Text>
            </View>
          </View>

          {leilaoAoVivo ? (
            <LiveAuctionChat ativo {...chatAoVivo} />
          ) : null}
        </View>
      </ScrollView>

      {secondsLeft > 0 ? (
        <Animated.View
          style={[
            styles.bidsFloatingBlock,
            isBidsExpanded && styles.bidsFloatingBlockExpanded,
            isBidsExpanded && Platform.OS === 'web' && styles.bidsFloatingBlockBlur,
            { opacity: bidFeedOpacity, bottom: insets.bottom + 20 },
          ]}>
          {isBidsExpanded ? (
            <>
              <View style={styles.bidsFeedHeader}>
                <View style={styles.bidsFeedTitleRow}>
                  <Ionicons name="pulse" size={14} color={C.accent} />
                  <Text style={styles.bidsFeedTitle}>Últimos lances</Text>
                </View>
                <Pressable
                  style={styles.bidsCollapseBtn}
                  onPress={() => setIsBidsExpanded(false)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Minimizar lances">
                  <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                </Pressable>
              </View>
              <View style={styles.recentBidsFeedList}>
                {recentBids.map((bid, index) => (
                  <BidFeedPill
                    key={bid.id}
                    bid={bid}
                    isNewest={index === recentBids.length - 1}
                  />
                ))}
              </View>
            </>
          ) : (
            <Pressable
              style={[
                styles.bidsCollapsedPill,
                Platform.OS === 'web' && styles.bidsFloatingBlockBlur,
              ]}
              onPress={() => setIsBidsExpanded(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ver últimos lances">
              <View style={styles.bidsCollapsedIcon}>
                <Ionicons name="pulse" size={13} color={C.accent} />
              </View>
              <Text style={styles.bidsCollapsedText}>
                {recentBids.length > 0
                  ? `${recentBids.length} lance${recentBids.length > 1 ? 's' : ''} recente${recentBids.length > 1 ? 's' : ''}`
                  : 'Atividade recente'}
              </Text>
              <Ionicons name="chevron-up" size={14} color={C.accent} />
            </Pressable>
          )}
        </Animated.View>
      ) : null}

      <KycBidBlockedModal
        visible={kycModalVisible}
        onClose={() => setKycModalVisible(false)}
        status={statusKyc}
      />

      <Modal
        visible={isImageModalVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={closeImageModal}>
        <View
          style={[
            styles.imageModalBackdrop,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}>
          <Pressable
            style={styles.imageModalCloseBtn}
            onPress={closeImageModal}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem ampliada">
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>

          {Platform.OS === 'ios' ? (
            <ScrollView
              style={styles.imageModalScroll}
              contentContainerStyle={[
                styles.imageModalScrollContent,
                { minHeight: modalImageHeight },
              ]}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              bouncesZoom>
              <Image
                source={{ uri: productImageUrl }}
                style={{ width: modalImageWidth, height: modalImageHeight }}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            <View style={[styles.imageModalImageWrap, { width: modalImageWidth, height: modalImageHeight }]}>
              <Image
                source={{ uri: productImageUrl }}
                style={styles.imageModalFullscreenImage}
                resizeMode="contain"
              />
            </View>
          )}

          <Text style={styles.imageModalHint}>
            {isLandscape
              ? 'Modo paisagem — inspecione os detalhes do produto'
              : 'Gire o aparelho para ampliar em modo paisagem'}
          </Text>
        </View>
      </Modal>

      {isCriticalUrgent ? (
        <View
          pointerEvents="none"
          style={[
            styles.criticalFlashOverlay,
            {
              backgroundColor: isFlashActive
                ? 'rgba(255, 59, 48, 0.15)'
                : 'rgba(0, 0, 0, 0)',
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: 'visible' as const },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
    color: C.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  backLinkBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  backLinkText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    backgroundColor: C.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.liveRed,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: 0.2,
  },
  liveBadgeEnded: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  liveDotEnded: {
    backgroundColor: '#9CA3AF',
  },
  viewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewersText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  topActions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: C.white,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  productImageWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  floatingStatsCard: {
    position: 'absolute',
    left: 0,
    top: '50%',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingTop: 4,
    paddingBottom: 8,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingStatsCardBlur: {
    // @ts-expect-error — backdropFilter suportado na web
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  sidebarToggle: {
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  statItemCollapsed: {
    paddingVertical: 6,
    gap: 0,
  },
  statItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
  },
  statValue: { fontSize: 11, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  statLabel: { fontSize: 8, fontWeight: '600', color: C.textMuted, textAlign: 'center' },
  heroProduct: {
    width: '100%',
    height: '100%',
  },
  heroProductTouchable: {
    width: '100%',
    height: '100%',
  },
  heroExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 3,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageModalCloseBtn: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 10,
  },
  imageModalScroll: {
    flex: 1,
    width: '100%',
  },
  imageModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalFullscreenImage: {
    width: '100%',
    height: '100%',
  },
  imageModalHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minHeight: 20,
    overflow: 'visible',
  },
  paginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    marginHorizontal: 4,
    lineHeight: 18,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },

  contentSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    marginTop: 0,
  },
  titleBlock: { flex: 1 },
  auctionId: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: C.textPrimary,
    marginTop: 6,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  specsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  specText: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  bookmarkBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorSection: { marginBottom: 16 },
  vendorSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  bidPanel: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  bidPanelEnded: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  bidEndedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  bidEndedBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },
  bidPanelHeader: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bidTimerCard: {
    flex: 1,
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bidTimerCardCritical: {
    backgroundColor: C.criticalRed,
    borderColor: C.criticalRed,
  },
  bidTimerCardEnded: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  bidTimerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
    marginTop: 2,
  },
  bidTimerLabelCritical: { color: 'rgba(255,255,255,0.9)' },
  bidTimerValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  bidTimerValueCritical: { color: '#FFFFFF' },
  bidTimerHint: {
    fontSize: 10,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  bidTimerHintCritical: { color: 'rgba(255,255,255,0.92)' },

  bidPriceCard: {
    flex: 1.15,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  bidPriceCardEnded: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  bidPriceEyebrow: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textMuted,
  },
  bidPriceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.6,
    marginTop: 2,
    marginBottom: 6,
    fontVariant: ['tabular-nums'],
  },
  bidPanelDivider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginBottom: 14,
  },
  minimumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  minimumChipLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  minimumChipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    fontVariant: ['tabular-nums'],
  },
  bidEndedSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  bidEndedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bidEndedSummaryLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },
  bidEndedSummaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'right',
  },
  bidEndedSummaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },
  leaderChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  leaderChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gold,
  },
  leaderNameYou: {
    color: C.accent,
    fontWeight: '700',
  },
  leaderChipYou: {
    backgroundColor: C.accentSoft,
    borderColor: C.accentBorder,
  },
  leaderChipTextYou: {
    color: C.accent,
  },
  winnerBanner: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  winnerBannerText: { gap: 4, flex: 1 },
  winnerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  winnerSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  winnerCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  winnerCheckoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  bidInputWrapDisabled: {
    backgroundColor: '#F9FAFB',
  },
  quickBidBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  quickBidBtnTextDisabled: {
    color: C.textMuted,
  },
  criticalFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  bidsFloatingBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  bidsFloatingBlockExpanded: {
    alignItems: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.accentBorder,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  bidsFloatingBlockBlur: {
    // @ts-expect-error — backdropFilter suportado na web
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  bidsCollapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: C.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.accentBorder,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  bidsCollapsedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidsCollapsedText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  bidsFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bidsFeedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidsFeedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  bidsCollapseBtn: {
    padding: 4,
  },
  recentBidsFeedList: {
    gap: 6,
  },
  bidFeedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  bidFeedPillNewest: {
    backgroundColor: C.accentSoft,
    borderColor: C.accentBorder,
  },
  bidFeedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidFeedAvatarNewest: {
    backgroundColor: C.accent,
  },
  bidFeedAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },
  bidFeedAvatarTextNewest: {
    color: '#FFFFFF',
  },
  bidFeedContent: {
    flex: 1,
    gap: 1,
  },
  bidFeedPillName: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  bidFeedPillAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  bidFeedPillAmountNewest: {
    color: C.accent,
  },
  bidFeedPillTime: {
    fontSize: 10,
    fontWeight: '500',
    color: C.textMuted,
    fontVariant: ['tabular-nums'],
  },
  bidFieldLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  bidHoldCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  bidHoldCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: C.textSecondary,
    fontWeight: '500',
  },
  bidInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 12,
    minHeight: 52,
  },
  bidInputPrefix: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textMuted,
    marginRight: 6,
  },
  bidInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: C.textPrimary,
    paddingVertical: 10,
    padding: 0,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  clearBtn: { padding: 4 },

  quickBidRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickBidBtn: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.accentBorder,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  quickBidBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
  },

  bidCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 26,
    backgroundColor: C.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  bidCtaBlocked: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.06,
    elevation: 1,
  },
  bidCtaText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  bidLegalText: {
    fontSize: 11,
    lineHeight: 16,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  bidTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  bidTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bidTrustText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
  },
  bidTrustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.textMuted,
  },
  bidTrustSub: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },

  shimmerBlock: {
    backgroundColor: '#E5E7EB',
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  skeletonPillSm: {
    width: 72,
    height: 24,
    borderRadius: 12,
    marginLeft: 10,
  },
  skeletonPillMd: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
  skeletonHero: {
    height: 300,
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 8,
  },
  skeletonLineSm: {
    height: 14,
    width: 100,
    borderRadius: 7,
    marginBottom: 10,
  },
  skeletonLineLg: {
    height: 22,
    width: '75%',
    borderRadius: 8,
    marginBottom: 14,
  },
  skeletonSpecRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  skeletonBidPanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 16,
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  skeletonBidHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonBidTimer: {
    flex: 1,
    height: 88,
    borderRadius: 14,
  },
  skeletonBidPrice: {
    flex: 1.15,
    height: 88,
    borderRadius: 14,
  },
  skeletonBidChip: {
    height: 40,
    borderRadius: 12,
  },
  skeletonQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonQuickBtn: {
    flex: 1,
    height: 34,
    borderRadius: 999,
  },
  skeletonBidInput: {
    height: 52,
    borderRadius: 14,
  },
  skeletonBidCta: {
    height: 52,
    borderRadius: 26,
    marginTop: 4,
  },
});
