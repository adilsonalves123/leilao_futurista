import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeFeaturedHero } from '@/components/home/HomeFeaturedHero';
import { AuctionSellerLine } from '@/components/seller/AuctionSellerLine';
import { EmptyState } from '@/components/ui/EmptyState';
import type { TranslationKey } from '@/src/i18n/translations';
import { useTranslation } from '@/src/i18n/useTranslation';
import { LevouLogo } from '@/src/components/LevouLogo';
import { useWebLayout } from '@/src/hooks/useWebLayout';
import { useProfile } from '@/src/store/profileContext';
import { useUserNotifications } from '@/src/hooks/useUserNotifications';
import {
  formatarTempoNotificacao,
  KIND_META,
} from '@/src/services/userNotifications';
import { marcarNotificacaoComoLida } from '@/src/lib/notificationFeed';
import {
  favoriteIdsSet,
  toggleFavoriteAuction,
} from '@/src/lib/auctionFavorites';
import { formatBRL } from '@/src/lib/bids';
import { getWalletSummary } from '@/src/services/walletSummary';
import type { UserNotification } from '@/src/types/notifications';
import type { AuctionSellerSnippet } from '@/src/services/auctionSellerSnippet';
import { appColors } from '@/src/theme/lightTokens';

const ENDING_PAD = 16;
const ENDING_GAP = 12;

function defaultCardWidth(screenW: number) {
  return Math.min(200, (screenW - ENDING_PAD * 2 - ENDING_GAP * 3) / 4);
}

function formatarTimerCurto(timer: string): string {
  const parts = timer.split(':');
  if (parts.length >= 2) return `${parts[0]}h ${parts[1]}m`;
  return timer;
}

const CATEGORY_DEFS = [
  { id: 'todos', labelKey: 'home.category.all' as TranslationKey, icon: 'grid-outline' as const },
  { id: 'eletronicos', labelKey: 'home.category.electronics' as TranslationKey, icon: 'phone-portrait-outline' as const },
  { id: 'veiculos', labelKey: 'home.category.vehicles' as TranslationKey, icon: 'car-outline' as const },
  { id: 'tecnologia', labelKey: 'home.category.technology' as TranslationKey, icon: 'hardware-chip-outline' as const },
  { id: 'casa', labelKey: 'home.category.home' as TranslationKey, icon: 'home-outline' as const },
  { id: 'colecionaveis', labelKey: 'home.category.collectibles' as TranslationKey, icon: 'diamond-outline' as const },
  { id: 'mais', labelKey: 'home.category.more' as TranslationKey, icon: 'ellipsis-horizontal' as const },
];

const DESTAQUES: {
  id: string;
  category: string;
  title: string;
  detail: string;
  badge: string;
  badgeType: 'popular' | 'new' | 'ending';
  price: string;
  timer: string;
  progress: number;
  watching: string;
  img: string;
  seller?: AuctionSellerSnippet;
}[] = [
  {
    id: '1',
    category: 'eletronicos',
    title: 'iPhone 16 Pro Max',
    detail: '256GB',
    badge: 'Popular',
    badgeType: 'popular' as const,
    price: 'R$ 7.499,00',
    timer: '03:17:28',
    progress: 0.72,
    watching: '234',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=400',
    seller: { sellerId: 'v-tech', sellerName: 'Tech Store BR', sellerBadge: 'empresa_verificada' },
  },
  {
    id: '2',
    category: 'tecnologia',
    title: 'Drone DJI Mavic 3 Pro Fly',
    detail: '',
    badge: '12 lances',
    badgeType: 'lances' as const,
    price: 'R$ 5.890,00',
    timer: '01:54:28',
    progress: 0.45,
    watching: '189',
    img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=400',
  },
  {
    id: '3',
    category: 'eletronicos',
    title: 'PlayStation 5 Edição Digital',
    detail: '',
    badge: '8 lances',
    badgeType: 'lances' as const,
    price: 'R$ 3.250,00',
    timer: '00:44:28',
    progress: 0.18,
    watching: '156',
    img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=400',
  },
  {
    id: '4',
    category: 'eletronicos',
    title: 'MacBook Pro M3 Max',
    detail: '512GB',
    badge: '6 lances',
    badgeType: 'lances' as const,
    price: 'R$ 8.450,00',
    timer: '00:37:12',
    progress: 0.62,
    watching: '312',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400',
  },
];

