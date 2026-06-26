import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeiloesLiveContent } from '@/components/leiloes/LeiloesLiveContent';
import {
  TimeMachineItemModal,
  type TimeMachineHistoryItem,
} from '@/components/leiloes/TimeMachineItemModal';
import { LevouLogo } from '@/src/components/LevouLogo';
import { partitionLeiloesAuctions, type AuctionCategoryId } from '@/src/mocks/auctions';
import { useBanners } from '@/src/store/bannersContext';
import { lightColors } from '@/src/theme/lightTokens';

type LeiloesSubTab = 'live' | 'timeMachine';

const HISTORICO_ARREMATES: TimeMachineHistoryItem[] = [
  {
    id: 'h1',
    title: 'MacBook Pro M2 512GB',
    date: 'Hoje',
    price: 'FTK 1.950',
    user: '@marcos_94',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600',
    category: 'Eletrônicos',
    endedAt: '18:42',
    bidCount: 27,
    startPrice: 'FTK 1.200',
    conservation: 'Excelente',
  },
  {
    id: 'h2',
    title: 'Monitor Gamer UltraWide 34\'',
    date: 'Hoje',
    price: 'FTK 1.850',
    user: '@marta_tech',
    img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600',
    category: 'Eletrônicos',
    endedAt: '15:10',
    bidCount: 19,
    startPrice: 'FTK 1.100',
    conservation: 'Bom',
  },
  {
    id: 'h3',
    title: 'iPhone 15 Pro Max',
    date: 'Ontem',
    price: 'FTK 2.400',
    user: '@pedro_42',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=600',
    category: 'Eletrônicos',
    endedAt: '21:05',
    bidCount: 41,
    startPrice: 'FTK 1.800',
    conservation: 'Novo',
  },
  {
    id: 'h4',
    title: 'Drone DJI Mini 3 Pro',
    date: 'Ontem',
    price: 'FTK 3.100',
    user: '@lucas_fly',
    img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=600',
    category: 'Eletrônicos',
    endedAt: '12:33',
    bidCount: 22,
    startPrice: 'FTK 2.400',
    conservation: 'Excelente',
  },
  {
    id: 'h5',
    title: 'PlayStation 5 Digital',
    date: '25 Mai',
    price: 'FTK 1.600',
    user: '@gamer_vini',
    img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=600',
    category: 'Eletrônicos',
    endedAt: '19:18',
    bidCount: 33,
    startPrice: 'FTK 1.000',
    conservation: 'Bom',
  },
  {
    id: 'h6',
    title: 'Teclado Mecânico Custom',
    date: '24 Mai',
    price: 'FTK 450',
    user: '@setup_minimal',
    img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600',
    category: 'Produtos gerais',
    endedAt: '10:55',
    bidCount: 14,
    startPrice: 'FTK 180',
    conservation: 'Marcas de uso',
  },
];

const DATAS_HISTORICO = ['Hoje', 'Ontem', '25 Mai', '24 Mai'] as const;

