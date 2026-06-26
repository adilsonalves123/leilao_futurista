import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { formatBRL } from '@/src/lib/bids';
import {
  obterMetricasOperacionaisHoje,
  type MetricasOperacionaisHoje,
} from '@/src/services/adminDashboard';
import {
  obterContagensOperacionaisAdmin,
  type AdminOpsCounts,
} from '@/src/services/adminOpsCounts';
import {
  obterFaturamentoMensalAdmin,
  type AdminFaturamentoMensal,
} from '@/src/services/adminFaturamento';
import { AdminAttentionStrip, type AttentionItem } from './_components/AdminAttentionStrip';
import { AdminCommandCenter } from './_components/AdminCommandCenter';
import { AdminPageHeader } from './_components/AdminPageHeader';
import { AdminStatTile } from './_components/AdminStatTile';
import { BidsHourlyChart, CommissionFlowChart } from './_components/charts';
import { MetricCard } from './_components/MetricCard';
import { RecentTransactionsTable } from './_components/RecentTransactionsTable';
import { adminTheme } from './_components/adminStyles';

const AUTO_REFRESH_MS = 60_000;

function formatarHorario(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatarDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function calcularPico(buckets: MetricasOperacionaisHoje['lancesPorHora']): string {
  if (!buckets.length) return 'Sem lances registrados hoje';
  const pico = buckets.reduce((max, b) => (b.total > max.total ? b : max), buckets[0]);
  if (pico.total === 0) return 'Nenhum lance registrado hoje';
  return `Pico às ${pico.label} — ${pico.total} lance${pico.total === 1 ? '' : 's'}`;
}

export default function AdminFaturamento() {
  const { temPermissao } = useAdminSession();
  const [operacional, setOperacional] = useState<MetricasOperacionaisHoje | null>(null);
  const [opsCounts, setOpsCounts] = useState<AdminOpsCounts | null>(null);
  const [faturamento, setFaturamento] = useState<AdminFaturamentoMensal | null>(null);
  const [carregandoOps, setCarregandoOps] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregarOperacional = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregandoOps(true);
    else setAtualizando(true);
    try {
      const [dados, counts, mensal] = await Promise.all([
        obterMetricasOperacionaisHoje(),
        obterContagensOperacionaisAdmin(),
        obterFaturamentoMensalAdmin(),
      ]);
      setOperacional(dados);
      setOpsCounts(counts);
      setFaturamento(mensal);
    } finally {
      setCarregandoOps(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarOperacional();
    const timer = setInterval(() => carregarOperacional(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [carregarOperacional]);

  const picoLabel = useMemo(
    () => (operacional ? calcularPico(operacional.lancesPorHora) : ''),
    [operacional],
  );

  const attentionItems = useMemo((): AttentionItem[] => {
    if (!opsCounts) return [];
    const items: AttentionItem[] = [];

    if (opsCounts.kycPendentes > 0) {
      items.push({
        id: 'kyc',
        message: `${opsCounts.kycPendentes} solicitação${opsCounts.kycPendentes === 1 ? '' : 'ões'} KYC aguardando análise`,
        tone: 'warning',
        href: '/admin/kyc',
        actionLabel: 'Abrir fila',
      });
    }
    if (opsCounts.leiloesEmAnalise > 0) {
      items.push({
        id: 'leiloes',
        message: `${opsCounts.leiloesEmAnalise} leilão${opsCounts.leiloesEmAnalise === 1 ? '' : 'ões'} aguardando aprovação`,
        tone: 'info',
        href: '/admin/leiloes',
        actionLabel: 'Moderar',
      });
    }
    if (opsCounts.disputasAbertas > 0) {
      items.push({
        id: 'disputas',
        message: `${opsCounts.disputasAbertas} disputa${opsCounts.disputasAbertas === 1 ? '' : 's'} aberta${opsCounts.disputasAbertas === 1 ? '' : 's'} na sala de mediação`,
        tone: 'danger',
        href: '/admin/disputas',
        actionLabel: 'Mediar',
      });
    }
    if (opsCounts.pedidosPagamentoPendente > 0) {
      items.push({
        id: 'pagamentos',
        message: `${opsCounts.pedidosPagamentoPendente} pedido${opsCounts.pedidosPagamentoPendente === 1 ? '' : 's'} com pagamento pendente`,
        tone: 'warning',
        href: '/admin/pedidos',
        actionLabel: 'Ver pedidos',
      });
    }
    if (opsCounts.suporteAguardando > 0) {
      items.push({
        id: 'suporte',
        message: `${opsCounts.suporteAguardando} chat${opsCounts.suporteAguardando === 1 ? '' : 's'} aguardando atendimento humano`,
        tone: 'info',
        href: '/admin/suporte',
        actionLabel: 'Atender',
      });
    }
    if (operacional && operacional.quantidadeLances === 0) {
      items.push({
        id: 'lances',
        message: 'Nenhum lance registrado hoje — verifique leilões ao vivo',
        tone: 'info',
        href: '/admin/leiloes',
        actionLabel: 'Ver leilões',
      });
    }
    return items;
  }, [opsCounts, operacional]);

  if (!temPermissao('financeiro')) {
    return <Redirect href="/admin/equipe" />;
  }

  const mensal = faturamento;
  const comissaoCents = mensal?.comissaoCents ?? 0;
  const comissaoVariacao = mensal?.comissaoVariacao ?? '—';
  const receitaCents = mensal?.receitaCents ?? 0;
  const receitaVariacao = mensal?.receitaVariacao ?? '—';
  const pedidosLiquidados = mensal?.pedidosLiquidados ?? 0;
  const transacoesTotais = mensal?.transacoesTotais ?? 0;
  const sparkComissao = mensal?.sparklineComissao ?? [];
  const sparkReceita = mensal?.sparklineReceita ?? [];
  const fluxoComissoes = mensal?.fluxoComissoes ?? { valores: [], labels: [] };
  const transacoesRecentes = mensal?.transacoesRecentes ?? [];
  const faturamentoDemo = !mensal || mensal.fonte === 'mock';

  const metaLine = operacional
    ? `Atualizado às ${formatarHorario(operacional.atualizadoEm)}${operacional.fonte === 'mock' ? ' · demo' : ''}`
    : undefined;

  return (
    <View style={styles.page}>
      <AdminPageHeader
        title="Pulse do dia"
        subtitle={formatarDataHoje()}
        meta={metaLine}
        actions={[
          {
            label: 'Atualizar',
            icon: 'refresh-outline',
            onPress: () => carregarOperacional(true),
            loading: atualizando,
            disabled: carregandoOps,
          },
        ]}
      />

      <AdminAttentionStrip items={attentionItems} />

      {opsCounts ? <AdminCommandCenter counts={opsCounts} /> : null}

      {carregandoOps && !operacional ? (
        <ActivityIndicator color={adminTheme.neon} style={styles.opsLoader} />
      ) : operacional ? (
        <>
          <View style={styles.statRow}>
            <AdminStatTile
              label="Arrematado hoje"
              value={formatBRL(operacional.totalArrematadoCents)}
              hint="Soma dos arremates liquidados"
              icon="trophy-outline"
              accent="navy"
            />
            <AdminStatTile
              label="Comissão hoje"
              value={formatBRL(operacional.comissaoHojeCents)}
              hint="10% sobre arremates"
              icon="wallet-outline"
              accent="green"
            />
            <AdminStatTile
              label="Lances hoje"
              value={operacional.quantidadeLances.toLocaleString('pt-BR')}
              hint={picoLabel}
              icon="hammer-outline"
              accent="gold"
            />
            <AdminStatTile
              label="Novos usuários"
              value={operacional.novosUsuarios.toLocaleString('pt-BR')}
              hint="Cadastros de hoje"
              icon="person-add-outline"
              accent="blue"
            />
          </View>

          <View style={styles.opsBottomRow}>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Tráfego — Hoje</Text>
              <View style={styles.trafficRow}>
                <View style={styles.trafficItem}>
                  <Text style={styles.trafficLabel}>Visitas únicas</Text>
                  <Text style={styles.trafficValue}>
                    {operacional.visitasUnicas.toLocaleString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.trafficDivider} />
                <View style={styles.trafficItem}>
                  <Text style={styles.trafficLabel}>Usuários ativos</Text>
                  <Text style={styles.trafficValue}>
                    {operacional.usuariosAtivos.toLocaleString('pt-BR')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.panelCard, styles.panelCardWide]}>
              <Text style={styles.panelTitle}>Lances por hora</Text>
              <Text style={styles.panelSub}>Horário de pico dos compradores</Text>
              <BidsHourlyChart buckets={operacional.lancesPorHora} peakLabel={picoLabel} />
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Relatório mensal</Text>
        <Text style={styles.sectionSub}>Comissões e receita consolidada</Text>
      </View>

      {faturamentoDemo ? (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            Dados ilustrativos — aplique a migration 061 no Supabase para métricas reais de
            faturamento.
          </Text>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <MetricCard
          label="Comissão acumulada (10%)"
          valorCents={comissaoCents}
          variacao={comissaoVariacao}
          hint={`${pedidosLiquidados.toLocaleString('pt-BR')} pedidos liquidados`}
          accent="green"
          icon="wallet-outline"
          sparklineValues={sparkComissao}
          sparklineId="sparkGreen"
        />
        <MetricCard
          label="Receita bruta (100%)"
          valorCents={receitaCents}
          variacao={receitaVariacao}
          hint={`${transacoesTotais.toLocaleString('pt-BR')} transações totais`}
          accent="blue"
          icon="cash-outline"
          sparklineValues={sparkReceita}
          sparklineId="sparkBlue"
        />
      </View>

      <View style={styles.panelCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.panelTitle}>Fluxo de comissões</Text>
            <Text style={styles.panelSub}>Evolução diária — últimos 30 dias</Text>
          </View>
        </View>
        <CommissionFlowChart values={fluxoComissoes.valores} labels={fluxoComissoes.labels} />
      </View>

      <RecentTransactionsTable transacoes={transacoesRecentes} somenteLeitura={!faturamentoDemo} />
    </View>
  );
}

const cardShadow = Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {};

const styles = StyleSheet.create({
  page: { paddingBottom: 32 },
  opsLoader: { marginVertical: 32 },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  opsBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  panelCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: adminTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminTheme.border,
    padding: 20,
    ...cardShadow,
  },
  panelCardWide: {
    flex: 2,
    minWidth: 320,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    marginBottom: 4,
  },
  panelSub: {
    fontSize: 12,
    color: adminTheme.textMuted,
    marginBottom: 12,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 8,
  },
  trafficItem: { flex: 1, gap: 4 },
  trafficDivider: {
    width: 1,
    backgroundColor: adminTheme.border,
    marginHorizontal: 16,
  },
  trafficLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  trafficValue: {
    fontSize: 26,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  sectionHead: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: adminTheme.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: adminTheme.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  demoBanner: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  demoBannerText: {
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 18,
  },
});
