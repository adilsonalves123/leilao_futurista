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
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { formatBRL } from '@/src/lib/bids';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { listarDisputasAdmin } from '@/src/services/adminDisputas';
import type { AdminDisputaResumo, DisputeStatus } from '@/src/types/adminDisputas';
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
} from '@/src/types/adminDisputas';
import { adminC, adminStyles } from '../_components/adminStyles';

type FiltroDisputa = 'todas' | DisputeStatus;

const FILTROS: { id: FiltroDisputa; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'todas', label: 'Todas', icone: 'layers-outline' },
  { id: 'aberta', label: 'Abertas', icone: 'alert-circle-outline' },
  { id: 'em_analise', label: 'Em análise', icone: 'search-outline' },
  { id: 'aguardando_resposta', label: 'Aguardando', icone: 'hourglass-outline' },
  { id: 'resolvida_comprador', label: 'Favor comprador', icone: 'person-outline' },
  { id: 'resolvida_vendedor', label: 'Favor vendedor', icone: 'storefront-outline' },
];

const STATUS_CORES: Record<string, { bg: string; text: string }> = {
  aberta: { bg: '#450A0A', text: '#FCA5A5' },
  em_analise: { bg: '#422006', text: '#FCD34D' },
  aguardando_resposta: { bg: '#312E81', text: '#C4B5FD' },
  resolvida_comprador: { bg: '#1E3A5F', text: '#93C5FD' },
  resolvida_vendedor: { bg: '#064E3B', text: '#6EE7B7' },
  cancelada: { bg: '#374151', text: '#D1D5DB' },
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function horasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
}

export default function AdminDisputasScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroDisputa>('aberta');
  const [disputas, setDisputas] = useState<AdminDisputaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarDisputasAdmin(filtro === 'todas' ? null : filtro);
      setDisputas(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar disputas.');
      setDisputas([]);
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const stats = useMemo(() => {
    const abertas = disputas.filter((d) => d.status === 'aberta').length;
    const analise = disputas.filter((d) => d.status === 'em_analise').length;
    return { abertas, analise, total: disputas.length };
  }, [disputas]);

  if (!temPermissao('suporte')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="scale-outline" size={28} color={adminC.accent} />
        </View>
        <View style={styles.heroText}>
          <Text style={adminStyles.pageTitle}>Sala de Mediação</Text>
          <Text style={adminStyles.pageSubtitle}>
            Analise evidências, ouça as partes e decida com segurança. Valor retido em custódia
            até o veredito.
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => void carregar()}>
          <Ionicons name="refresh-outline" size={16} color={adminC.accent} />
        </Pressable>
      </View>

      {!isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Modo demonstração com casos fictícios. Aplique a migration 060_order_disputes.sql no
            Supabase para disputas reais.
          </Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatChip label="Na fila" value={String(stats.total)} accent />
        <StatChip label="Abertas" value={String(stats.abertas)} />
        <StatChip label="Em análise" value={String(stats.analise)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
        <View style={styles.filtrosRow}>
          {FILTROS.map((f) => {
            const active = filtro === f.id;
            return (
              <Pressable
                key={f.id}
                style={[styles.filtroChip, active && styles.filtroChipActive]}
                onPress={() => setFiltro(f.id)}>
                <Ionicons
                  name={f.icone}
                  size={14}
                  color={active ? adminC.accent : adminC.textMuted}
                />
                <Text style={[styles.filtroText, active && styles.filtroTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {carregando ? (
        <ActivityIndicator size="large" color={adminC.accent} style={styles.loader} />
      ) : erro ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erro}</Text>
        </View>
      ) : disputas.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle-outline" size={40} color={adminC.success} />
          <Text style={styles.emptyTitle}>Nenhuma disputa neste filtro</Text>
          <Text style={styles.emptySub}>Quando um comprador abrir disputa, ela aparece aqui.</Text>
        </View>
      ) : (
        <View style={styles.lista}>
          {disputas.map((d) => {
            const horas = horasDesde(d.openedAt);
            const urgente = horas >= 36 && ['aberta', 'em_analise'].includes(d.status);
            const cores = STATUS_CORES[d.status] ?? STATUS_CORES.aberta;

            return (
              <Pressable
                key={d.disputeId}
                style={[styles.card, urgente && styles.cardUrgente]}
                onPress={() => router.push(`/admin/disputas/${d.orderId}`)}>
                <Image source={{ uri: d.auctionImage }} style={styles.thumb} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardCode}>{d.orderCode}</Text>
                    <View style={[styles.badge, { backgroundColor: cores.bg }]}>
                      <Text style={[styles.badgeText, { color: cores.text }]}>
                        {DISPUTE_STATUS_LABELS[d.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {d.auctionTitle}
                  </Text>
                  <Text style={styles.cardReason} numberOfLines={2}>
                    {DISPUTE_CATEGORY_LABELS[d.category]} — {d.reason}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>
                      {d.buyerName} vs {d.vendorName}
                    </Text>
                    <Text style={styles.metaText}>{formatBRL(d.totalCents)}</Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.evidencePill}>
                      <Ionicons name="images-outline" size={12} color={adminC.textMuted} />
                      <Text style={styles.evidenceText}>{d.evidenceCount} evidências</Text>
                    </View>
                    <Text style={[styles.slaText, urgente && styles.slaUrgente]}>
                      {horas}h aberta · {formatarData(d.openedAt)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={adminC.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statChip, accent && styles.statChipAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingBottom: 32 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(5, 255, 155, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  statChip: {
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: adminC.surface,
  },
  statChipAccent: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(5, 255, 155, 0.08)',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: adminC.textPrimary },
  statValueAccent: { color: adminC.accent },
  statLabel: { fontSize: 11, color: adminC.textMuted, marginTop: 2 },
  filtrosScroll: { marginBottom: 16 },
  filtrosRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: adminC.surface,
  },
  filtroChipActive: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(5, 255, 155, 0.08)',
  },
  filtroText: { fontSize: 12, fontWeight: '600', color: adminC.textMuted },
  filtroTextActive: { color: adminC.accent },
  loader: { marginTop: 40 },
  erroBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  erroText: { color: '#FCA5A5', fontSize: 13, lineHeight: 18 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: adminC.textPrimary },
  emptySub: { fontSize: 13, color: adminC.textMuted, textAlign: 'center' },
  lista: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: adminC.surface,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  cardUrgente: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#1F2937' },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { fontSize: 12, fontWeight: '800', color: adminC.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  cardReason: { fontSize: 12, color: adminC.textSecondary, lineHeight: 16 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 11, color: adminC.textMuted },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  evidencePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceText: { fontSize: 11, color: adminC.textMuted },
  slaText: { fontSize: 10, color: adminC.textMuted },
  slaUrgente: { color: '#F59E0B', fontWeight: '700' },
});