export default function LeiloesTab() {
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState<LeiloesSubTab>('live');
  const [category, setCategory] = useState<AuctionCategoryId>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [indiceCarrossel, setIndiceCarrossel] = useState(0);
  const { carrosselLeiloesAtivos, autoplayIntervalMs } = useBanners();
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<(typeof DATAS_HISTORICO)[number]>('Hoje');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<TimeMachineHistoryItem | null>(
    null,
  );

  function toggleFavorite(auctionId: string) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(auctionId)) {
        next.delete(auctionId);
      } else {
        next.add(auctionId);
      }
      return next;
    });
  }

  const auctionBuckets = useMemo(
    () => partitionLeiloesAuctions(category, searchQuery),
    [category, searchQuery],
  );

  const itensHistoricoFiltrados = useMemo(() => {
    return HISTORICO_ARREMATES.filter((item) => {
      const bateData = item.date === selectedDate;
      const bateTexto = item.title.toLowerCase().includes(historySearchQuery.toLowerCase());
      return bateData && bateTexto;
    });
  }, [selectedDate, historySearchQuery]);

  useEffect(() => {
    setIndiceCarrossel(0);
  }, [carrosselLeiloesAtivos]);

  useEffect(() => {
    if (carrosselLeiloesAtivos.length <= 1) return;
    const timer = setInterval(() => {
      setIndiceCarrossel((atual) => (atual + 1) % carrosselLeiloesAtivos.length);
    }, autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [carrosselLeiloesAtivos, carrosselLeiloesAtivos.length, autoplayIntervalMs]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <LevouLogo size="header" />
        </View>

        {currentTab === 'live' && (
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={C.textMuted} />
              <TextInput
                placeholder="Buscar leilões, produtos..."
                placeholderTextColor={C.textMuted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options-outline" size={20} color={C.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabBtn, currentTab === 'live' && styles.subTabBtnActive]}
          onPress={() => setCurrentTab('live')}
          activeOpacity={0.85}>
          <Ionicons
            name="radio-outline"
            size={16}
            color={currentTab === 'live' ? '#FFF' : C.accent}
          />
          <Text style={[styles.subTabText, currentTab === 'live' && styles.subTabTextActive]}>
            Ao Vivo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, currentTab === 'timeMachine' && styles.subTabBtnActive]}
          onPress={() => setCurrentTab('timeMachine')}
          activeOpacity={0.85}>
          <Ionicons
            name="time-outline"
            size={16}
            color={currentTab === 'timeMachine' ? '#FFF' : C.accent}
          />
          <Text
            style={[styles.subTabText, currentTab === 'timeMachine' && styles.subTabTextActive]}>
            Máquina do Tempo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {currentTab === 'live' ? (
          <LeiloesLiveContent
            category={category}
            onCategoryChange={setCategory}
            buckets={auctionBuckets}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            sponsoredSlides={carrosselLeiloesAtivos}
            sponsoredIndex={indiceCarrossel}
            onSponsoredIndexChange={setIndiceCarrossel}
          />
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>🔍 Máquina do Tempo (Histórico)</Text>
            <Text style={styles.historySubtitle}>
              Descubra por quanto os itens foram vendidos
            </Text>

            <View style={styles.historySearchBar}>
              <Ionicons name="search-outline" size={18} color={C.textMuted} />
              <TextInput
                placeholder="Digite o produto para filtrar..."
                placeholderTextColor={C.textMuted}
                style={styles.historySearchInput}
                value={historySearchQuery}
                onChangeText={setHistorySearchQuery}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarRow}>
              {DATAS_HISTORICO.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.datePill, selectedDate === date && styles.datePillActive]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.8}>
                  <Text style={[styles.dateText, selectedDate === date && styles.dateTextActive]}>
                    {date}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.historyList}>
              {itensHistoricoFiltrados.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyItemCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedHistoryItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes de ${item.title}`}>
                  <Image source={{ uri: item.img }} style={styles.historyItemImg} />
                  <View style={styles.historyItemInfo}>
                    <Text style={styles.historyItemTitle}>{item.title}</Text>
                    <Text style={styles.historyItemPrice}>
                      Leilado por: <Text style={styles.boldText}>{item.price}</Text>
                    </Text>
                    <Text style={styles.historyItemUser}>Arrematado por {item.user}</Text>
                  </View>
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldBadgeText}>ENCERRADO</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={C.textMuted}
                    style={styles.historyItemChevron}
                  />
                </TouchableOpacity>
              ))}

              {itensHistoricoFiltrados.length === 0 && (
                <Text style={styles.historyEmptyText}>
                  Nenhum registro encontrado para este termo ou data.
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <TimeMachineItemModal
        item={selectedHistoryItem}
        visible={selectedHistoryItem !== null}
        onClose={() => setSelectedHistoryItem(null)}
      />
    </View>
  );
}

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F4F0FF',
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  subTabBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  subTabText: { fontSize: 13, fontWeight: '700', color: C.accent },
  subTabTextActive: { color: '#FFF' },
  historyContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  historySubtitle: { fontSize: 12, color: C.textMuted, marginBottom: 14 },
  historySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  historySearchInput: { flex: 1, fontSize: 14, color: C.textPrimary, padding: 0 },
  calendarRow: { gap: 8, marginBottom: 14, paddingBottom: 4 },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F0FF',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  datePillActive: { backgroundColor: C.accent, borderColor: C.accent },
  dateText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  dateTextActive: { color: '#FFF' },
  historyList: { gap: 10 },
  historyItemCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  historyItemImg: { width: 55, height: 55, borderRadius: 8, marginRight: 10 },
  historyItemInfo: { flex: 1, paddingRight: 72 },
  historyItemChevron: { position: 'absolute', right: 10, bottom: 10 },
  historyItemTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  historyItemPrice: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  historyItemUser: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  boldText: { fontWeight: '700', color: '#10B981' },
  soldBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  historyEmptyText: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 13,
    marginVertical: 15,
  },
});
