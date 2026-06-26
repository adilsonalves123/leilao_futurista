import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import type { AdminUsuario, StatusContaUsuario } from '@/src/admin/types';
import {
  atualizarStatusContaAdmin,
  carregarDocumentosUsuarioAdmin,
  listarUsuariosAdmin,
} from '@/src/services/adminUsuarios';
import { formatarCpfExibicao } from '@/src/services/adminKyc';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { adminC, adminStyles } from './_components/adminStyles';

const STATUS_CONTA_LABEL: Record<StatusContaUsuario, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  bloqueado: 'Bloqueado',
  banido: 'Banido',
};

const STATUS_CONTA_CORES: Record<StatusContaUsuario, { bg: string; text: string }> = {
  ativo: { bg: '#D1FAE5', text: adminC.success },
  suspenso: { bg: '#FEF3C7', text: '#B45309' },
  bloqueado: { bg: '#FFEDD5', text: '#C2410C' },
  banido: { bg: '#FEE2E2', text: adminC.danger },
};

const PUNICAO_DESCRICAO: Record<Exclude<StatusContaUsuario, 'ativo'>, string> = {
  suspenso:
    'O usuário ficará suspenso: não poderá dar lances até a punição ser revertida (Reativar).',
  bloqueado:
    'O usuário ficará bloqueado: acesso restrito à plataforma até reativação manual.',
  banido:
    'Banimento permanente. Em produção, também bloqueie o usuário no Auth do Supabase.',
};

async function confirmarAcao(titulo: string, mensagem: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.confirm(`${titulo}\n\n${mensagem}`);
  }
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
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

