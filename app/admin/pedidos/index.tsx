import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { filtrarPedidosMock, PEDIDOS_ADMIN_MOCK } from '@/src/admin/pedidosMock';
import type { AdminPedidoResumo, FiltroPedidoAdmin } from '@/src/admin/types';
import { STATUS_PEDIDO_LABEL } from '@/src/admin/types';
import { formatBRL } from '@/src/lib/bids';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { buscarPedidosAdmin, contarPedidosPorCategoria } from '@/src/services/adminPedidos';
import { formatarDataPedidoAdmin } from '@/src/admin/pedidosMock';
import { AdminLeilaoPendenciaBadge } from '../_components/AdminLeilaoPendenciaBadge';
import { adminC, adminStyles } from '../_components/adminStyles';

const FILTROS: { id: FiltroPedidoAdmin; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'pagamento_pendente', label: 'Pagamento pendente', icone: 'card-outline' },
  { id: 'entrega_pendente', label: 'Entrega pendente', icone: 'cube-outline' },
  { id: 'em_envio', label: 'Em envio', icone: 'airplane-outline' },
  { id: 'todos', label: 'Todos', icone: 'layers-outline' },
];

const STATUS_CORES: Record<string, { bg: string; text: string }> = {
  pendente_pagamento: { bg: '#422006', text: '#FCD34D' },
  pago: { bg: '#1E3A5F', text: '#93C5FD' },
  em_envio: { bg: '#312E81', text: '#C4B5FD' },
  aguardando_confirmacao: { bg: '#422006', text: '#FDE68A' },
  finalizado: { bg: '#064E3B', text: '#6EE7B7' },
  em_disputa: { bg: '#450A0A', text: '#FCA5A5' },
  estornado: { bg: '#374151', text: '#D1D5DB' },
};

function StatusBadge({ status }: { status: AdminPedidoResumo['status'] }) {
  const cores = STATUS_CORES[status] ?? STATUS_CORES.pendente_pagamento;
  return (
    <View style={[styles.badge, { backgroundColor: cores.bg }]}>
      <Text style={[styles.badgeText, { color: cores.text }]}>{STATUS_PEDIDO_LABEL[status]}</Text>
    </View>
  );
}

