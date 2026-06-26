import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import {
  obterDetalheLoteArrematado,
  type AdminLanceHistorico,
  type AdminLoteArrematadoDetalhe,
} from '@/src/services/adminArrematados';
import { AdminLeilaoPendenciaBadge } from '../_components/AdminLeilaoPendenciaBadge';
import { AdminOperacionalFluxoPanel } from '../_components/AdminOperacionalFluxoPanel';
import { AdminVendorPreviewModal } from '../_components/AdminVendorPreviewModal';
import { AdminWinnerPreviewModal } from '../_components/AdminWinnerPreviewModal';
import { adminC, adminStyles } from '../_components/adminStyles';
import { resolverCompradorId } from '@/src/services/adminComprador';

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function LanceRow({ lance, index }: { lance: AdminLanceHistorico; index: number }) {
  return (
    <View style={[styles.lanceRow, index > 0 && styles.lanceRowBorder]}>
      <View style={styles.lanceRank}>
        {lance.vencedor ? (
          <Ionicons name="trophy" size={14} color="#FCD34D" />
        ) : (
          <Text style={styles.lanceRankText}>{index + 1}</Text>
        )}
      </View>
      <View style={styles.lanceMeta}>
        <Text style={[styles.lanceUser, lance.vencedor && styles.lanceUserWinner]} numberOfLines={1}>
          {lance.licitante}
        </Text>
        <Text style={styles.lanceData}>{formatarData(lance.createdAt)}</Text>
      </View>
      <Text style={[styles.lanceValor, lance.vencedor && styles.lanceValorWinner]}>
        {lance.valorLabel}
      </Text>
    </View>
  );
}

export default function AdminArrematadoDetalheScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<AdminLoteArrematadoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [vendedorPreviewId, setVendedorPreviewId] = useState<string | null>(null);
  const [mostrarGanhador, setMostrarGanhador] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setNaoEncontrado(false);
    try {
      const dados = await obterDetalheLoteArrematado(String(id));
      if (!dados) {
        setNaoEncontrado(true);
        setDetalhe(null);
      } else {
        setDetalhe(dados);
      }
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao('leiloes')) {
    return <Redirect href="/admin/equipe" />;
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adminC.accent} />
        <Text style={styles.loadingText}>Carregando lote…</Text>
      </View>
    );
  }

  if (naoEncontrado || !detalhe) {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={48} color={adminC.textMuted} />
        <Text style={styles.notFoundTitle}>Lote não encontrado</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar à lista</Text>
        </Pressable>
      </View>
    );
  }

  const compradorId = resolverCompradorId(detalhe.comprador);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backLink} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#C4B5FD" />
        <Text style={styles.backLinkText}>Voltar aos arrematados</Text>
      </Pressable>

      <View style={styles.hero}>
        <Image source={{ uri: detalhe.imagemUrl }} style={styles.heroImg} />
        <View style={styles.heroText}>
          <Text style={styles.loteIdBadge}>Lote #{detalhe.loteId}</Text>
          <Text style={adminStyles.pageTitle}>{detalhe.titulo}</Text>
          {detalhe.alertaAdm ? (
            <View
              style={[
                styles.alertaBadge,
                detalhe.alertaAdm.severidade === 'critico' && styles.alertaCritico,
              ]}>
              <Ionicons
                name="warning-outline"
                size={14}
                color={detalhe.alertaAdm.severidade === 'critico' ? '#FCA5A5' : '#FCD34D'}
              />
              <Text
                style={[
                  styles.alertaText,
                  detalhe.alertaAdm.severidade === 'critico' && styles.alertaTextCritico,
                ]}>
                {detalhe.alertaAdm.mensagem}
              </Text>
            </View>
          ) : null}
          <View style={styles.valorRow}>
            <Text style={styles.valorLabel}>Valor final</Text>
            <Text style={styles.valorFinal}>{detalhe.valorFinal}</Text>
          </View>
          <View style={styles.badgesRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{detalhe.fluxoLabel}</Text>
            </View>
            {detalhe.pendencia ? (
              <AdminLeilaoPendenciaBadge pendencia={detalhe.pendencia} />
            ) : null}
          </View>
        </View>
      </View>

      {detalhe.pendencia ? (
        <View style={adminStyles.card}>
          <AdminOperacionalFluxoPanel
            pendencia={detalhe.pendencia}
            timeline={detalhe.timeline}
            eventos={detalhe.eventos}
            pedidoId={detalhe.pedidoId}
            pedidoCodigo={detalhe.pedidoCodigo}
            leilaoId={detalhe.loteId}
            vencedor={detalhe.comprador}
            lance={detalhe.valorFinal}
            rastreio={detalhe.trackingCode}
          />
        </View>
      ) : null}

      {detalhe.descricao ? (
        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>Descrição</Text>
          <Text style={styles.descricao}>{detalhe.descricao}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <View style={[adminStyles.card, styles.partesCard]}>
          <Text style={adminStyles.cardTitle}>Partes envolvidas</Text>
          <Pressable style={styles.parteRow} onPress={() => setMostrarGanhador(true)}>
            <Ionicons name="person-circle-outline" size={20} color="#C4B5FD" />
            <View style={styles.parteMeta}>
              <Text style={styles.parteLabel}>Ganhador</Text>
              <Text style={styles.parteValor}>{detalhe.comprador}</Text>
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={adminC.textMuted} />
          </Pressable>
          <Pressable
            style={styles.parteRow}
            onPress={() => setVendedorPreviewId(detalhe.vendedorId)}>
            <Ionicons name="storefront-outline" size={20} color={adminC.accentBright} />
            <View style={styles.parteMeta}>
              <Text style={styles.parteLabel}>Vendedor</Text>
              <Text style={styles.parteValorVendedor}>{detalhe.vendedor}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={adminC.textMuted} />
          </Pressable>
        </View>

        <View style={[adminStyles.card, styles.financeCard]}>
          <Text style={adminStyles.cardTitle}>Resumo financeiro</Text>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Arremate</Text>
            <Text style={styles.financeValue}>{detalhe.valorFinal}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Taxa plataforma</Text>
            <Text style={styles.financeValue}>{detalhe.taxaPlataforma}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Frete</Text>
            <Text style={styles.financeValue}>{detalhe.valorFrete}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          adminStyles.card,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(31,41,55,0.8) 0%, rgba(17,24,39,0.95) 100%)',
              } as object)
            : null,
        ]}>
        <View style={styles.lancesHeader}>
          <Ionicons name="hammer-outline" size={18} color={adminC.accent} />
          <Text style={adminStyles.cardTitle}>Histórico de lances</Text>
          <Text style={styles.lancesCount}>{detalhe.lances.length} lance(s)</Text>
        </View>
        <Text style={styles.lancesHint}>
          Ordenado do maior para o menor. O vencedor aparece com troféu.
        </Text>
        {detalhe.lances.map((lance, index) => (
          <LanceRow key={lance.id} lance={lance} index={index} />
        ))}
      </View>

      <AdminVendorPreviewModal
        visible={vendedorPreviewId != null}
        vendorId={vendedorPreviewId}
        onClose={() => setVendedorPreviewId(null)}
      />

      <AdminWinnerPreviewModal
        visible={mostrarGanhador}
        compradorId={compradorId}
        orderId={detalhe.pedidoId}
        handleFallback={detalhe.comprador}
        onClose={() => setMostrarGanhador(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingBottom: 40, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14, color: adminC.textMuted },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: adminC.textPrimary },
  backBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  backBtnText: { color: '#C4B5FD', fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backLinkText: { fontSize: 14, fontWeight: '600', color: '#C4B5FD' },
  hero: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 20,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'stretch',
  },
  heroImg: {
    width: Platform.OS === 'web' ? 200 : '100%',
    height: Platform.OS === 'web' ? 200 : 220,
    borderRadius: 16,
    backgroundColor: adminC.border,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroText: { flex: 1, gap: 8 },
  loteIdBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: adminC.textMuted,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    alignSelf: 'flex-start',
  },
  alertaCritico: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  alertaText: { fontSize: 12, fontWeight: '600', color: '#FCD34D', flex: 1 },
  alertaTextCritico: { color: '#FCA5A5' },
  valorRow: { marginTop: 4 },
  valorLabel: { fontSize: 11, color: adminC.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  valorFinal: { fontSize: 28, fontWeight: '800', color: '#6EE7B7', marginTop: 2 },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#C4B5FD' },
  descricao: { fontSize: 14, color: adminC.textSecondary, lineHeight: 22, marginTop: 8 },
  grid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  partesCard: { flex: 1 },
  financeCard: { flex: 1 },
  parteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  parteMeta: { flex: 1, gap: 2 },
  parteLabel: { fontSize: 10, fontWeight: '700', color: adminC.textMuted, textTransform: 'uppercase' },
  parteValor: { fontSize: 14, fontWeight: '700', color: '#C4B5FD' },
  parteValorVendedor: { fontSize: 14, fontWeight: '700', color: adminC.accentBright },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  financeLabel: { fontSize: 13, color: adminC.textMuted },
  financeValue: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  lancesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lancesCount: {
    marginLeft: 'auto' as unknown as number,
    fontSize: 11,
    fontWeight: '600',
    color: adminC.textMuted,
  },
  lancesHint: { fontSize: 12, color: adminC.textMuted, marginBottom: 12 },
  lanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  lanceRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  lanceRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(17,24,39,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lanceRankText: { fontSize: 12, fontWeight: '700', color: adminC.textMuted },
  lanceMeta: { flex: 1, gap: 2 },
  lanceUser: { fontSize: 14, fontWeight: '600', color: adminC.textPrimary },
  lanceUserWinner: { color: '#FCD34D' },
  lanceData: { fontSize: 11, color: adminC.textMuted },
  lanceValor: { fontSize: 14, fontWeight: '800', color: adminC.textSecondary },
  lanceValorWinner: { color: '#6EE7B7' },
});