const ARREMATE_TAB_IDS = ['all', 'inProgress', 'won', 'cancelled'] as const;
type ArremateTabId = (typeof ARREMATE_TAB_IDS)[number];

const ARREMATE_TAB_KEYS: Record<ArremateTabId, TranslationKey> = {
  all: 'home.arrematesTab.all',
  inProgress: 'home.arrematesTab.inProgress',
  won: 'home.arrematesTab.won',
  cancelled: 'home.arrematesTab.cancelled',
};

const ARREMATES = [
  {
    id: '1',
    lotId: 'lot-1',
    auctionId: 'auction-mbp',
    orderId: '11111111-1111-1111-1111-111111111101',
    tab: 'won' as const,
    title: 'MacBook Pro M2 512GB',
    meta: 'Arrematado em 12/03/2026',
    status: 'Arrematado',
    statusColor: '#10B981',
    price: 'R$ 8.450,00',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=200',
  },
  {
    id: '2',
    lotId: 'lot-2',
    auctionId: 'auction-monitor',
    orderId: '11111111-1111-1111-1111-111111111102',
    tab: 'inProgress' as const,
    title: 'Monitor Gamer UltraWide 34"',
    meta: 'Em andamento · 2h restantes',
    status: 'Em andamento',
    statusColor: '#F59E0B',
    price: 'R$ 1.850,00',
    img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200',
  },
  {
    id: '3',
    lotId: 'lot-3',
    auctionId: 'auction-watch',
    orderId: '11111111-1111-1111-1111-111111111103',
    tab: 'won' as const,
    title: 'Apple Watch Ultra 2',
    meta: 'Arrematado em 08/03/2026',
    status: 'Arrematado',
    statusColor: '#10B981',
    price: 'R$ 2.890,00',
    img: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?q=80&w=200',
  },
];

const NOTIF_VISUAL: Record<
  UserNotification['kind'],
  { emoji: string; accent: string; bg: string; border: string }
