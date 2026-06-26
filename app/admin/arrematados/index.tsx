import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { formatBRL } from '@/src/lib/bids';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import {
  listarLotesArrematados,
  type AdminLoteArrematadoLinha,
} from '@/src/services/adminArrematados';
import {
  pendenciaEhArrematePendente,
  pendenciaEhConcluido,
  pendenciaEhEntrega,
  pendenciaEhPagamento,
} from '@/src/lib/adminLeilaoFluxo';
import { AdminLeilaoPendenciaBadge } from '../_components/AdminLeilaoPendenciaBadge';
import { AdminVendorPreviewModal } from '../_components/AdminVendorPreviewModal';
import { AdminWinnerPreviewModal } from '../_components/AdminWinnerPreviewModal';
import { adminC, adminStyles, adminTheme } from '../_components/adminStyles';

type FiltroArrematado =
  | 'todos'
  | 'pendentes'
  | 'pagamento_pendente'
  | 'entrega_pendente'
  | 'concluido';

type GanhadorPreview = {
  compradorId: string;
  orderId: string;
  handle: string;
};

export default function AdminArrematadosScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const [lotes, setLotes] = useState<AdminLoteArrematadoLinha[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroArrematado>('pendentes');
  const [carregando, setCarregando] = useState(true);
  const [vendedorPreviewId, setVendedorPreviewId] = useState<string | null>(null);
  const [ganhadorPreview, setGanhadorPreview] = useState<GanhadorPreview | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await listarLotesArrematados();
      setLotes(dados);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pendentes = useMemo(
    () => lotes.filter((l) => l.pendencia && pendenciaEhArrematePendente(l.pendencia)).length,
    [lotes],
  );

  const pagamentoPendente = useMemo(
    () => lotes.filter((l) => l.pendencia && pendenciaEhPagamento(l.pendencia)).length,
    [lotes],
  );

  const entregaPendente = useMemo(
    () => lotes.filter((l) => l.pendencia && pendenciaEhEntrega(l.pendencia)).length,
    [lotes],
  );

  const concluidos = useMemo(
    () => lotes.filter((l) => l.pendencia && pendenciaEhConcluido(l.pendencia)).length,
    [lotes],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = lotes;
    if (filtro === 'pendentes') {
      lista = lista.filter((l) => l.pendencia && pendenciaEhArrematePendente(l.pendencia));
    }
    if (filtro === 'pagamento_pendente') {
      lista = lista.filter((l) => l.pendencia && pendenciaEhPagamento(l.pendencia));
    }
    if (filtro === 'entrega_pendente') {
      lista = lista.filter((l) => l.pendencia && pendenciaEhEntrega(l.pendencia));
    }
    if (filtro === 'concluido') {
      lista = lista.filter((l) => l.pendencia && pendenciaEhConcluido(l.pendencia));
    }
    if (!termo) return lista;
    return lista.filter(
      (l) =>
        l.titulo.toLowerCase().includes(termo) ||
        l.ganhador.toLowerCase().includes(termo) ||
        l.vendedor.toLowerCase().includes(termo) ||
        l.loteId.toLowerCase().includes(termo),
    );
  }, [lotes, busca, filtro]);

  if (!temPermissao('leiloes')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={adminStyles.pageTitle}>Lotes Arrematados</Text>
          <Text style={adminStyles.pageSubtitle}>
            {pendentes} pendentes · {concluidos} concluídos · clique no lote para acompanhar
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={carregar}>
          <Ionicons name="refresh-outline" size={16} color="#C4B5FD" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>

      {!isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Modo demonstração com lotes mock. Conecte o Supabase para listar arremates reais via
            tabela orders.
          </Text>
        </View>
      ) : null}

      <View style={styles.filtrosRow}>
        {(
          [
            { id: 'pendentes' as const, label: 'Pendentes' },
            { id: 'pagamento_pendente' as const, label: 'Pagamento pendente' },
            { id: 'entrega_pendente' as const, label: 'Entrega pendente' },
            { id: 'concluido' as const, label: 'Concluído' },
            { id: 'todos' as const, label: 'Todos' },
          ] as const
        ).map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filtroChip, filtro === f.id && styles.filtroChipAtivo]}
            onPress={() => setFiltro(f.id)}>
            <Text style={[styles.filtroText, filtro === f.id && styles.filtroTextAtivo]}>
              {f.label}
              {f.id === 'pendentes' && pendentes > 0 ? ` (${pendentes})` : ''}
              {f.id === 'pagamento_pendente' && pagamentoPendente > 0
                ? ` (${pagamentoPendente})`
                : ''}
              {f.id === 'entrega_pendente' && entregaPendente > 0 ? ` (${entregaPendente})` : ''}
              {f.id === 'concluido' && concluidos > 0 ? ` (${concluidos})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.searchCard,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(31,41,55,0.85) 0%, rgba(17,24,39,0.95) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              } as object)
            : null,
        ]}>
        <Ionicons name="search" size={20} color={adminC.accentBright} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar lote, ganhador ou vendedor…"
          placeholderTextColor={adminC.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <View
        style={[
          styles.tableCard,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(31,41,55,0.8) 0%, rgba(17,24,39,0.95) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              } as object)
            : null,
        ]}>
        <View style={styles.tableHeader}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="trophy-outline" size={20} color={adminC.accent} />
            <Text style={styles.tableTitle}>
              {carregando ? 'Carregando…' : `${filtrados.length} lote(s) arrematado(s)`}
            </Text>
          </View>
          {carregando ? <ActivityIndicator color={adminC.accent} size="small" /> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colFoto]}> </Text>
              <Text style={[styles.th, styles.colLote]}>Lote</Text>
              <Text style={[styles.th, styles.colValor]}>Valor final</Text>
              <Text style={[styles.th, styles.colGanhador]}>Ganhador</Text>
              <Text style={[styles.th, styles.colVendedor]}>Vendedor</Text>
              <Text style={[styles.th, styles.colPendencia]}>Pendência</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
            </View>

            {filtrados.length === 0 && !carregando ? (
              <View style={styles.empty}>
                <Ionicons name="trophy-outline" size={40} color={adminC.textMuted} />
                <Text style={styles.emptyTitle}>
                  {filtro === 'pendentes'
                    ? 'Nenhum arremate com pendência.'
                    : filtro === 'pagamento_pendente'
                      ? 'Nenhum aguardando pagamento.'
                      : filtro === 'entrega_pendente'
                        ? 'Nenhum com envio ou entrega pendente.'
                        : filtro === 'concluido'
                          ? 'Nenhum lote concluído ainda.'
                          : 'Nenhum lote encontrado'}
                </Text>
              </View>
            ) : (
              filtrados.map((lote, index) => (
                <View
                  key={lote.id}
                  style={[styles.row, index < filtrados.length - 1 && styles.rowBorder]}>
                  <Pressable
                    style={styles.colFoto}
                    onPress={() => router.push(`/admin/arrematados/${lote.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver lote ${lote.titulo}`}>
                    <Image source={{ uri: lote.imagemUrl }} style={styles.thumb} />
                  </Pressable>
                  <Pressable
                    style={[styles.colLote, styles.loteCell, styles.loteLinkCell]}
                    onPress={() => router.push(`/admin/arrematados/${lote.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver lote ${lote.titulo}`}>
                    <Text style={styles.loteNome} numberOfLines={2}>
                      {lote.titulo}
                    </Text>
                    <Text style={styles.loteId}>#{lote.loteId}</Text>
                    {lote.alertaAdm ? (
                      <Text
                        style={[
                          styles.alerta,
                          lote.alertaAdm.severidade === 'critico' && styles.alertaCritico,
                        ]}
                        numberOfLines={1}>
                        {lote.alertaAdm.mensagem}
                      </Text>
                    ) : null}
                  </Pressable>
                  <Text style={[styles.td, styles.colValor, styles.valorText]}>
                    {lote.valorFinalLabel || formatBRL(lote.valorFinalCents)}
                  </Text>
                  <Pressable
                    style={[styles.colGanhador, styles.ganhadorCell]}
                    onPress={() =>
                      setGanhadorPreview({
                        compradorId: lote.compradorId,
                        orderId: lote.id,
                        handle: lote.ganhador,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ganhador ${lote.ganhador}`}>
                    <Ionicons name="person-outline" size={14} color="#C4B5FD" />
                    <Text style={[styles.td, styles.ganhadorText]} numberOfLines={2}>
                      {lote.ganhador}
                    </Text>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color={adminC.textMuted} />
                  </Pressable>
                  <Pressable
                    style={[styles.colVendedor, styles.vendedorCell]}
                    onPress={() => setVendedorPreviewId(lote.vendedorId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver dados de ${lote.vendedor}`}>
                    <Ionicons name="storefront-outline" size={14} color={adminC.accentBright} />
                    <Text style={styles.vendedorLink} numberOfLines={1}>
                      {lote.vendedor}
                    </Text>
                    <Ionicons name="information-circle-outline" size={13} color={adminC.textMuted} />
                  </Pressable>
                  <View style={styles.colPendencia}>
                    {lote.pendencia ? (
                      <AdminLeilaoPendenciaBadge pendencia={lote.pendencia} compact />
                    ) : (
                      <Text style={styles.td}>—</Text>
                    )}
                  </View>
                  <View style={styles.colStatus}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{lote.fluxoLabel}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <AdminVendorPreviewModal
        visible={vendedorPreviewId != null}
        vendorId={vendedorPreviewId}
        onClose={() => setVendedorPreviewId(null)}
      />

      <AdminWinnerPreviewModal
        visible={ganhadorPreview != null}
        compradorId={ganhadorPreview?.compradorId ?? null}
        orderId={ganhadorPreview?.orderId ?? null}
        handleFallback={ganhadorPreview?.handle ?? null}
        onClose={() => setGanhadorPreview(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 4,
  },
  heroText: { flex: 1 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  refreshText: { color: '#C4B5FD', fontWeight: '700', fontSize: 13 },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 18,
    backgroundColor: adminC.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: adminC.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminC.border,
    overflow: 'hidden',
    backgroundColor: adminC.surface,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: adminC.borderStrong,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableTitle: { fontSize: 14, fontWeight: '700', color: adminC.textSecondary },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: adminC.card,
  },
  filtroChipAtivo: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  filtroText: { fontSize: 12, fontWeight: '600', color: adminC.textMuted },
  filtroTextAtivo: { color: adminC.accentBright },
  tableWrap: { minWidth: 1060 },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(17,24,39,0.6)',
    borderBottomWidth: 1,
    borderBottomColor: adminC.borderStrong,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  colFoto: { width: 52 },
  colLote: { width: 220 },
  colValor: { width: 130 },
  colGanhador: { width: 170 },
  colVendedor: { width: 160 },
  colPendencia: { width: 150 },
  colStatus: { width: 120 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: adminC.border,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  loteCell: { gap: 3 },
  loteLinkCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: 8,
  },
  loteNome: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  loteId: { fontSize: 11, color: adminC.textMuted, fontFamily: 'monospace' },
  alerta: { fontSize: 10, color: '#FCD34D', marginTop: 4, fontWeight: '600' },
  alertaCritico: { color: '#FCA5A5' },
  td: { fontSize: 13, color: adminC.textPrimary },
  valorText: { fontWeight: '800', color: '#6EE7B7' },
  ganhadorCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  ganhadorText: { flex: 1, color: '#C4B5FD', fontWeight: '600' },
  vendedorCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
  },
  vendedorLink: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: adminC.accentBright,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statusText: { fontSize: 10, fontWeight: '700', color: '#C4B5FD' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8, width: 920 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: adminC.textPrimary, marginTop: 8 },
});
