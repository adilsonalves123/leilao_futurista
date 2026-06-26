import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import type { AdminLeilao, AdminLeilaoStatus, AdminPedidoEvento } from '@/src/admin/types';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import {
  acelerarLeilaoTesteAdmin,
  aprovarLeilaoAdmin,
  enviarPushOportunidadeAdmin,
  listarLeiloesAdmin,
  obterEventosLeilaoAdmin,
  rejeitarLeilaoAdmin,
} from '@/src/services/adminLeiloes';
import { resolverVendorId } from '@/src/services/adminVendedor';
import { AdminLeilaoFluxoPanel } from './_components/AdminLeilaoFluxoPanel';
import { AdminLeilaoPendenciaBadge } from './_components/AdminLeilaoPendenciaBadge';
import { alertarAdmin, confirmarAdmin } from './_components/adminAlert';
import { adminC, adminStyles } from './_components/adminStyles';

type FiltroLeilao = 'todos' | 'em_analise' | 'ao_vivo' | 'pausado';

const FILTROS: { id: FiltroLeilao; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'ao_vivo', label: 'Ao vivo' },
  { id: 'pausado', label: 'Pausados' },
];

function statusLabel(status: AdminLeilaoStatus) {
  if (status === 'em_analise') return 'Em análise';
  if (status === 'ao_vivo') return 'Ao vivo';
  if (status === 'pausado') return 'Pausado';
  if (status === 'rejeitado') return 'Rejeitado';
  return 'Encerrado';
}

function statusColors(status: AdminLeilaoStatus) {
  if (status === 'em_analise') return { bg: '#FEF3C7', color: '#B45309' };
  if (status === 'ao_vivo') return { bg: '#EDE9FE', color: adminC.accent };
  if (status === 'pausado') return { bg: '#FEF3C7', color: adminC.warning };
  if (status === 'rejeitado') return { bg: '#FEE2E2', color: '#B91C1C' };
  return { bg: '#F3F4F6', color: adminC.textMuted };
}

