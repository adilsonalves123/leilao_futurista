import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { formatPromotionPrice } from '@/src/lib/promotionFormatters';
import {
  atualizarPlanoDestaque,
  listarPlanosDestaqueAdmin,
  listarVendasDestaques,
  obterResumoGanhosDestaques,
} from '@/src/services/adminPromotions';
import type {
  AdminPromotionPlanRow,
  PromotionEarningsSummary,
  PromotionSaleRow,
} from '@/src/types/adminPromotions';
import { AdminPageHeader } from './_components/AdminPageHeader';
import { AdminStatTile } from './_components/AdminStatTile';
import { adminC, adminStyles, adminTheme } from './_components/adminStyles';

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
] as const;

const STATUS_LABEL: Record<PromotionSaleRow['status'], string> = {
  active: 'Confirmado',
  pending: 'Pendente',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

function centsFromReaisInput(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  if (Number.isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

function reaisInputFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function AdminDestaquesPage() {
  const { temPermissao } = useAdminSession();
  const [periodoDias, setPeriodoDias] = useState(30);
  const [resumo, setResumo] = useState<PromotionEarningsSummary | null>(null);
  const [vendas, setVendas] = useState<PromotionSaleRow[]>([]);
  const [planos, setPlanos] = useState<AdminPromotionPlanRow[]>([]);
  const [precosRascunho, setPrecosRascunho] = useState<Record<string, string>>({});
  const [vagasPlusRascunho, setVagasPlusRascunho] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvandoSlug, setSalvandoSlug] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [r, v, p] = await Promise.all([
        obterResumoGanhosDestaques(periodoDias),
        listarVendasDestaques(50),
        listarPlanosDestaqueAdmin(),
      ]);
      setResumo(r);
      setVendas(v);
      setPlanos(p);
      const precos: Record<string, string> = {};
      for (const plan of p) {
        precos[plan.slug] = reaisInputFromCents(plan.priceCents);
      }
      setPrecosRascunho(precos);
      const plus = p.find((x) => x.slug === 'featured_plus');
      setVagasPlusRascunho(plus?.maxLiveSlots != null ? String(plus.maxLiveSlots) : '5');
    } finally {
      setCarregando(false);
    }
  }, [periodoDias]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarPlano(slug: string) {
    const priceCents = centsFromReaisInput(precosRascunho[slug] ?? '0');
    if (priceCents <= 0) {
      Alert.alert('Preço inválido', 'Informe um valor maior que zero.');
      return;
    }

    const maxSlots =
      slug === 'featured_plus'
        ? Math.max(1, parseInt(vagasPlusRascunho, 10) || 5)
        : undefined;

    setSalvandoSlug(slug);
    const result = await atualizarPlanoDestaque({
      slug,
      priceCents,
      maxLiveSlots: maxSlots ?? null,
    });
    setSalvandoSlug(null);

    if (!result.ok) {
      Alert.alert('Erro ao salvar', result.erro ?? 'Tente novamente.');
      return;
    }

    Alert.alert('Salvo', 'Preço e configurações atualizados.');
    carregar();
  }

  if (!temPermissao('financeiro')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <AdminPageHeader
        title="Ganhos com destaques"
        subtitle="Receita de Destaque e Destaque Plus — vendas, pendências e preços dos planos."
      />

      {resumo?.fonte === 'mock' ? (
        <View style={[adminStyles.alertInfo, styles.mockBanner]}>
          <Text style={adminStyles.alertInfoText}>
            Exibindo dados de exemplo. Conecte o Supabase e aplique as migrations 041 e 042 para
            dados reais.
          </Text>
        </View>
      ) : null}

      <View style={styles.periodRow}>
        {PERIODOS.map((p) => {
          const active = periodoDias === p.dias;
          return (
            <Pressable
              key={p.dias}
              style={[styles.periodPill, active && styles.periodPillActive]}
              onPress={() => setPeriodoDias(p.dias)}>
              <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.refreshBtn} onPress={carregar} accessibilityLabel="Atualizar">
          <Ionicons name="refresh-outline" size={18} color={adminTheme.neon} />
        </Pressable>
      </View>

      {carregando ? (
        <ActivityIndicator color={adminTheme.neon} style={styles.loader} />
      ) : resumo ? (
        <>
          <View style={styles.tilesRow}>
            <AdminStatTile
              label="Hoje"
              value={formatBRL(resumo.totalHojeCents)}
              hint="Vendas confirmadas + pendentes"
              icon="today-outline"
              accent="green"
            />
            <AdminStatTile
              label="Este mês"
              value={formatBRL(resumo.totalMesCents)}
              icon="calendar-outline"
              accent="blue"
            />
          </View>

          <View style={styles.tilesRow}>
            <AdminStatTile
              label={`Últimos ${resumo.periodoDias} dias`}
              value={formatBRL(resumo.totalPeriodoCents)}
              hint={`${resumo.vendasPeriodo} venda(s)`}
              icon="trending-up-outline"
              accent="gold"
            />
            <AdminStatTile
              label="Plus ativos na Home"
              value={`${resumo.plusAtivos}`}
              hint="Vagas em uso agora"
              icon="home-outline"
              accent="live"
            />
          </View>

          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>Detalhamento do período</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Receita confirmada</Text>
              <Text style={styles.detailValueOk}>
                {formatBRL(resumo.totalConfirmadoPeriodoCents)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aguardando confirmação</Text>
              <Text style={styles.detailValueWarn}>{formatBRL(resumo.totalPendenteCents)}</Text>
            </View>
            {resumo.porPlano.length > 0 ? (
              <View style={styles.planBreakdown}>
                <Text style={styles.breakdownTitle}>Por plano</Text>
                {resumo.porPlano.map((p) => (
                  <View key={p.planSlug} style={styles.breakdownRow}>
                    <View>
                      <Text style={styles.breakdownName}>{p.planName}</Text>
                      <Text style={styles.breakdownMeta}>{p.quantidade} venda(s)</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{formatBRL(p.receitaCents)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>Nenhuma venda de destaque neste período.</Text>
            )}
          </View>

          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>Preços dos planos (app)</Text>
            <Text style={styles.cardLead}>
              Valores exibidos no cadastro de leilão. Alterações valem para novas compras.
            </Text>
            {planos.map((plan) => (
              <View key={plan.slug} style={styles.planEditBlock}>
                <Text style={styles.planEditName}>{plan.name}</Text>
                <Text style={styles.planEditDesc}>{plan.description}</Text>
                <Text style={adminStyles.label}>Preço (R$)</Text>
                <TextInput
                  style={adminStyles.input}
                  value={precosRascunho[plan.slug] ?? ''}
                  onChangeText={(t) =>
                    setPrecosRascunho((prev) => ({ ...prev, [plan.slug]: t }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={adminC.textMuted}
                />
                {plan.slug === 'featured_plus' ? (
                  <>
                    <Text style={adminStyles.label}>Vagas simultâneas na Home</Text>
                    <TextInput
                      style={adminStyles.input}
                      value={vagasPlusRascunho}
                      onChangeText={setVagasPlusRascunho}
                      keyboardType="number-pad"
                      placeholder="5"
                      placeholderTextColor={adminC.textMuted}
                    />
                  </>
                ) : null}
                <Text style={styles.previewPrice}>
                  Preview: {formatPromotionPrice(centsFromReaisInput(precosRascunho[plan.slug] ?? '0'))}
                </Text>
                <Pressable
                  style={[adminStyles.btnPrimary, salvandoSlug === plan.slug && styles.btnDisabled]}
                  onPress={() => salvarPlano(plan.slug)}
                  disabled={salvandoSlug === plan.slug}>
                  {salvandoSlug === plan.slug ? (
                    <ActivityIndicator color={adminTheme.contentBg} />
                  ) : (
                    <Text style={adminStyles.btnPrimaryText}>Salvar {plan.name}</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>

          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>Vendas recentes</Text>
            {vendas.length === 0 ? (
              <Text style={styles.emptyHint}>Nenhuma venda registrada ainda.</Text>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellDate, styles.headText]}>Data</Text>
                  <Text style={[styles.cell, styles.cellPlan, styles.headText]}>Plano</Text>
                  <Text style={[styles.cell, styles.cellTitle, styles.headText]}>Leilão</Text>
                  <Text style={[styles.cell, styles.cellSeller, styles.headText]}>Vendedor</Text>
                  <Text style={[styles.cell, styles.cellValue, styles.headText]}>Valor</Text>
                  <Text style={[styles.cell, styles.cellStatus, styles.headText]}>Status</Text>
                </View>
                {vendas.map((v) => (
                  <View key={v.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellDate]} numberOfLines={1}>
                      {formatarData(v.purchasedAt)}
                    </Text>
                    <Text style={[styles.cell, styles.cellPlan]} numberOfLines={1}>
                      {v.planName}
                    </Text>
                    <Text style={[styles.cell, styles.cellTitle]} numberOfLines={2}>
                      {v.auctionTitle}
                    </Text>
                    <Text style={[styles.cell, styles.cellSeller]} numberOfLines={1}>
                      {v.sellerEmail}
                    </Text>
                    <Text style={[styles.cell, styles.cellValue]}>
                      {formatBRL(v.pricePaidCents)}
                    </Text>
                    <View style={[styles.cell, styles.cellStatus]}>
                      <StatusChip status={v.status} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function StatusChip({ status }: { status: PromotionSaleRow['status'] }) {
  const tone =
    status === 'active'
      ? styles.chipOk
      : status === 'pending'
        ? styles.chipWarn
        : styles.chipMuted;
  return (
    <View style={[styles.chip, tone]}>
      <Text style={styles.chipText}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  mockBanner: { marginBottom: 16 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
  },
  periodPillActive: {
    backgroundColor: adminTheme.neonGlow,
    borderColor: adminTheme.neon,
  },
  periodPillText: { fontSize: 13, fontWeight: '600', color: adminTheme.textSecondary },
  periodPillTextActive: { color: adminTheme.neon },
  refreshBtn: {
    marginLeft: 'auto',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminTheme.border,
  },
  loader: { marginVertical: 40 },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { flexWrap: 'wrap' } : {}),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.border,
  },
  detailLabel: { fontSize: 14, color: adminTheme.textSecondary },
  detailValueOk: { fontSize: 15, fontWeight: '700', color: '#34D399' },
  detailValueWarn: { fontSize: 15, fontWeight: '700', color: '#FBBF24' },
  planBreakdown: { marginTop: 16 },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownName: { fontSize: 14, fontWeight: '600', color: adminTheme.textPrimary },
  breakdownMeta: { fontSize: 12, color: adminTheme.textMuted, marginTop: 2 },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: adminTheme.neon },
  emptyHint: { fontSize: 13, color: adminTheme.textMuted, fontStyle: 'italic' },
  cardLead: { fontSize: 13, color: adminTheme.textSecondary, marginBottom: 16, lineHeight: 19 },
  planEditBlock: {
    borderTopWidth: 1,
    borderTopColor: adminTheme.border,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  planEditName: { fontSize: 15, fontWeight: '700', color: adminTheme.textPrimary },
  planEditDesc: { fontSize: 12, color: adminTheme.textMuted, marginBottom: 12, lineHeight: 17 },
  previewPrice: { fontSize: 12, color: adminTheme.textMuted, marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  table: { gap: 0 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.border,
    gap: 8,
    ...(Platform.OS === 'web' ? { minWidth: 720 } : { flexWrap: 'wrap' }),
  },
  tableHead: { borderBottomWidth: 2 },
  headText: { fontWeight: '700', color: adminTheme.textMuted, fontSize: 10, textTransform: 'uppercase' },
  cell: { fontSize: 12, color: adminTheme.textPrimary },
  cellDate: { width: 88, flexShrink: 0 },
  cellPlan: { width: 100, flexShrink: 0 },
  cellTitle: { flex: 1, minWidth: 100 },
  cellSeller: { width: 120, flexShrink: 0 },
  cellValue: { width: 72, flexShrink: 0, fontWeight: '700', textAlign: 'right' },
  cellStatus: { width: 88, flexShrink: 0 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipOk: { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
  chipWarn: { backgroundColor: 'rgba(251, 191, 36, 0.15)' },
  chipMuted: { backgroundColor: adminTheme.surfaceMuted },
  chipText: { fontSize: 10, fontWeight: '700', color: adminTheme.textPrimary },
});
