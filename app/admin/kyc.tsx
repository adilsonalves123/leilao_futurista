import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import type { AdminKycSolicitacao } from '@/src/admin/types';
import {
  SELLER_BADGE_ADMIN_OPTIONS,
  SELLER_BADGE_DEFAULT,
  sellerBadgeLabel,
  type SellerBadge,
} from '@/src/constants/sellerBadge';
import {
  atualizarStatusKycAdmin,
  formatarCpfExibicao,
  listarSolicitacoesKyc,
} from '@/src/services/adminKyc';
import { KYC_STATUS_LABELS } from '@/src/types/kyc';
import type { StatusVerificacao } from '@/src/types/database';
import { verificarAdminSupabase, type AdminAuthState } from '@/src/lib/adminAuth';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { adminC, adminStyles } from './_components/adminStyles';

type FiltroKyc = 'todos' | StatusVerificacao;

const FILTROS: { id: FiltroKyc; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aprovado', label: 'Aprovados' },
  { id: 'rejeitado', label: 'Rejeitados' },
];

const STATUS_CORES: Record<StatusVerificacao, { bg: string; text: string }> = {
  pendente: { bg: '#374151', text: '#D1D5DB' },
  em_analise: { bg: '#422006', text: '#FCD34D' },
  aprovado: { bg: '#064E3B', text: '#6EE7B7' },
  rejeitado: { bg: '#450A0A', text: '#FCA5A5' },
};

function normalizarBusca(texto: string): string {
  return texto.trim().toLowerCase();
}

function correspondeBuscaKyc(s: AdminKycSolicitacao, query: string): boolean {
  const q = normalizarBusca(query);
  if (!q) return true;
  const email = s.email.toLowerCase();
  const nome = (s.nomeCompleto ?? s.displayName ?? '').toLowerCase();
  return email.includes(q) || nome.includes(q);
}

function abrirUrl(url: string | null) {
  if (!url) {
    Alert.alert('Documento', 'Nenhum arquivo enviado.');
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('Erro', 'Não foi possível abrir o documento.');
  });
}