function formatarEndereco(u: AdminUsuario): string {
  const partes = [
    u.enderecoLogradouro,
    u.enderecoNumero ? `nº ${u.enderecoNumero}` : null,
    u.enderecoComplemento,
    u.enderecoBairro,
    u.enderecoCidade && u.enderecoUf ? `${u.enderecoCidade}/${u.enderecoUf}` : u.enderecoCidade,
    u.cep ? `CEP ${u.cep}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : '—';
}

function urlExibivelDireta(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return null;
}

export default function AdminUsuarios() {
  const { temPermissao } = useAdminSession();
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [docsPorUsuario, setDocsPorUsuario] = useState<
    Record<string, { documentoUrl: string | null; selfieUrl: string | null }>
  >({});
  const [carregandoDocsId, setCarregandoDocsId] = useState<string | null>(null);
  const [aplicandoId, setAplicandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const docsCarregadosRef = useRef(new Set<string>());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    docsCarregadosRef.current.clear();
    setDocsPorUsuario({});
    setCarregandoDocsId(null);
    try {
      const lista = await listarUsuariosAdmin();
      setUsuarios(lista);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar usuários.';
      setErro(msg);
      setUsuarios([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((u) => {
      const nome = (u.nomeCompleto ?? u.nome ?? '').toLowerCase();
      const apelido = (u.displayName ?? '').toLowerCase();
      const email = u.email.toLowerCase();
      return nome.includes(termo) || apelido.includes(termo) || email.includes(termo);
    });
  }, [usuarios, busca]);

  useEffect(() => {
    if (!expandidoId) return;
    const usuario = usuarios.find((u) => u.id === expandidoId);
    if (!usuario) return;
    if (docsCarregadosRef.current.has(expandidoId)) return;

    const docDireto = urlExibivelDireta(usuario.documentoUrl);
    const selfieDireto = urlExibivelDireta(usuario.selfieUrl);
    const precisaResolver =
      (usuario.documentoUrl && !docDireto) || (usuario.selfieUrl && !selfieDireto);

    if (!usuario.documentoUrl && !usuario.selfieUrl) {
      docsCarregadosRef.current.add(expandidoId);
      setDocsPorUsuario((prev) => ({
        ...prev,
        [expandidoId]: { documentoUrl: null, selfieUrl: null },
      }));
      return;
    }

    if (!precisaResolver) {
      docsCarregadosRef.current.add(expandidoId);
      setDocsPorUsuario((prev) => ({
        ...prev,
        [expandidoId]: {
          documentoUrl: docDireto ?? usuario.documentoUrl ?? null,
          selfieUrl: selfieDireto ?? usuario.selfieUrl ?? null,
        },
      }));
      return;
    }

    let cancelado = false;
    setCarregandoDocsId(expandidoId);

    carregarDocumentosUsuarioAdmin(usuario)
      .then((docs) => {
        if (cancelado) return;
        docsCarregadosRef.current.add(expandidoId);
        setDocsPorUsuario((prev) => ({ ...prev, [expandidoId]: docs }));
      })
      .catch(() => {
        if (cancelado) return;
        docsCarregadosRef.current.add(expandidoId);
        setDocsPorUsuario((prev) => ({
          ...prev,
          [expandidoId]: {
            documentoUrl: docDireto ?? usuario.documentoUrl ?? null,
            selfieUrl: selfieDireto ?? usuario.selfieUrl ?? null,
          },
        }));
      })
      .finally(() => {
        if (!cancelado) setCarregandoDocsId(null);
      });

    return () => {
      cancelado = true;
    };
  }, [expandidoId, usuarios]);

  if (!temPermissao('usuarios')) {
    return <Redirect href="/admin/equipe" />;
  }

  function alternarExpansao(id: string) {
    setExpandidoId((atual) => (atual === id ? null : id));
  }

  async function aplicarPunicao(usuario: AdminUsuario, novoStatus: StatusContaUsuario) {
    if (usuario.statusConta === novoStatus) return;

    const titulo =
      novoStatus === 'ativo'
        ? 'Reativar conta'
        : novoStatus === 'suspenso'
          ? 'Suspender usuário'
          : novoStatus === 'bloqueado'
            ? 'Bloquear usuário'
            : 'Banir usuário';

    const descricaoExtra =
      novoStatus === 'ativo'
        ? 'A conta voltará ao status Ativo e o usuário poderá usar a plataforma normalmente.'
        : PUNICAO_DESCRICAO[novoStatus];

    const mensagem = `${usuario.nome} (${usuario.email})\n\n${descricaoExtra}`;
    const confirmar = await confirmarAcao(titulo, mensagem);
    if (!confirmar) return;

    setAplicandoId(usuario.id);
    try {
      await atualizarStatusContaAdmin(usuario.id, novoStatus);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id ? { ...u, status: novoStatus, statusConta: novoStatus } : u,
        ),
      );
      const okMsg =
        novoStatus === 'ativo'
          ? 'Conta reativada.'
          : `Punição aplicada: ${STATUS_CONTA_LABEL[novoStatus]}.`;
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
      setAplicandoId(null);
    }
  }

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Gerenciamento de Usuários</Text>
      <Text style={adminStyles.pageSubtitle}>
        Clique em um usuário para ver dados completos, documentos KYC e aplicar punições. KYC:
        use{' '}
        <Link href="/admin/kyc" style={styles.linkKyc}>
          Verificação KYC
        </Link>
        .
      </Text>

      {isSupabaseConfigured() ? (
        <View style={styles.toolbar}>
          <Pressable style={styles.refreshBtn} onPress={carregar} disabled={carregando}>
            <Text style={styles.refreshText}>{carregando ? 'Carregando…' : 'Atualizar lista'}</Text>
          </Pressable>
          <Text style={styles.total}>
            {busca.trim()
              ? `${filtrados.length} de ${usuarios.length} usuário(s)`
              : `${usuarios.length} usuário(s)`}
          </Text>
        </View>
      ) : (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>Modo demonstração — lista fictícia.</Text>
        </View>
      )}

      <View style={styles.searchCard}>
        <Ionicons name="search" size={20} color={adminC.accentBright} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou e-mail…"
          placeholderTextColor={adminC.textMuted}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {busca.trim() ? (
          <Pressable onPress={() => setBusca('')} hitSlop={8} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={20} color={adminC.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {erro ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>{erro}</Text>
        </View>
      ) : null}

      {carregando ? (
        <ActivityIndicator color={adminC.accent} style={{ marginTop: 24 }} />
      ) : usuarios.length === 0 ? (
        <View style={adminStyles.card}>
          <Text style={styles.empty}>
            Nenhum usuário no banco. Cadastros pelo app aparecem aqui após login.
          </Text>
        </View>
      ) : filtrados.length === 0 ? (
        <View style={adminStyles.card}>
          <Text style={styles.empty}>Nenhum usuário encontrado para &quot;{busca.trim()}&quot;.</Text>
        </View>
      ) : (
        filtrados.map((usuario) => (
          <UsuarioCard
            key={usuario.id}
            usuario={usuario}
            expandido={expandidoId === usuario.id}
            docs={docsPorUsuario[usuario.id]}
            carregandoDocs={carregandoDocsId === usuario.id}
            aplicando={aplicandoId === usuario.id}
            onToggle={() => alternarExpansao(usuario.id)}
            onPunicao={(status) => aplicarPunicao(usuario, status)}
          />
        ))
      )}
    </View>
  );
}

function UsuarioCard({
  usuario,
  expandido,
  docs,
  carregandoDocs,
  aplicando,
  onToggle,
  onPunicao,
}: {
  usuario: AdminUsuario;
  expandido: boolean;
  docs?: { documentoUrl: string | null; selfieUrl: string | null };
  carregandoDocs: boolean;
  aplicando: boolean;
  onToggle: () => void;
  onPunicao: (status: StatusContaUsuario) => void;
}) {
  const cores = STATUS_CONTA_CORES[usuario.statusConta];
  const documentoUrl = docs?.documentoUrl ?? usuario.documentoUrl;
  const selfieUrl = docs?.selfieUrl ?? usuario.selfieUrl;

  return (
    <View style={[adminStyles.card, styles.card]}>
      <Pressable style={styles.rowHeader} onPress={onToggle}>
        <Ionicons
          name={expandido ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={adminC.accentBright}
        />
        <View style={styles.rowHeaderMain}>
          <Text style={styles.nomeResumo}>{usuario.nome}</Text>
          <Text style={styles.emailResumo} numberOfLines={1}>
            {usuario.email}
          </Text>
        </View>
        <View style={styles.rowHeaderMeta}>
          <Text style={styles.kycResumo} numberOfLines={1}>
            {usuario.statusKyc ?? '—'}
          </Text>
          <Text style={styles.saldoResumo}>{usuario.saldoFtk}</Text>
          <View style={[adminStyles.badge, { backgroundColor: cores.bg }]}>
            <Text style={[adminStyles.badgeText, { color: cores.text }]}>
              {STATUS_CONTA_LABEL[usuario.statusConta]}
            </Text>
          </View>
        </View>
      </Pressable>

      {expandido ? (
        <View style={styles.detalhe}>
          <Text style={styles.secaoTitulo}>Dados cadastrais</Text>
          <DetalheLinha label="Nome completo" valor={usuario.nomeCompleto ?? usuario.nome} />
          <DetalheLinha label="Apelido / display" valor={usuario.displayName} />
          <DetalheLinha label="E-mail" valor={usuario.email} />
          <DetalheLinha label="Telefone" valor={usuario.telefone} />
          <DetalheLinha label="CPF" valor={formatarCpfExibicao(usuario.cpf ?? null)} />
          <DetalheLinha label="Papel" valor={usuario.role ?? '—'} />
          <DetalheLinha label="KYC" valor={usuario.statusKyc} />
          <DetalheLinha label="Data de nascimento" valor={usuario.dataNascimento} />
          <DetalheLinha label="Endereço" valor={formatarEndereco(usuario)} />
          <DetalheLinha
            label="Termos aceitos"
            valor={
              usuario.termosAceitos
                ? new Date(usuario.termosAceitos).toLocaleString('pt-BR')
                : '—'
            }
          />
          <DetalheLinha
            label="Cadastro em"
            valor={
              usuario.criadoEm
                ? new Date(usuario.criadoEm).toLocaleString('pt-BR')
                : '—'
            }
          />
          <DetalheLinha label="Saldo FTK" valor={usuario.saldoFtk} />

          <Text style={[styles.secaoTitulo, { marginTop: 16 }]}>Documentos KYC</Text>
          {carregandoDocs ? (
            <ActivityIndicator color={adminC.accent} style={{ marginVertical: 12 }} />
          ) : (
            <>
              {!documentoUrl && !selfieUrl ? (
                <Text style={styles.semDocumento}>
                  Nenhum documento enviado por este usuário.
                </Text>
              ) : null}
              <View style={styles.previewRow}>
                <DocPreview
                  label="RG / CNH"
                  uri={documentoUrl}
                  onPress={() => abrirUrl(documentoUrl)}
                />
                <DocPreview
                  label="Selfie"
                  uri={selfieUrl}
                  onPress={() => abrirUrl(selfieUrl)}
                />
              </View>
              <View style={styles.docLinks}>
                <Pressable
                  style={adminStyles.btnSecondary}
                  onPress={() => abrirUrl(documentoUrl)}>
                  <Text style={adminStyles.btnSecondaryText}>Abrir documento</Text>
                </Pressable>
                <Pressable style={adminStyles.btnSecondary} onPress={() => abrirUrl(selfieUrl)}>
                  <Text style={adminStyles.btnSecondaryText}>Abrir selfie</Text>
                </Pressable>
              </View>
            </>
          )}

          <Text style={[styles.secaoTitulo, { marginTop: 8 }]}>Moderação</Text>
          {aplicando ? (
            <ActivityIndicator color={adminC.accent} style={{ marginVertical: 8 }} />
          ) : (
            <View style={styles.acoes}>
              <Pressable
                style={[
                  styles.btnPunicao,
                  styles.btnSuspender,
                  usuario.statusConta !== 'ativo' && styles.btnDisabled,
                ]}
                disabled={usuario.statusConta !== 'ativo'}
                onPress={() => onPunicao('suspenso')}>
                <Text style={styles.btnPunicaoText}>⏸ Suspender</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btnPunicao,
                  styles.btnBloquear,
                  (usuario.statusConta === 'bloqueado' || usuario.statusConta === 'banido') &&
                    styles.btnDisabled,
                ]}
                disabled={usuario.statusConta === 'bloqueado' || usuario.statusConta === 'banido'}
                onPress={() => onPunicao('bloqueado')}>
                <Text style={styles.btnPunicaoText}>🔒 Bloquear</Text>
              </Pressable>
              <Pressable
                style={[
                  adminStyles.btnDanger,
                  usuario.statusConta === 'banido' && styles.btnDisabled,
                ]}
                disabled={usuario.statusConta === 'banido'}
                onPress={() => onPunicao('banido')}>
                <Text style={adminStyles.btnDangerText}>🚫 Banir</Text>
              </Pressable>
              {usuario.statusConta !== 'ativo' ? (
                <Pressable
                  style={[styles.btnPunicao, styles.btnReativar]}
                  onPress={() => onPunicao('ativo')}>
                  <Text style={styles.btnPunicaoText}>✓ Reativar</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function DetalheLinha({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <View style={styles.detalheLinha}>
      <Text style={styles.detalheLabel}>{label}</Text>
      <Text style={styles.detalheValor}>{valor?.trim() ? valor : '—'}</Text>
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
          <Text style={styles.previewVazio}>Não enviado</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkKyc: { color: adminC.accentBright, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  refreshBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
  },
  refreshText: { color: '#C4B5FD', fontWeight: '600', fontSize: 13 },
  total: { fontSize: 13, color: adminC.textMuted },
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
  empty: { color: adminC.textMuted, textAlign: 'center', fontSize: 14 },
  card: { marginBottom: 12, padding: 0, overflow: 'hidden' },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  rowHeaderMain: { flex: 1, minWidth: 120 },
  rowHeaderMeta: { alignItems: 'flex-end', gap: 4, maxWidth: 140 },
  nomeResumo: { fontSize: 15, fontWeight: '800', color: adminC.textPrimary },
  emailResumo: { fontSize: 12, color: adminC.textMuted, marginTop: 2 },
  kycResumo: { fontSize: 10, color: adminC.textSecondary, fontWeight: '600' },
  saldoResumo: { fontSize: 11, fontWeight: '700', color: adminC.accent },
  detalhe: {
    borderTopWidth: 1,
    borderTopColor: adminC.borderStrong,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: '800',
    color: adminC.accentBright,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  detalheLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  detalheLabel: {
    width: 130,
    fontSize: 12,
    color: adminC.textMuted,
    fontWeight: '600',
  },
  detalheValor: {
    flex: 1,
    minWidth: 160,
    fontSize: 13,
    color: adminC.textPrimary,
  },
  previewRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
  previewImage: { width: '100%', height: 120 },
  previewPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewVazio: { fontSize: 11, color: adminC.textMuted, fontWeight: '600' },
  semDocumento: {
    fontSize: 13,
    color: adminC.textMuted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  docLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnPunicao: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnSuspender: {
    borderColor: '#B45309',
    backgroundColor: '#422006',
  },
  btnBloquear: {
    borderColor: '#C2410C',
    backgroundColor: '#431407',
  },
  btnReativar: {
    borderColor: adminC.success,
    backgroundColor: '#064E3B',
  },
  btnPunicaoText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
});
