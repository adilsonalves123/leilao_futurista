import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import {
  listarFilaPushAdmin,
  obterResumoPushAdmin,
  processarFilaPushAdmin,
  reenviarPushAdmin,
} from '@/src/services/adminPush';
import {
  ADMIN_PUSH_STATUS_LABELS,
  ADMIN_PUSH_TYPE_LABELS,
  type AdminPushOutboxRow,
  type AdminPushOutboxStatus,
  type AdminPushResumo,
} from '@/src/types/adminPush';
import { AdminPageHeader } from './_components/AdminPageHeader';
import { AdminStatTile } from './_components/AdminStatTile';
import { alertarAdmin, confirmarAdmin } from './_components/adminAlert';
import { adminC, adminStyles, adminTheme } from './_components/adminStyles';

type FiltroStatus = 'todos' | AdminPushOutboxStatus;

const FILTROS: { id: FiltroStatus; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'failed', label: 'Falhas' },
  { id: 'skipped', label: 'Ignoradas' },
];

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
] as const;

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColors(status: AdminPushOutboxStatus) {
  if (status === 'pending') return { bg: '#FEF3C7', color: '#B45309' };
  if (status === 'sent') return { bg: '#D1FAE5', color: adminC.success };
  if (status === 'failed') return { bg: '#FEE2E2', color: adminC.danger };
  return { bg: '#F3F4F6', color: adminC.textMuted };
}