export default function AdminPedidosScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtro, setFiltro] = useState<FiltroPedidoAdmin>('pagamento_pendente');
  const [pedidos, setPedidos] = useState<AdminPedidoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 280);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await buscarPedidosAdmin(buscaDebounced, filtro);
      setPedidos(dados);
    } finally {
      setCarregando(false);
    }
  }, [buscaDebounced, filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const contagemBase = useMemo(() => {
    const base =
      pedidos.length > 0
        ? pedidos
        : filtrarPedidosMock(PEDIDOS_ADMIN_MOCK, '', 'todos');
    return contarPedidosPorCategoria(base);
  }, [pedidos]);

  if (!temPermissao('suporte')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={adminStyles.pageTitle}>Suporte & Pedidos</Text>
          <Text style={adminStyles.pageSubtitle}>
            {contagemBase.pagamento_pendente} pagamento · {contagemBase.entrega_pendente} entrega
          </Text>
        </View>
        <View style={styles.heroActions}>
          <Pressable style={styles.refreshBtn} onPress={carregar}>
            <Ionicons name="refresh-outline" size={16} color="#C4B5FD" />
            <Text style={styles.refreshText}>Atualizar</Text>
          </Pressable>
          <Pressable
            style={styles.mediacaoBtn}
            onPress={() => router.push('/admin/disputas' as never)}>
            <Ionicons name="scale-outline" size={16} color="#FCA5A5" />
            <Text style={styles.mediacaoText}>Sala de mediação</Text>
          </Pressable>
        </View>
      </View>

      {!isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Modo demonstração: dados mock locais. Conecte o Supabase e aplique a migration 010 para
            consultar `orders` e `auction_invoices` em produção.
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.searchCard,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(31,41,55,0.85) 0%, rgba(17,24,39,0.95) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              } as object)
            : null,
        ]}>
        <Ionicons name="search" size={22} color={adminC.accentBright} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código (#LC-45821), nome do comprador ou CPF…"
          placeholderTextColor={adminC.textMuted}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {busca.length > 0 ? (
          <Pressable onPress={() => setBusca('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={adminC.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {FILTROS.map((tab) => {
          const active = filtro === tab.id;
          const count =
            tab.id === 'todos'
              ? contagemBase.todos
              : contagemBase[tab.id];
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFiltro(tab.id)}>
              <Ionicons
                name={tab.icone}
                size={15}
                color={active ? '#FFF' : adminC.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          adminStyles.card,
          styles.listCard,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(31,41,55,0.75) 0%, rgba(17,24,39,0.92) 100%)',
              } as object)
            : null,
        ]}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {carregando ? 'Buscando pedidos…' : `${pedidos.length} pedido(s) encontrado(s)`}
          </Text>
          {carregando ? <ActivityIndicator color={adminC.accent} size="small" /> : null}
        </View>

        {pedidos.length === 0 && !carregando ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={40} color={adminC.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum pedido neste filtro</Text>
            <Text style={styles.emptyHint}>Tente outro termo de busca ou aba de status.</Text>
          </View>
        ) : (
          pedidos.map((pedido) => (
            <Pressable
              key={pedido.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/admin/pedidos/${encodeURIComponent(pedido.id)}` as never)}>
              <Image source={{ uri: pedido.imagemLeilao }} style={styles.thumb} />
              <View style={styles.rowMain}>
                <View style={styles.rowTop}>
                  <Text style={styles.codigo}>{pedido.codigo}</Text>
                  <StatusBadge status={pedido.status} />
                  {pedido.pendencia ? (
                    <AdminLeilaoPendenciaBadge pendencia={pedido.pendencia} compact />
                  ) : null}
                </View>
                <Text style={styles.titulo} numberOfLines={1}>
                  {pedido.tituloLeilao}
                </Text>
                <Text style={styles.comprador} numberOfLines={1}>
                  {pedido.comprador.nome}
                  {pedido.comprador.cpf ? ` · ${pedido.comprador.cpf}` : ''}
                </Text>
                <View style={styles.rowBottom}>
                  <Text style={styles.valor}>{formatBRL(pedido.valorCents)}</Text>
                  <Text style={styles.data}>{formatarDataPedidoAdmin(pedido.criadoEm)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={adminC.textMuted} />
            </Pressable>
          ))
        )}
      </View>
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
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
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
  mediacaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  mediacaoText: { color: '#FCA5A5', fontWeight: '700', fontSize: 13 },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    marginBottom: 18,
    backgroundColor: adminC.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: adminC.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: 'rgba(17,24,39,0.5)',
  },
  tabActive: {
    backgroundColor: adminC.accent,
    borderColor: adminC.accent,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: adminC.textSecondary },
  tabLabelActive: { color: '#FFF', fontWeight: '700' },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabCountText: { fontSize: 11, fontWeight: '800', color: adminC.textMuted },
  tabCountTextActive: { color: '#FFF' },
  listCard: { padding: 0, overflow: 'hidden' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: adminC.borderStrong,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: adminC.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowPressed: { backgroundColor: 'rgba(139, 92, 246, 0.08)' },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: adminC.border,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  codigo: { fontSize: 13, fontWeight: '800', color: '#93C5FD', fontFamily: 'monospace' },
  titulo: { fontSize: 15, fontWeight: '700', color: adminC.textPrimary },
  comprador: { fontSize: 13, color: adminC.textMuted },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  valor: { fontSize: 14, fontWeight: '800', color: '#6EE7B7' },
  data: { fontSize: 12, color: adminC.textMuted, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: adminC.textPrimary, marginTop: 8 },
  emptyHint: { fontSize: 13, color: adminC.textMuted },
});