function StatusBadge({ status }: { status: AdminLeilaoStatus }) {
  const { bg, color } = statusColors(status);
  return (
    <View style={[adminStyles.badge, { backgroundColor: bg }]}>
      <Text style={[adminStyles.badgeText, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export default function AdminLeiloes() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const [leiloes, setLeiloes] = useState<AdminLeilao[]>([]);
  const [filtro, setFiltro] = useState<FiltroLeilao>('em_analise');
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [leilaoExpandido, setLeilaoExpandido] = useState<AdminLeilao | null>(null);
  const [imagemGaleriaAtiva, setImagemGaleriaAtiva] = useState<string | null>(null);
  const [eventosPedido, setEventosPedido] = useState<AdminPedidoEvento[]>([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const dados = await listarLeiloesAdmin();
      setLeiloes(dados);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar leilões.';
      setErroCarregar(msg);
      setLeiloes([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Leilões ativos: moderação e cronômetro — encerrados ficam em Arrematados. */
  const leiloesGestao = useMemo(
    () => leiloes.filter((l) => l.status !== 'encerrado' && l.status !== 'rejeitado'),
    [leiloes],
  );

  const emAnalise = useMemo(
    () => leiloesGestao.filter((l) => l.status === 'em_analise').length,
    [leiloesGestao],
  );

  const aoVivo = useMemo(
    () => leiloesGestao.filter((l) => l.status === 'ao_vivo').length,
    [leiloesGestao],
  );

  const leiloesFiltrados = useMemo(() => {
    if (filtro === 'todos') return leiloesGestao;
    return leiloesGestao.filter((l) => l.status === filtro);
  }, [leiloesGestao, filtro]);

  if (!temPermissao('leiloes')) {
    return <Redirect href="/admin/equipe" />;
  }

  async function abrirDetalhes(leilao: AdminLeilao) {
    setImagemGaleriaAtiva(leilao.imagemUrl);
    setLeilaoExpandido(leilao);
    setEventosPedido([]);

    if (leilao.orderId || leilao.status === 'encerrado') {
      setCarregandoEventos(true);
      try {
        const ev = await obterEventosLeilaoAdmin(leilao.id);
        setEventosPedido(ev);
      } catch {
        setEventosPedido([]);
      } finally {
        setCarregandoEventos(false);
      }
    }
  }

  function fecharDetalhes() {
    setLeilaoExpandido(null);
    setImagemGaleriaAtiva(null);
    setEventosPedido([]);
  }

  async function aprovarLeilao(leilao: AdminLeilao) {
    setFeedback(null);
    setProcessandoId(leilao.id);
    try {
      await aprovarLeilaoAdmin(leilao.id);
      const okMsg = `"${leilao.titulo}" está ao vivo no app.`;
      setFeedback({ tipo: 'ok', texto: okMsg });
      alertarAdmin('Aprovado', okMsg);
      await carregar();
      if (leilaoExpandido?.id === leilao.id) fecharDetalhes();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Não foi possível aprovar.';
      setFeedback({ tipo: 'erro', texto: errMsg });
      alertarAdmin('Erro', errMsg);
    } finally {
      setProcessandoId(null);
    }
  }

  async function executarRejeicao(leilao: AdminLeilao) {
    setFeedback(null);
    setProcessandoId(leilao.id);
    try {
      await rejeitarLeilaoAdmin(leilao.id);
      const okMsg = 'O leilão foi removido da fila de análise.';
      setFeedback({ tipo: 'ok', texto: okMsg });
      alertarAdmin('Rejeitado', okMsg);
      await carregar();
      if (leilaoExpandido?.id === leilao.id) fecharDetalhes();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Não foi possível rejeitar.';
      setFeedback({ tipo: 'erro', texto: errMsg });
      alertarAdmin('Erro', errMsg);
    } finally {
      setProcessandoId(null);
    }
  }

  async function confirmarRejeicao(leilao: AdminLeilao) {
    const titulo = 'Rejeitar leilão';
    const mensagem = `O anúncio "${leilao.titulo}" será cancelado. O vendedor precisará publicar novamente.`;
    const confirmar = await confirmarAdmin(titulo, mensagem);
    if (confirmar) {
      await executarRejeicao(leilao);
    }
  }

  function leilaoPermiteModoTeste(status: AdminLeilaoStatus) {
    return status === 'ao_vivo' || status === 'pausado' || status === 'encerrado';
  }

  async function executarAcelerarTeste(leilao: AdminLeilao, minutos: 0 | 1) {
    setFeedback(null);
    setProcessandoId(leilao.id);
    try {
      await acelerarLeilaoTesteAdmin(leilao.id, minutos);
      const okMsg =
        minutos === 0
          ? `"${leilao.titulo}" encerrado agora. Reabra o leilão no app para testar o arremate.`
          : `"${leilao.titulo}" termina em ${minutos} minuto(s). Dê um lance no app e aguarde o cronômetro.`;
      setFeedback({ tipo: 'ok', texto: okMsg });
      alertarAdmin('Modo teste', okMsg);
      await carregar();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Não foi possível ajustar o cronômetro.';
      setFeedback({ tipo: 'erro', texto: errMsg });
      alertarAdmin('Erro', errMsg);
    } finally {
      setProcessandoId(null);
    }
  }

  async function executarPushOportunidade(leilao: AdminLeilao) {
    setFeedback(null);
    setProcessandoId(leilao.id);
    try {
      const enviados = await enviarPushOportunidadeAdmin(leilao.id);
      const okMsg =
        enviados > 0
          ? `Push de oportunidade enviado para ${enviados} usuário(s) com marketing ativo.`
          : 'Nenhum push enfileirado (fora do horário 9h–21h, leilão não ao vivo ou sem opt-in).';
      setFeedback({ tipo: 'ok', texto: okMsg });
      alertarAdmin('Push oportunidade', okMsg);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Não foi possível enviar o push.';
      setFeedback({ tipo: 'erro', texto: errMsg });
      alertarAdmin('Erro', errMsg);
    } finally {
      setProcessandoId(null);
    }
  }

  async function confirmarPushOportunidade(leilao: AdminLeilao) {
    const confirmar = await confirmarAdmin(
      'Enviar push de oportunidade',
      `Dispara alerta de achado para usuários com notificações de marketing ativas.\n\nLeilão: "${leilao.titulo}"`,
    );
    if (confirmar) {
      await executarPushOportunidade(leilao);
    }
  }

  async function confirmarEncerrarAgora(leilao: AdminLeilao) {
    const confirmar = await confirmarAdmin(
      'Encerrar agora (teste)',
      `O leilão "${leilao.titulo}" será encerrado imediatamente.\n\nUse apenas para testar arremate e pagamento. O líder atual vence.`,
    );
    if (confirmar) {
      await executarAcelerarTeste(leilao, 0);
    }
  }

  const imagemModal =
    leilaoExpandido && (imagemGaleriaAtiva ?? leilaoExpandido.imagemUrl);

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Gerenciamento de Leilões</Text>
      <Text style={adminStyles.pageSubtitle}>
        {emAnalise} em análise · {aoVivo} ao vivo · pagamento e entrega em Arrematados
      </Text>

      {isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Modo teste: em leilões ao vivo, use ⏱ 1 min ou ⏹ Agora para validar lances e pagamento
            sem esperar dias.
          </Text>
        </View>
      ) : null}

      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            feedback.tipo === 'ok' ? styles.feedbackOk : styles.feedbackErro,
          ]}>
          <Text
            style={[
              styles.feedbackText,
              feedback.tipo === 'ok' ? styles.feedbackTextOk : styles.feedbackTextErro,
            ]}>
            {feedback.texto}
          </Text>
        </View>
      ) : null}

      <View style={styles.filtrosRow}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filtroChip, filtro === f.id && styles.filtroChipAtivo]}
            onPress={() => setFiltro(f.id)}>
            <Text style={[styles.filtroText, filtro === f.id && styles.filtroTextAtivo]}>
              {f.label}
              {f.id === 'em_analise' && emAnalise > 0 ? ` (${emAnalise})` : ''}
              {f.id === 'ao_vivo' && aoVivo > 0 ? ` (${aoVivo})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {carregando ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adminC.accent} />
        </View>
      ) : erroCarregar ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erroCarregar}</Text>
          <Pressable style={adminStyles.btnSecondary} onPress={carregar}>
            <Text style={adminStyles.btnSecondaryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <View style={adminStyles.card}>
          <View style={[adminStyles.tableHeader, styles.tableGrid]}>
            <Text style={[adminStyles.tableHeaderCell, styles.colTitulo]}>Lote</Text>
            <Text style={[adminStyles.tableHeaderCell, styles.colVendedor]}>Vendedor</Text>
            <Text style={[adminStyles.tableHeaderCell, styles.colLance]}>Lance</Text>
            <Text style={[adminStyles.tableHeaderCell, styles.colStatus]}>Status</Text>
            <Text style={[adminStyles.tableHeaderCell, styles.colPendencia]}>Pendência</Text>
            <Text style={[adminStyles.tableHeaderCell, styles.colAcoes]}>Ações</Text>
          </View>

          {leiloesFiltrados.map((leilao) => (
            <View key={leilao.id} style={[adminStyles.tableRow, styles.tableGrid]}>
              <TouchableOpacity
                style={[styles.colTitulo, styles.loteClicavel]}
                activeOpacity={0.75}
                onPress={() => void abrirDetalhes(leilao)}>
                <Image source={{ uri: leilao.imagemUrl }} style={styles.loteThumb} />
                <View style={styles.loteTextos}>
                  <Text style={[adminStyles.tableCell, styles.loteTitulo]} numberOfLines={2}>
                    {leilao.titulo}
                  </Text>
                  {leilao.promocoes?.length ? (
                    <Text style={styles.promoTag}>{leilao.promocoes.join(' · ')}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.colVendedor}
                onPress={() => void abrirDetalhes(leilao)}>
                <Text style={adminStyles.tableCell}>{leilao.vendedor}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.colLance} onPress={() => void abrirDetalhes(leilao)}>
                <Text style={[adminStyles.tableCell, styles.lanceValue]}>{leilao.lanceAtual}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.colStatus} onPress={() => void abrirDetalhes(leilao)}>
                <StatusBadge status={leilao.status} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.colPendencia}
                onPress={() => void abrirDetalhes(leilao)}>
                {leilao.pendencia ? (
                  <AdminLeilaoPendenciaBadge pendencia={leilao.pendencia} compact />
                ) : (
                  <Text style={styles.semAcao}>—</Text>
                )}
              </TouchableOpacity>

              <View style={[styles.colAcoes, styles.acoesRow]}>
                {leilao.status === 'em_analise' ? (
                  <>
                    <Pressable
                      style={[
                        adminStyles.btnPrimary,
                        styles.btnAcao,
                        processandoId === leilao.id && styles.btnDisabled,
                      ]}
                      onPress={() => void aprovarLeilao(leilao)}
                      disabled={processandoId === leilao.id}>
                      <Text style={adminStyles.btnPrimaryText}>✅ Aprovar</Text>
                    </Pressable>
                    <Pressable
                      style={[adminStyles.btnDanger, processandoId === leilao.id && styles.btnDisabled]}
                      onPress={() => confirmarRejeicao(leilao)}
                      disabled={processandoId === leilao.id}>
                      <Text style={adminStyles.btnDangerText}>❌ Rejeitar</Text>
                    </Pressable>
                  </>
                ) : leilaoPermiteModoTeste(leilao.status) ? (
                  <>
                    <Pressable
                      style={[
                        styles.btnTeste,
                        processandoId === leilao.id && styles.btnDisabled,
                      ]}
                      onPress={() => void executarAcelerarTeste(leilao, 1)}
                      disabled={processandoId === leilao.id}>
                      <Text style={styles.btnTesteText}>⏱ 1 min</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.btnTesteDanger,
                        processandoId === leilao.id && styles.btnDisabled,
                      ]}
                      onPress={() => void confirmarEncerrarAgora(leilao)}
                      disabled={processandoId === leilao.id}>
                      <Text style={styles.btnTesteDangerText}>⏹ Agora</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.semAcao}>—</Text>
                )}
              </View>
            </View>
          ))}

          {leiloesFiltrados.length === 0 && (
            <Text style={styles.empty}>
              {filtro === 'em_analise'
                ? 'Nenhum leilão aguardando análise.'
                : filtro === 'ao_vivo'
                  ? 'Nenhum leilão ao vivo no momento.'
                  : filtro === 'pausado'
                    ? 'Nenhum leilão pausado.'
                    : 'Nenhum leilão ativo neste filtro.'}
            </Text>
          )}
        </View>
      )}

      <Modal
        visible={leilaoExpandido !== null}
        transparent
        animationType="fade"
        onRequestClose={fecharDetalhes}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlayToque} onPress={fecharDetalhes} />
          <View style={styles.modalPainel}>
            {leilaoExpandido && (
              <>
                <Pressable style={styles.modalFechar} onPress={fecharDetalhes}>
                  <Text style={styles.modalFecharText}>✕</Text>
                </Pressable>

                <View style={styles.modalCorpo}>
                  <View style={styles.modalColEsquerda}>
                    <Image
                      source={{ uri: imagemModal }}
                      style={styles.modalImagemPrincipal}
                      resizeMode="cover"
                    />
                    <View style={styles.modalMiniaturas}>
                      {leilaoExpandido.galeriaUrls.map((url, idx) => (
                        <Pressable
                          key={`${url}-${idx}`}
                          onPress={() => setImagemGaleriaAtiva(url)}
                          style={[
                            styles.modalMiniaturaWrap,
                            imagemModal === url && styles.modalMiniaturaAtiva,
                          ]}>
                          <Image source={{ uri: url }} style={styles.modalMiniatura} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <ScrollView
                    style={styles.modalColDireitaScroll}
                    contentContainerStyle={styles.modalColDireita}
                    showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitulo}>{leilaoExpandido.titulo}</Text>
                    <View style={styles.modalBadgesRow}>
                      <StatusBadge status={leilaoExpandido.status} />
                      {leilaoExpandido.pendencia ? (
                        <AdminLeilaoPendenciaBadge pendencia={leilaoExpandido.pendencia} />
                      ) : null}
                    </View>
                    <Text style={styles.modalMeta}>
                      ID: <Text style={styles.modalMetaDestaque}>{leilaoExpandido.id}</Text>
                    </Text>
                    <Pressable
                      onPress={() => {
                        fecharDetalhes();
                        router.push(
                          `/admin/vendedores/${encodeURIComponent(
                            resolverVendorId(leilaoExpandido.vendedor),
                          )}` as never,
                        );
                      }}>
                      <Text style={styles.modalMeta}>
                        Vendedor:{' '}
                        <Text style={styles.modalVendedorLink}>{leilaoExpandido.vendedor}</Text>
                      </Text>
                    </Pressable>

                    <AdminLeilaoFluxoPanel leilao={leilaoExpandido} eventos={eventosPedido} />
                    {carregandoEventos ? (
                      <ActivityIndicator size="small" color={adminC.accent} style={styles.eventosLoad} />
                    ) : null}

                    <Text style={styles.modalSecaoTitulo}>Descrição</Text>
                    <Text style={styles.modalDescricao}>{leilaoExpandido.descricao}</Text>

                    {leilaoExpandido.status === 'em_analise' ? (
                      <View style={styles.modalAcoes}>
                        <Pressable
                          style={[adminStyles.btnPrimary, styles.btnAcao]}
                          onPress={() => void aprovarLeilao(leilaoExpandido)}>
                          <Text style={adminStyles.btnPrimaryText}>Aprovar e publicar ao vivo</Text>
                        </Pressable>
                        <Pressable
                          style={[adminStyles.btnDanger, styles.btnAcao]}
                          onPress={() => void confirmarRejeicao(leilaoExpandido)}>
                          <Text style={adminStyles.btnDangerText}>Rejeitar anúncio</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {leilaoExpandido.status === 'ao_vivo' ? (
                      <View style={styles.modalPushBox}>
                        <Text style={styles.modalSecaoTitulo}>Marketing</Text>
                        <Text style={styles.modalTesteHint}>
                          Envia push de oportunidade para quem ativou alertas de achados (9h–21h).
                        </Text>
                        <Pressable
                          style={[styles.btnPushOportunidade, styles.btnAcao]}
                          onPress={() => void confirmarPushOportunidade(leilaoExpandido)}
                          disabled={processandoId === leilaoExpandido.id}>
                          <Text style={styles.btnPushOportunidadeText}>📣 Push oportunidade</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {leilaoPermiteModoTeste(leilaoExpandido.status) ? (
                      <View style={styles.modalTesteBox}>
                        <Text style={styles.modalSecaoTitulo}>Modo teste</Text>
                        <Text style={styles.modalTesteHint}>
                          Encurta o cronômetro para validar lance, vitória e checkout no app.
                        </Text>
                        <Pressable
                          style={[styles.btnTesteModal, styles.btnAcao]}
                          onPress={() => void executarAcelerarTeste(leilaoExpandido, 1)}
                          disabled={processandoId === leilaoExpandido.id}>
                          <Text style={styles.btnTesteText}>⏱ Encerrar em 1 minuto</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.btnTesteDangerModal, styles.btnAcao]}
                          onPress={() => void confirmarEncerrarAgora(leilaoExpandido)}
                          disabled={processandoId === leilaoExpandido.id}>
                          <Text style={styles.btnTesteDangerText}>⏹ Encerrar agora</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: adminC.border,
    backgroundColor: adminC.card,
  },
  filtroChipAtivo: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  filtroText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminC.textMuted,
  },
  filtroTextAtivo: {
    color: adminC.accentBright,
  },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  erroBox: { gap: 12, padding: 16 },
  erroText: { color: '#FCA5A5', fontSize: 13, lineHeight: 20 },
  tableGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  colTitulo: { flex: 2.2, minWidth: 220 },
  colVendedor: { flex: 1, minWidth: 110, justifyContent: 'center' },
  colLance: { flex: 1, minWidth: 110, justifyContent: 'center' },
  colStatus: { width: 100, justifyContent: 'center' },
  colPendencia: { width: 140, justifyContent: 'center' },
  colAcoes: { flex: 1.8, minWidth: 200 },
  loteClicavel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer' as const,
  },
  loteTextos: { flex: 1, gap: 4 },
  loteThumb: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.border,
  },
  loteTitulo: { fontWeight: '600' },
  promoTag: { fontSize: 10, color: adminC.accentBright, fontWeight: '700' },
  lanceValue: { fontWeight: '700', color: adminC.accentBright },
  acoesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  btnDisabled: { opacity: 0.5 },
  btnAcao: Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {},
  feedbackBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  feedbackOk: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackErro: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: { fontSize: 13, lineHeight: 20 },
  feedbackTextOk: { color: '#047857' },
  feedbackTextErro: { color: '#B91C1C' },
  btnTeste: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnTesteText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  btnTesteDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnTesteDangerText: { fontSize: 11, fontWeight: '700', color: '#B91C1C' },
  btnTesteModal: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTesteDangerModal: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTesteBox: {
    marginTop: 16,
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  modalPushBox: {
    marginTop: 16,
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  btnPushOportunidade: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPushOportunidadeText: { fontSize: 12, fontWeight: '700', color: adminC.accent },
  modalTesteHint: { fontSize: 12, color: adminC.textMuted, lineHeight: 18 },
  semAcao: { color: adminC.textMuted, fontSize: 12 },
  empty: {
    textAlign: 'center',
    color: adminC.textMuted,
    padding: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalOverlayToque: { ...StyleSheet.absoluteFillObject },
  modalPainel: {
    width: '100%' as unknown as number,
    maxWidth: 960,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: adminC.border,
    padding: 28,
    position: 'relative',
    zIndex: 2,
  },
  modalFechar: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: adminC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFecharText: {
    color: adminC.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  modalCorpo: { flexDirection: 'row', gap: 32, marginTop: 8, maxHeight: '82vh' as unknown as number },
  modalColEsquerda: { flex: 1.1, minWidth: 280 },
  modalColDireitaScroll: { flex: 1, minWidth: 260, maxHeight: '78vh' as unknown as number },
  modalColDireita: { paddingRight: 24, gap: 8, paddingBottom: 16 },
  modalBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  eventosLoad: { alignSelf: 'flex-start', marginTop: 4 },
  modalImagemPrincipal: {
    width: '100%' as unknown as number,
    height: 320,
    borderRadius: 14,
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.border,
  },
  modalMiniaturas: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalMiniaturaWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.75,
  },
  modalMiniaturaAtiva: { borderColor: adminC.accentBright, opacity: 1 },
  modalMiniatura: {
    width: '100%' as unknown as number,
    height: 72,
    backgroundColor: adminC.bg,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: adminC.textPrimary,
    paddingRight: 40,
    lineHeight: 28,
  },
  modalMeta: { fontSize: 13, color: adminC.textMuted },
  modalMetaDestaque: { color: adminC.textSecondary, fontWeight: '600' },
  modalVendedorLink: {
    color: adminC.accentBright,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalSecaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
  },
  modalDescricao: { fontSize: 14, color: adminC.textSecondary, lineHeight: 22 },
  modalAcoes: { gap: 10, marginTop: 20 },
});