> = {
  outbid: { emoji: '🔴', accent: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  listing_bid: { emoji: '🟢', accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  payment_confirmed: {
    emoji: '💰',
    accent: appColors.accent,
    bg: '#F4F0FF',
    border: '#E9E0FF',
  },
};

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isWideWeb, auctionCardWidth, windowWidth } = useWebLayout();
  const cardW = isWideWeb ? auctionCardWidth : defaultCardWidth(windowWidth);
  const [category, setCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [arrematesTab, setArrematesTab] = useState<ArremateTabId>('all');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [notifVisible, setNotifVisible] = useState(false);
  const { avatarUri } = useProfile();
  const { itens: notificacoes, naoLidas, recarregar: recarregarNotificacoes } =
    useUserNotifications();

  const categories = useMemo(
    () => CATEGORY_DEFS.map((cat) => ({ ...cat, label: t(cat.labelKey) })),
    [t],
  );

  const arrematesFiltrados = useMemo(() => {
    if (arrematesTab === 'all') return ARREMATES;
    return ARREMATES.filter((item) => item.tab === arrematesTab);
  }, [arrematesTab]);

  const destaquesFiltrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DESTAQUES.filter((item) => {
      if (category !== 'todos' && category !== 'mais' && item.category !== category) {
        return false;
      }
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
    });
  }, [category, searchQuery]);

  const carregarDadosHome = useCallback(async () => {
    const [favs, wallet] = await Promise.all([
      favoriteIdsSet(),
      getWalletSummary(),
    ]);
    setFavoriteIds(favs);
    setBalanceCents(wallet.totalCents);
  }, []);

  const abrirArremate = useCallback(
    (item: (typeof ARREMATES)[number]) => {
      if (item.tab === 'inProgress') {
        router.push(`/auction/${item.auctionId}`);
        return;
      }
      router.push({
        pathname: '/my-bids',
        params: { expand: item.lotId },
      });
    },
    [router],
  );

  useEffect(() => {
    recarregarNotificacoes();
  }, [recarregarNotificacoes]);

  useFocusEffect(
    useCallback(() => {
      void carregarDadosHome();
    }, [carregarDadosHome]),
  );

  async function toggleFavorite(item: (typeof DESTAQUES)[number]) {
    const isFav = await toggleFavoriteAuction({
      id: item.id,
      title: item.title,
      price: item.price,
      timer: item.timer,
      img: item.img,
    });
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  }

  function onCategoryPress(catId: string) {
    if (catId === 'mais') {
      router.push('/(tabs)/leiloes');
      return;
    }
    setCategory(catId);
  }

  function renderAuctionCard(item: (typeof DESTAQUES)[number]) {
    const isFavorite = favoriteIds.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.auctionCard, { width: cardW }, isWideWeb && styles.auctionCardWide]}
        onPress={() => router.push(`/auction/${item.id}`)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Ver leilão ${item.title}`}>
        <View style={[styles.cardImgWrap, isWideWeb && styles.cardImgWrapWide]}>
          <Image source={{ uri: item.img }} style={[styles.cardImg, isWideWeb && styles.cardImgWide]} />
          <View style={styles.timerBadge}>
            <Text style={[styles.timerBadgeText, isWideWeb && styles.timerBadgeTextWide]}>
              {formatarTimerCurto(item.timer)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => void toggleFavorite(item)}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            accessibilityState={{ selected: isFavorite }}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={isWideWeb ? 16 : 13}
              color={isFavorite ? '#EF4444' : '#FFF'}
            />
          </TouchableOpacity>
        </View>
        <View style={[styles.cardBody, isWideWeb && styles.cardBodyWide]}>
          <Text style={[styles.cardTitle, isWideWeb && styles.cardTitleWide]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.seller ? (
            <AuctionSellerLine seller={item.seller} compact linkToProfile={false} />
          ) : null}
          <Text style={[styles.cardPrice, isWideWeb && styles.cardPriceWide]}>{item.price}</Text>
          <View style={styles.watchingRow}>
            <Ionicons name="eye-outline" size={isWideWeb ? 12 : 10} color={C.textMuted} />
            <Text style={[styles.watchingText, isWideWeb && styles.watchingTextWide]}>
              {item.watching}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, isWideWeb && styles.headerWide, { paddingTop: isWideWeb ? 16 : insets.top + 4 }]}>
        <View style={styles.headerTop}>
          {!isWideWeb ? (
            <View style={styles.logoRow}>
              <LevouLogo size="header" />
            </View>
          ) : (
            <View style={styles.logoRow}>
              <Text style={styles.webGreeting}>Olá, bem-vindo de volta</Text>
            </View>
          )}

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setNotifVisible(true);
                recarregarNotificacoes();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Notificações${naoLidas > 0 ? `, ${naoLidas} novas` : ''}`}>
              <Ionicons name="notifications-outline" size={22} color={C.textPrimary} />
              {naoLidas > 0 ? (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {naoLidas > 9 ? '9+' : String(naoLidas)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.65}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Ir para a aba Mais">
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={C.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ver todos os leilões"
            onPress={() => router.push('/(tabs)/leiloes')}>
            <Ionicons name="options-outline" size={20} color={C.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* CARROSSEL PREMIUM — lista dinâmica do admin (autoplay 3,5s) */}
        <HomeFeaturedHero />

        {/* CARTEIRA */}
        <View style={[styles.walletCardWrap, isWideWeb && styles.walletCardWrapWide]}>
          <View style={[styles.walletCard, isWideWeb && styles.walletCardWide]}>
            <View style={styles.walletMain}>
              <View style={styles.walletTitleRow}>
                <View style={styles.walletIconWrap}>
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.walletLabel}>{t('home.myWallet')}</Text>
                <TouchableOpacity onPress={() => setBalanceVisible((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color="rgba(255,255,255,0.75)"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.balance}>
                {balanceVisible
                  ? balanceCents != null
                    ? formatBRL(balanceCents)
                    : '—'
                  : '••••••••'}
              </Text>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity
                style={styles.walletActionBtn}
                onPress={() => router.push('/(tabs)/wallet')}
                accessibilityRole="button"
                accessibilityLabel={t('home.addBalance')}>
                <View style={styles.walletActionIcon}>
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.walletActionLabel}>{t('home.addBalance')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.walletActionBtn}
                onPress={() => router.push('/(tabs)/wallet')}
                accessibilityRole="button"
                accessibilityLabel={t('home.withdraw')}>
                <View style={styles.walletActionIcon}>
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.walletActionLabel}>{t('home.withdraw')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CATEGORIAS — 7 itens na largura total, sem scroll horizontal */}
        <View style={styles.catList}>
          {categories.map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.catItem}
                onPress={() => onCategoryPress(cat.id)}
                activeOpacity={0.8}>
                <View style={[styles.catIconWrap, active && styles.catIconWrapActive]}>
                  <Ionicons
                    name={cat.icon}
                    size={17}
                    color={active ? '#FFF' : C.accent}
                  />
                </View>
                <Text
                  style={[styles.catLabel, active && styles.catLabelActive]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ENCERRANDO HOJE */}
        <SectionHeader title={t('home.endingToday')} />
        {destaquesFiltrados.length === 0 ? (
          <View style={styles.destaquesEmptyWrap}>
            <EmptyState
              icon="search-outline"
              title="Nenhum leilão encontrado"
              description="Tente outra categoria ou busque por outro termo."
              actionLabel="Ver leilões ao vivo"
              onAction={() => router.push('/(tabs)/leiloes')}
            />
          </View>
        ) : isWideWeb ? (
          <View style={styles.destaquesGrid}>{destaquesFiltrados.map(renderAuctionCard)}</View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}>
            {destaquesFiltrados.map(renderAuctionCard)}
          </ScrollView>
        )}

        {/* MEUS ARREMATES — cards no estilo “mais disputados” */}
        <SectionHeader
          title={t('home.myPurchases')}
          onPressSeeAll={() => router.push('/my-bids')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}>
          {ARREMATE_TAB_IDS.map((tabId) => {
            const active = arrematesTab === tabId;
            return (
              <TouchableOpacity
                key={tabId}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setArrematesTab(tabId)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t(ARREMATE_TAB_KEYS[tabId])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={[styles.arrematesList, isWideWeb && styles.arrematesListWide]}>
          {arrematesFiltrados.length === 0 ? (
            <View style={styles.arrematesEmpty}>
              <Text style={styles.arrematesEmptyText}>{t('home.arrematesEmpty')}</Text>
            </View>
          ) : (
            arrematesFiltrados.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.disputedCard, isWideWeb && styles.disputedCardWide]}
                activeOpacity={0.7}
                onPress={() => abrirArremate(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}>
                <Image source={{ uri: item.img }} style={styles.disputedImg} />
                <View style={styles.disputedBody}>
                  <Text style={styles.disputedTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.disputedPrice}>{item.price}</Text>
                  <View style={styles.avatarStack}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[styles.avatarDot, { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}
                      />
                    ))}
                    <Text style={styles.avatarMore}>+{index + 12}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${55 + index * 15}%` }]} />
                  </View>
                  <View style={styles.disputedFooter}>
                    <Text style={styles.disputedMeta}>{item.meta}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
                      <Text style={[styles.statusText, { color: item.statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <NotificationsModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        bottomInset={insets.bottom}
        itens={notificacoes}
        onAbrir={() => {
          setNotifVisible(false);
          recarregarNotificacoes();
        }}
        onRefresh={recarregarNotificacoes}
      />
    </View>
  );
}

function NotificationsModal({
  visible,
  onClose,
  bottomInset,
  itens,
  onAbrir,
  onRefresh,
}: {
  visible: boolean;
  onClose: () => void;
  bottomInset: number;
  itens: UserNotification[];
  onAbrir: () => void;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const naoLidas = itens.filter((n) => n.unread).length;

  const abrirItem = useCallback(
    async (item: UserNotification) => {
      await marcarNotificacaoComoLida(item.id);
      onRefresh();
      onAbrir();
      if (item.kind === 'payment_confirmed' && item.orderId) {
        router.push(`/order/${item.orderId}`);
        return;
      }
      if (item.auctionId) {
        router.push(`/auction/${item.auctionId}`);
      }
    },
    [onAbrir, onRefresh, router],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.notifModalRoot} onPress={onClose} accessibilityLabel="Fechar notificações">
        <Pressable
          style={[styles.notifSheet, { paddingBottom: bottomInset + 16 }]}
          onPress={(e) => e.stopPropagation()}>
        <View style={styles.notifHandle} />

        <View style={styles.notifHeader}>
          <View style={styles.notifHeaderLeft}>
            <View style={styles.notifHeaderIcon}>
              <Ionicons name="notifications" size={18} color={C.accent} />
            </View>
            <View>
              <Text style={styles.notifHeaderTitle}>Notificações</Text>
              <Text style={styles.notifHeaderSub}>
                {naoLidas > 0
                  ? `${naoLidas} nova${naoLidas === 1 ? '' : 's'} mensagem${naoLidas === 1 ? '' : 'ns'}`
                  : 'Tudo em dia'}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.notifCloseBtn}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={C.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notifList}
          bounces={false}>
          {itens.length === 0 ? (
            <Text style={styles.notifEmpty}>
              Nenhuma atividade ainda. Dê lances, venda itens ou confirme pagamentos.
            </Text>
          ) : (
            itens.map((item) => {
              const visual = NOTIF_VISUAL[item.kind];
              const meta = KIND_META[item.kind];
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.notifCard,
                    { backgroundColor: visual.bg, borderColor: visual.border },
                    item.unread && styles.notifCardUnread,
                  ]}
                  accessibilityRole="button"
                  onPress={() => abrirItem(item)}>
                  <Text style={styles.notifEmoji}>{visual.emoji}</Text>
                  <View style={styles.notifCardBody}>
                    <View style={styles.notifCardTop}>
                      <Text style={styles.notifCardTitle}>{meta.title}</Text>
                      <Text style={styles.notifCardTime}>
                        {formatarTempoNotificacao(item.createdAtMs)}
                      </Text>
                    </View>
                    <Text style={styles.notifCardMessage}>{item.description}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable
          style={styles.notifDismissBtn}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button">
          <Text style={styles.notifDismissText}>Ver todas</Text>
        </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionHeader({
  title,
  onPressSeeAll,
}: {
  title: string;
  onPressSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPressSeeAll ? (
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={onPressSeeAll}
          accessibilityRole="button">
          <Text style={styles.seeAll}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={12} color={C.accent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const C = {
  accent: appColors.accent,
  bg: appColors.screen,
  white: appColors.surface,
  textPrimary: appColors.textPrimary,
  textMuted: appColors.textMuted,
  textSecondary: appColors.textSecondary,
  border: appColors.border,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerWide: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  webGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary, padding: 0 },
  iconBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: C.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.white,
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  avatarBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB' },

  walletCardWrap: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  walletCardWrapWide: {
    marginHorizontal: 28,
    marginTop: 20,
  },
  walletCard: {
    backgroundColor: C.accent,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #5B21B6 100%)',
        } as object)
      : {}),
  },
  walletCardWide: {
    padding: 22,
    borderRadius: 22,
  },
  walletMain: { flex: 1 },
  walletTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  walletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  balance: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  walletActions: { flexDirection: 'row', gap: 12, marginLeft: 12 },
  walletActionBtn: {
    alignItems: 'center',
    width: 56,
  },
  walletActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActionLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },

  catList: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 1,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  catIconWrapActive: { backgroundColor: C.accent },
  catLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 11,
    width: '100%',
  },
  catLabelActive: { color: C.accent, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.accent },

  cardList: { paddingHorizontal: ENDING_PAD, gap: ENDING_GAP, paddingBottom: 4 },
  destaquesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ENDING_GAP,
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  destaquesEmptyWrap: { width: '100%', paddingHorizontal: 28, paddingVertical: 8 },
  auctionCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  auctionCardWide: {
    borderRadius: 18,
  },
  cardImgWrap: { position: 'relative', backgroundColor: '#111827' },
  cardImgWrapWide: { borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
  cardImg: { width: '100%', height: 72, resizeMode: 'cover' },
  cardImgWide: { height: 120 },
  timerBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timerBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  timerBadgeTextWide: { fontSize: 10 },
  heartBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardBody: { padding: 8, paddingTop: 6 },
  cardBodyWide: { padding: 12, paddingTop: 10 },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textPrimary,
    lineHeight: 13,
    minHeight: 26,
  },
  cardTitleWide: { fontSize: 14, lineHeight: 18, minHeight: 36 },
  cardPrice: { fontSize: 11, fontWeight: '800', color: C.accent, marginTop: 4 },
  cardPriceWide: { fontSize: 15, marginTop: 6 },
  watchingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  watchingText: { fontSize: 9, fontWeight: '600', color: C.textMuted },
  watchingTextWide: { fontSize: 11 },

  tabList: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabPillActive: { backgroundColor: C.accent },
  tabText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  tabTextActive: { color: '#FFF' },

  arrematesList: { marginHorizontal: 20, gap: 12, paddingBottom: 8 },
  arrematesListWide: {
    marginHorizontal: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  arrematesEmpty: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: 'center',
  },
  arrematesEmptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  disputedCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  disputedCardWide: {
    ...(Platform.OS === 'web' ? ({ width: 'calc(50% - 7px)' } as object) : { flex: 1 }),
  },
  disputedImg: { width: 88, height: 88, borderRadius: 14, backgroundColor: '#F3F4F6' },
  disputedBody: { flex: 1 },
  disputedTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, lineHeight: 18 },
  disputedPrice: { fontSize: 16, fontWeight: '800', color: C.accent, marginTop: 4 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C4B5FD',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarMore: { fontSize: 11, fontWeight: '700', color: C.textMuted, marginLeft: 6 },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2 },
  disputedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  disputedMeta: { fontSize: 10, color: C.textMuted, flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  footerHero: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    height: 252,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
  },
  footerHeroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  footerHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  footerHeroTextContainer: { position: 'absolute', bottom: 18, left: 16, right: 16 },
  footerHeroSubtitle: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerHeroTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
  footerHeroIndicators: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 5 },
  footerHeroIndicator: { height: 5, borderRadius: 3 },
  footerHeroIndicatorActive: { width: 20, backgroundColor: '#FFF' },
  footerHeroIndicatorInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.45)' },

  notifModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 22, 37, 0.45)',
  },
  notifSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
    zIndex: 2,
  },
  notifHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notifHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  notifHeaderSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  notifCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifList: { gap: 10, paddingBottom: 8 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  notifEmoji: { fontSize: 20, marginTop: 2 },
  notifCardBody: { flex: 1 },
  notifCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  notifCardTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, flex: 1 },
  notifCardTime: { fontSize: 11, color: C.textMuted },
  notifCardMessage: { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  notifCardUnread: { borderWidth: 1.5 },
  notifEmpty: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  notifDismissBtn: {
    backgroundColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  notifDismissText: { fontSize: 15, fontWeight: '700', color: C.textSecondary },
});