export default function AdminKycScreen() {
  const { temPermissao } = useAdminSession();
  const [fila, setFila] = useState<AdminKycSolicitacao[]>([]);
  const [filtro, setFiltro] = useState<FiltroKyc>('todos');
  const [buscaAprovados, setBuscaAprovados] = useState('');
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [authAdmin, setAuthAdmin] = useState<AdminAuthState | null>(null);

  useEffect(() => {
    verificarAdminSupabase().then(setAuthAdmin);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const dados = await listarSolicitacoesKyc();
      setFila(dados);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar fila KYC.';
      setErroCarregar(msg);
      setFila([]);
      Alert.alert('Erro', msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const porStatus =
      filtro === 'todos' ? fila : fila.filter((s) => s.statusVerificacao === filtro);
    if (filtro !== 'aprovado' || !buscaAprovados.trim()) return porStatus;
    return porStatus.filter((s) => correspondeBuscaKyc(s, buscaAprovados));
  }, [fila, filtro, buscaAprovados]);

  const totalAprovados = useMemo(
    () => fila.filter((s) => s.statusVerificacao === 'aprovado').length,
    [fila],
  );

  const contagemAnalise = useMemo(
    () => fila.filter((s) => s.statusVerificacao === 'em_analise').length,
    [fila],
  );

  if (!temPermissao('usuarios')) {
    return <Redirect href="/admin/equipe" />;
  }

  async function confirmarStatus(
    solicitacao: AdminKycSolicitacao,
    status: 'aprovado' | 'rejeitado',
    sellerBadge: SellerBadge = SELLER_BADGE_DEFAULT,
  ) {
    const acao = status === 'aprovado' ? 'Aprovar' : 'Rejeitar';
    const etiquetaMsg =
      status === 'aprovado'
        ? `\nEtiqueta: ${sellerBadgeLabel(sellerBadge)}.`
        : '';
    const mensagem = `${acao} cadastro de ${solicitacao.nomeCompleto ?? solicitacao.email}?${etiquetaMsg}\n\n${
      status === 'aprovado'
        ? 'O usuário poderá dar lances e publicar (como particular ou conforme a etiqueta).'
        : 'O licitante precisará reenviar documentos pelo app.'
    }`;

    const confirmar =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm(`${acao} KYC\n\n${mensagem}`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(`${acao} KYC`, mensagem, [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: acao, onPress: () => resolve(true) },
            ]);
          });

    if (!confirmar) return;
    await executarAtualizacao(solicitacao.id, status, sellerBadge);
  }

  async function executarAtualizacao(
    userId: string,
    status: 'aprovado' | 'rejeitado',
    sellerBadge?: SellerBadge,
  ) {
    setProcessandoId(userId);
    try {
      await atualizarStatusKycAdmin(userId, status, sellerBadge);
      await carregar();
      const okMsg =
        status === 'aprovado'
          ? 'KYC aprovado. O licitante já pode dar lances ao reabrir o app.'
          : 'Cadastro rejeitado. O licitante verá o status ao reabrir o app.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(okMsg);
      } else {
        Alert.alert('Sucesso', okMsg);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Não foi possível atualizar o status.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro\n\n${errMsg}`);
      } else {
        Alert.alert('Erro', errMsg);
      }
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Verificação KYC</Text>
      <Text style={adminStyles.pageSubtitle}>
        Aprove ou rejeite cadastros completos antes de liberar lances nos leilões
      </Text>

      {!isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Modo demonstração: alterações são salvas localmente. Com Supabase ativo, use uma conta
            com role admin e execute a migração 005_admin_kyc_policies.sql.
          </Text>
        </View>
      ) : authAdmin && !authAdmin.logado ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Para ver os cadastros enviados pelo app, faça login com a conta administrador (mesmo
            projeto Supabase do app).
          </Text>
          <Link href="/admin/login" style={styles.loginLink}>
            Ir para login admin
          </Link>
        </View>
      ) : authAdmin && authAdmin.logado && !authAdmin.ehAdmin ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Logado como {authAdmin.email}, mas sem role admin. No SQL Editor do Supabase execute:{' '}
            {'\n'}UPDATE public.users SET role = 'admin' WHERE email = 'SEU_EMAIL';
            {'\n'}Depois execute 023_admin_kyc_rpc.sql e atualize esta página.
          </Text>
        </View>
      ) : null}

      {erroCarregar ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>{erroCarregar}</Text>
        </View>
      ) : null}

      {!erroCarregar && fila.length === 0 && isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Nenhum KYC no banco para este projeto. Confira no SQL Editor:{'\n'}
            SELECT email, status_verificacao, cpf, documento_url IS NOT NULL AS tem_doc FROM public.users
            ORDER BY created_at DESC;{'\n'}
            O app do licitante precisa usar o mesmo .env (URL Supabase). Execute também 027_admin_listar_kyc_fix.sql.
          </Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={adminStyles.statLabel}>Aguardando análise</Text>
          <Text style={styles.statNumber}>{contagemAnalise}</Text>
          <Text style={styles.statSub}>Total na fila: {fila.length}</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={carregar} disabled={carregando}>
          <Ionicons name="refresh" size={18} color="#C4B5FD" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filtroChip, filtro === f.id && styles.filtroChipAtivo]}
            onPress={() => {
              setFiltro(f.id);
              if (f.id !== 'aprovado') setBuscaAprovados('');
            }}>
            <Text style={[styles.filtroText, filtro === f.id && styles.filtroTextAtivo]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtro === 'aprovado' ? (
        <View style={styles.searchCard}>
          <Ionicons name="search" size={20} color={adminC.accentBright} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por e-mail ou nome completo…"
            placeholderTextColor={adminC.textMuted}
            value={buscaAprovados}
            onChangeText={setBuscaAprovados}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {buscaAprovados.length > 0 ? (
            <Pressable onPress={() => setBuscaAprovados('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={adminC.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {filtro === 'aprovado' && !carregando ? (
        <Text style={styles.searchHint}>
          {buscaAprovados.trim()
            ? `${filtrados.length} de ${totalAprovados} aprovado(s) encontrado(s)`
            : `${totalAprovados} aprovado(s) no total`}
        </Text>
      ) : null}

      {carregando ? (
        <ActivityIndicator color={adminC.accent} style={{ marginTop: 32 }} />
      ) : filtrados.length === 0 ? (
        <View style={adminStyles.card}>
          <Text style={styles.emptyText}>
            {filtro === 'aprovado' && buscaAprovados.trim()
              ? 'Nenhum aprovado encontrado para essa busca.'
              : 'Nenhuma solicitação neste filtro.'}
          </Text>
        </View>
      ) : (
        filtrados.map((s) => (
          <KycCard
            key={s.id}
            solicitacao={s}
            processando={processandoId === s.id}
            onAprovar={(badge) => confirmarStatus(s, 'aprovado', badge)}
            onRejeitar={() => confirmarStatus(s, 'rejeitado')}
          />
        ))
      )}
    </View>
  );
}

function KycCard({
  solicitacao,
  processando,
  onAprovar,
  onRejeitar,
}: {
  solicitacao: AdminKycSolicitacao;
  processando: boolean;
  onAprovar: (badge: SellerBadge) => void;
  onRejeitar: () => void;
}) {
  const cores = STATUS_CORES[solicitacao.statusVerificacao];
  const podeModerar = solicitacao.statusVerificacao === 'em_analise' || solicitacao.statusVerificacao === 'pendente';
  const [etiqueta, setEtiqueta] = useState<SellerBadge>(
    solicitacao.sellerBadge ?? SELLER_BADGE_DEFAULT,
  );

  useEffect(() => {
    setEtiqueta(solicitacao.sellerBadge ?? SELLER_BADGE_DEFAULT);
  }, [solicitacao.id, solicitacao.sellerBadge]);

  return (
    <View style={[adminStyles.card, styles.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.nome}>{solicitacao.nomeCompleto ?? '—'}</Text>
          <Text style={styles.email}>{solicitacao.email}</Text>
          <Text style={styles.cpf}>CPF: {formatarCpfExibicao(solicitacao.cpf)}</Text>
        </View>
        <View style={[adminStyles.badge, { backgroundColor: cores.bg }]}>
          <Text style={[adminStyles.badgeText, { color: cores.text }]}>
            {KYC_STATUS_LABELS[solicitacao.statusVerificacao]}
          </Text>
        </View>
      </View>

      {solicitacao.sellerBadge && !podeModerar ? (
        <View style={styles.etiquetaAtualRow}>
          <Text style={styles.etiquetaLabel}>Etiqueta:</Text>
          <SellerBadgeChip badge={solicitacao.sellerBadge} />
        </View>
      ) : null}

      {solicitacao.termosAceitos ? (
        <Text style={styles.termos}>
          Termos aceitos em:{' '}
          {new Date(solicitacao.termosAceitos).toLocaleString('pt-BR')}
        </Text>
      ) : null}

      <View style={styles.previewRow}>
        <DocPreview
          label="RG / CNH"
          uri={solicitacao.documentoUrl}
          onPress={() => abrirUrl(solicitacao.documentoUrl)}
        />
        <DocPreview
          label="Selfie"
          uri={solicitacao.selfieUrl}
          onPress={() => abrirUrl(solicitacao.selfieUrl)}
        />
      </View>

      <View style={styles.docLinks}>
        <Pressable style={adminStyles.btnSecondary} onPress={() => abrirUrl(solicitacao.documentoUrl)}>
          <Text style={adminStyles.btnSecondaryText}>Abrir documento</Text>
        </Pressable>
        <Pressable style={adminStyles.btnSecondary} onPress={() => abrirUrl(solicitacao.selfieUrl)}>
          <Text style={adminStyles.btnSecondaryText}>Abrir selfie</Text>
        </Pressable>
      </View>

      {podeModerar ? (
        <View style={styles.etiquetaSection}>
          <Text style={styles.etiquetaTitle}>Etiqueta de vendedor</Text>
          <Text style={styles.etiquetaHint}>
            Padrão: vendedor particular. Altere se for empresa ou conta oficial.
          </Text>
          <View style={styles.etiquetaOptions}>
            {SELLER_BADGE_ADMIN_OPTIONS.map((opt) => {
              const ativo = etiqueta === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.etiquetaOption, ativo && styles.etiquetaOptionAtivo]}
                  onPress={() => setEtiqueta(opt.id)}>
                  <Text style={[styles.etiquetaOptionText, ativo && styles.etiquetaOptionTextAtivo]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.etiquetaOptionHint}>{opt.hint}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {podeModerar ? (
        <View style={styles.acoes}>
          {processando ? (
            <ActivityIndicator color={adminC.accent} />
          ) : (
            <>
              <Pressable style={styles.btnAprovar} onPress={() => onAprovar(etiqueta)}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.btnAprovarText}>Aprovar KYC</Text>
              </Pressable>
              <Pressable style={adminStyles.btnDanger} onPress={onRejeitar}>
                <Text style={adminStyles.btnDangerText}>Rejeitar</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function DocPreview({
  label,
  uri,
  onPress,
}: {
  label: string;
  uri: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.previewBox} onPress={onPress}>
      <Text style={styles.previewLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
      ) : (
        <View style={styles.previewPlaceholder}>
          <Ionicons name="image-outline" size={28} color={adminC.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: adminC.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: adminC.border,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: adminC.accentBright,
    marginTop: 4,
  },
  statSub: { fontSize: 11, color: adminC.textMuted, marginTop: 6 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
  },
  refreshText: { color: '#C4B5FD', fontWeight: '600', fontSize: 13 },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.bg,
  },
  filtroChipAtivo: {
    backgroundColor: adminC.accent,
    borderColor: adminC.accent,
  },
  filtroText: { fontSize: 13, color: adminC.textMuted, fontWeight: '600' },
  filtroTextAtivo: { color: '#FFF' },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: adminC.textPrimary,
    paddingVertical: Platform.OS === 'web' ? 4 : 0,
  },
  searchHint: {
    fontSize: 12,
    color: adminC.textMuted,
    marginBottom: 14,
    marginTop: -4,
  },
  emptyText: { color: adminC.textMuted, fontSize: 14, textAlign: 'center' },
  loginLink: {
    color: adminC.accentBright,
    fontWeight: '700',
    marginTop: 10,
    fontSize: 14,
  },
  card: { marginBottom: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  cardHeaderText: { flex: 1 },
  nome: { fontSize: 18, fontWeight: '800', color: adminC.textPrimary },
  email: { fontSize: 13, color: adminC.textMuted, marginTop: 2 },
  cpf: { fontSize: 13, color: adminC.textSecondary, marginTop: 4, fontWeight: '600' },
  termos: { fontSize: 11, color: adminC.textMuted, marginBottom: 12 },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  previewBox: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.bg,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    padding: 8,
    textTransform: 'uppercase',
  },
  previewImage: {
    width: '100%',
    height: 120,
  },
  previewPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  etiquetaAtualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  etiquetaLabel: { fontSize: 12, color: adminC.textMuted, fontWeight: '600' },
  etiquetaSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  etiquetaTitle: { fontSize: 13, fontWeight: '800', color: adminC.textPrimary, marginBottom: 4 },
  etiquetaHint: { fontSize: 11, color: adminC.textMuted, marginBottom: 12, lineHeight: 16 },
  etiquetaOptions: { gap: 8 },
  etiquetaOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.bg,
  },
  etiquetaOptionAtivo: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  etiquetaOptionText: { fontSize: 13, fontWeight: '700', color: adminC.textSecondary },
  etiquetaOptionTextAtivo: { color: adminC.accentBright },
  etiquetaOptionHint: { fontSize: 11, color: adminC.textMuted, marginTop: 4, lineHeight: 15 },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: adminC.borderStrong,
    paddingTop: 16,
  },
  btnAprovar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: adminC.success,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    flex: Platform.OS === 'web' ? undefined : 1,
    minWidth: 160,
    justifyContent: 'center',
  },
  btnAprovarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