function StatusBadge({ status }: { status: AdminPushOutboxStatus }) {
  const { bg, color } = statusColors(status);
  return (
    <View style={[adminStyles.badge, { backgroundColor: bg }]}>
      <Text style={[adminStyles.badgeText, { color }]}>{ADMIN_PUSH_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export default function AdminNotificacoesPage() {
  const { temPermissao } = useAdminSession();
  const [periodoDias, setPeriodoDias] = useState(7);
  const [resumo, setResumo] = useState<AdminPushResumo | null>(null);
  const [fila, setFila] = useState<AdminPushOutboxRow[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [processandoFila, setProcessandoFila] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [r, f] = await Promise.all([
        obterResumoPushAdmin(periodoDias),
        listarFilaPushAdmin({
          status: filtro === 'todos' ? null : filtro,
          limit: 80,
        }),
      ]);
      setResumo(r);
      setFila(f);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar notificações.';
      setErro(msg);
      setResumo(null);
      setFila([]);
    } finally {
      setCarregando(false);
    }
  }, [filtro, periodoDias]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const stats = useMemo(() => {
    if (!resumo) return [];
    return [
      {
        label: 'Na fila agora',
        value: String(resumo.pending),
        hint: 'Aguardando send-push',
        icon: 'time-outline' as const,
        accent: 'gold' as const,
      },
      {
        label: `Enviadas (${resumo.days}d)`,
        value: String(resumo.sent),
        icon: 'checkmark-circle-outline' as const,
        accent: 'green' as const,
      },
      {
        label: `Falhas (${resumo.days}d)`,
        value: String(resumo.failed),
        icon: 'alert-circle-outline' as const,
        accent: 'live' as const,
      },
      {
        label: 'Tokens ativos',
        value: String(resumo.activeTokens),
        hint: 'Dispositivos com push ligado',
        icon: 'phone-portrait-outline' as const,
        accent: 'blue' as const,
      },
      {
        label: 'Opt-in achados',
        value: String(resumo.marketingOptIn),
        hint: 'Categoria Oportunidades ativa',
        icon: 'pricetag-outline' as const,
        accent: 'navy' as const,
      },
      {
        label: 'Inbox não lidas',
        value: String(resumo.inboxUnread),
        hint: `Últimos ${resumo.days} dias`,
        icon: 'mail-unread-outline' as const,
        accent: 'navy' as const,
      },
    ];
  }, [resumo]);

  async function executarProcessarFila() {
    setProcessandoFila(true);
    try {
      const result = await processarFilaPushAdmin();
      if (!result.ok) {
        alertarAdmin('Processar fila', result.erro ?? 'Não foi possível processar.');
        return;
      }
      const msg = `Processados: ${result.processed ?? 0} · Enviados: ${result.sent ?? 0} · Falhas: ${result.failed ?? 0} · Ignorados: ${result.skipped ?? 0}`;
      alertarAdmin('Fila processada', msg);
      await carregar();
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Falha ao processar fila.');
    } finally {
      setProcessandoFila(false);
    }
  }

  async function confirmarProcessarFila() {
    const ok = await confirmarAdmin(
      'Processar fila agora',
      'Dispara a Edge Function send-push para enviar notificações pendentes aos dispositivos.',
    );
    if (ok) await executarProcessarFila();
  }

  async function reenviarItem(row: AdminPushOutboxRow) {
    const ok = await confirmarAdmin(
      'Reenviar notificação',
      `Recoloca na fila para novo envio.\n\n${row.title}\n${row.userEmail}`,
    );
    if (!ok) return;

    setProcessandoId(row.id);
    try {
      await reenviarPushAdmin(row.id);
      alertarAdmin('Reenvio', 'Notificação recolocada na fila como pendente.');
      await carregar();
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Não foi possível reenviar.');
    } finally {
      setProcessandoId(null);
    }
  }

  if (!temPermissao('leiloes')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <AdminPageHeader
        title="Notificações / Push"
        subtitle="Fila de envio, estatísticas e reenvio. Oportunidades abaixo do mercado vão para quem ativou a categoria no app."
        actions={[
          {
            label: 'Atualizar',
            icon: 'refresh-outline',
            onPress: () => void carregar(),
            loading: carregando,
          },
          {
            label: 'Processar fila',
            icon: 'send-outline',
            onPress: () => void confirmarProcessarFila(),
            loading: processandoFila,
            disabled: !isSupabaseConfigured(),
          },
        ]}
      />

      {resumo?.fonte === 'mock' ? (
        <View style={[adminStyles.alertInfo, styles.banner]}>
          <Text style={adminStyles.alertInfoText}>
            Dados de exemplo. Conecte o Supabase e aplique as migrations 052 e 053.
          </Text>
        </View>
      ) : null}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={adminTheme.neon} />
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Quem envia os push?</Text>
          <Text style={styles.infoText}>
            O backend enfileira automaticamente (lances, pedidos, KYC, achados). A Edge Function{' '}
            <Text style={styles.infoMono}>send-push</Text> entrega no celular via Expo. Configure um
            cron a cada 1–2 min no Supabase. Push manual de oportunidade:{' '}
            <Link href="/admin/leiloes" style={styles.infoLink}>
              Leilões → detalhe ao vivo
            </Link>
            .
          </Text>
        </View>
      </View>

      <View style={styles.periodRow}>
        {PERIODOS.map((p) => {
          const active = periodoDias === p.dias;
          return (
            <Pressable
              key={p.dias}
              style={[styles.periodChip, active && styles.periodChipActive]}
              onPress={() => setPeriodoDias(p.dias)}>
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {carregando && !resumo ? (
        <ActivityIndicator size="large" color={adminC.accent} style={styles.loader} />
      ) : erro ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erro}</Text>
          <Pressable style={adminStyles.btnSecondary} onPress={() => void carregar()}>
            <Text style={adminStyles.btnSecondaryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <AdminStatTile
                key={s.label}
                label={s.label}
                value={s.value}
                hint={s.hint}
                icon={s.icon}
                accent={s.accent}
              />
            ))}
          </View>

          <View style={styles.filtrosRow}>
            {FILTROS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.filtroChip, filtro === f.id && styles.filtroChipAtivo]}
                onPress={() => setFiltro(f.id)}>
                <Text style={[styles.filtroText, filtro === f.id && styles.filtroTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>Fila de notificações</Text>

            <View style={[adminStyles.tableHeader, styles.tableGrid]}>
              <Text style={[adminStyles.tableHeaderCell, styles.colData]}>Quando</Text>
              <Text style={[adminStyles.tableHeaderCell, styles.colTipo]}>Tipo</Text>
              <Text style={[adminStyles.tableHeaderCell, styles.colUsuario]}>Usuário</Text>
              <Text style={[adminStyles.tableHeaderCell, styles.colTitulo]}>Título</Text>
              <Text style={[adminStyles.tableHeaderCell, styles.colStatus]}>Status</Text>
              <Text style={[adminStyles.tableHeaderCell, styles.colAcoes]}>Ações</Text>
            </View>

            {fila.map((row) => {
              const podeReenviar = row.status === 'failed' || row.status === 'skipped';
              const tipoLabel =
                ADMIN_PUSH_TYPE_LABELS[row.notificationType] ?? row.notificationType;

              return (
                <View key={row.id} style={[adminStyles.tableRow, styles.tableGrid]}>
                  <View style={styles.colData}>
                    <Text style={adminStyles.tableCell}>{formatarData(row.createdAt)}</Text>
                    {row.sentAt ? (
                      <Text style={styles.subMeta}>Enviado {formatarData(row.sentAt)}</Text>
                    ) : null}
                  </View>

                  <View style={styles.colTipo}>
                    <Text style={adminStyles.tableCell}>{tipoLabel}</Text>
                  </View>

                  <View style={styles.colUsuario}>
                    <Text style={adminStyles.tableCell} numberOfLines={1}>
                      {row.userEmail}
                    </Text>
                  </View>

                  <View style={styles.colTitulo}>
                    <Text style={[adminStyles.tableCell, styles.tituloCell]} numberOfLines={2}>
                      {row.title}
                    </Text>
                    <Text style={styles.bodyPreview} numberOfLines={2}>
                      {row.body}
                    </Text>
                    {row.lastError ? (
                      <Text style={styles.erroPreview} numberOfLines={2}>
                        {row.lastError}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.colStatus}>
                    <StatusBadge status={row.status} />
                  </View>

                  <View style={styles.colAcoes}>
                    {podeReenviar ? (
                      <Pressable
                        style={[
                          adminStyles.btnSecondary,
                          styles.btnReenviar,
                          processandoId === row.id && styles.btnBusy,
                        ]}
                        onPress={() => void reenviarItem(row)}
                        disabled={processandoId === row.id}>
                        <Text style={adminStyles.btnSecondaryText}>Reenviar</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.semAcao}>—</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {fila.length === 0 ? (
              <Text style={styles.empty}>Nenhuma notificação neste filtro.</Text>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  banner: { marginBottom: 16 },
  loader: { marginTop: 32 },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surfaceMuted,
    marginBottom: 16,
  },
  infoCopy: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: adminTheme.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: adminTheme.textSecondary,
    lineHeight: 18,
  },
  infoMono: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: adminTheme.textPrimary,
  },
  infoLink: {
    color: adminTheme.neon,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
  },
  periodChipActive: {
    borderColor: adminTheme.neon,
    backgroundColor: 'rgba(5,255,155,0.08)',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: adminTheme.textMuted,
  },
  periodTextActive: {
    color: adminTheme.neon,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  filtrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
  },
  filtroChipAtivo: {
    borderColor: adminTheme.neon,
    backgroundColor: 'rgba(5,255,155,0.08)',
  },
  filtroText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminTheme.textMuted,
  },
  filtroTextActive: {
    color: adminTheme.neon,
  },
  tableGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  colData: { flex: 1.1, minWidth: 90 },
  colTipo: { flex: 1.2, minWidth: 100 },
  colUsuario: { flex: 1.3, minWidth: 120 },
  colTitulo: { flex: 2.2, minWidth: 160 },
  colStatus: { flex: 0.9, minWidth: 88 },
  colAcoes: { flex: 0.8, minWidth: 80, alignItems: 'flex-end' },
  subMeta: { fontSize: 10, color: adminTheme.textMuted, marginTop: 2 },
  tituloCell: { fontWeight: '600' },
  bodyPreview: { fontSize: 11, color: adminTheme.textMuted, marginTop: 4, lineHeight: 15 },
  erroPreview: { fontSize: 10, color: adminC.danger, marginTop: 4, lineHeight: 14 },
  btnReenviar: { paddingVertical: 6, paddingHorizontal: 10 },
  btnBusy: { opacity: 0.6 },
  semAcao: { fontSize: 12, color: adminTheme.textMuted },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: adminTheme.textMuted,
    fontSize: 13,
  },
  erroBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    gap: 12,
  },
  erroText: { color: adminC.danger, fontSize: 14, lineHeight: 20 },
});
