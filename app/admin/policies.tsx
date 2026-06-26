import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { isSupabaseConfigured } from '@/src/lib/supabase';
import {
  listarHistoricoPoliticas,
  obterPoliticaAtual,
  salvarNovaVersaoPolitica,
} from '@/src/services/appPolicies';
import {
  APP_POLICY_GROUP_LABELS,
  APP_POLICY_LABELS,
  APP_POLICY_TABS,
  type AppPolicy,
  type AppPolicyGroup,
  type AppPolicyType,
} from '@/src/types/appPolicy';
import { adminC, adminStyles } from './_components/adminStyles';

const GRUPOS: AppPolicyGroup[] = ['comprador', 'vendedor'];

function alertarAdmin(titulo: string, mensagem: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export default function AdminPoliciesScreen() {
  const { temPermissao } = useAdminSession();
  const [tipoAtivo, setTipoAtivo] = useState<AppPolicyType>('comprador_termo_arremate');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [versaoAtual, setVersaoAtual] = useState<number | null>(null);
  const [historico, setHistorico] = useState<AppPolicy[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const tabAtiva = useMemo(
    () => APP_POLICY_TABS.find((tab) => tab.type === tipoAtivo),
    [tipoAtivo],
  );

  const tabsPorGrupo = useMemo(
    () =>
      GRUPOS.map((grupo) => ({
        grupo,
        label: APP_POLICY_GROUP_LABELS[grupo],
        tabs: APP_POLICY_TABS.filter((tab) => tab.grupo === grupo),
      })),
    [],
  );

  const carregar = useCallback(async (type: AppPolicyType) => {
    setCarregando(true);
    try {
      const [atual, lista] = await Promise.all([
        obterPoliticaAtual(type),
        listarHistoricoPoliticas(type),
      ]);
      setTitulo(atual.title);
      setConteudo(atual.content);
      setVersaoAtual(atual.version);
      setHistorico(lista);
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Falha ao carregar políticas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar(tipoAtivo);
  }, [tipoAtivo, carregar]);

  if (!temPermissao('policies')) {
    return <Redirect href="/admin/equipe" />;
  }

  async function handleSalvar() {
    if (!titulo.trim() || !conteudo.trim()) {
      alertarAdmin('Campos obrigatórios', 'Preencha o título e o conteúdo antes de publicar.');
      return;
    }

    const confirmar =
      Platform.OS === 'web'
        ? window.confirm(
            `Publicar nova versão de "${APP_POLICY_LABELS[tipoAtivo]}"?\n\nUsuários passarão a ver este texto no app.`,
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Publicar nova versão',
              `Usuários passarão a ver esta versão de "${APP_POLICY_LABELS[tipoAtivo]}" no app.`,
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Publicar', onPress: () => resolve(true) },
              ],
            );
          });

    if (!confirmar) return;

    setSalvando(true);
    try {
      const nova = await salvarNovaVersaoPolitica({
        title: titulo.trim(),
        content: conteudo.trim(),
        type: tipoAtivo,
      });
      await carregar(tipoAtivo);
      alertarAdmin(
        'Versão publicada',
        `"${APP_POLICY_LABELS[tipoAtivo]}" atualizado para v${nova.version}.`,
      );
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function carregarVersaoHistorico(policy: AppPolicy) {
    setTitulo(policy.title);
    setConteudo(policy.content);
    setVersaoAtual(policy.version);
  }

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Termos e Políticas</Text>
      <Text style={adminStyles.pageSubtitle}>
        Edite textos jurídicos versionados por perfil — cada salvamento gera uma nova versão
        independente
      </Text>

      {!isSupabaseConfigured() ? (
        <View style={adminStyles.alertInfo}>
          <Text style={adminStyles.alertInfoText}>
            Supabase não configurado: alterações ficam salvas localmente (modo demonstração).
            Configure EXPO_PUBLIC_SUPABASE_* para persistir no banco.
          </Text>
        </View>
      ) : null}

      {tabsPorGrupo.map(({ grupo, label, tabs }) => (
        <View key={grupo} style={styles.groupWrap}>
          <Text style={styles.groupLabel}>{label}</Text>
          <View style={styles.tabsRow}>
            {tabs.map((tab) => {
              const ativo = tipoAtivo === tab.type;
              return (
                <Pressable
                  key={tab.type}
                  style={[styles.tab, ativo && styles.tabActive]}
                  onPress={() => setTipoAtivo(tab.type)}>
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={ativo ? '#FFFFFF' : adminC.textMuted}
                  />
                  <View style={styles.tabTextWrap}>
                    <Text style={[styles.tabText, ativo && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                    <Text style={[styles.tabDesc, ativo && styles.tabDescActive]} numberOfLines={1}>
                      {tab.descricao}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={adminStyles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.editorHeading}>
            <Text style={adminStyles.cardTitle}>Editor de conteúdo</Text>
            {tabAtiva ? (
              <Text style={styles.editorType}>
                {APP_POLICY_GROUP_LABELS[tabAtiva.grupo]} · {tabAtiva.label}
              </Text>
            ) : null}
          </View>
          {versaoAtual ? (
            <View style={styles.versionPill}>
              <Text style={styles.versionPillText}>Versão atual: v{versaoAtual}</Text>
            </View>
          ) : null}
        </View>

        {carregando ? (
          <ActivityIndicator color={adminC.accent} style={styles.loader} />
        ) : (
          <>
            <Text style={adminStyles.label}>Título exibido no app</Text>
            <TextInput
              style={adminStyles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex.: Termo Vinculante de Arremate"
              placeholderTextColor={adminC.textMuted}
            />

            <Text style={adminStyles.label}>Conteúdo jurídico</Text>
            <Text style={styles.fieldHint}>
              Use blocos separados por linha em branco. Linhas em MAIÚSCULAS viram títulos de
              cláusula no app (ex.: MULTA IRREVOGÁVEL POR DESISTÊNCIA (30%)).
            </Text>
            <TextInput
              style={styles.textArea}
              value={conteudo}
              onChangeText={setConteudo}
              placeholder="Digite o texto completo desta política..."
              placeholderTextColor={adminC.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actionsRow}>
              <Pressable
                style={[adminStyles.btnPrimary, styles.saveBtn, salvando && styles.btnDisabled]}
                onPress={handleSalvar}
                disabled={salvando || carregando}>
                {salvando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                    <Text style={adminStyles.btnPrimaryText}>Publicar nova versão</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>
          Histórico — {APP_POLICY_LABELS[tipoAtivo]}
        </Text>
        {historico.length === 0 ? (
          <Text style={styles.emptyHist}>Nenhuma versão registrada.</Text>
        ) : (
          <ScrollView style={styles.histScroll} nestedScrollEnabled>
            {historico.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.histRow, index === 0 && styles.histRowLatest]}
                onPress={() => carregarVersaoHistorico(item)}>
                <View style={styles.histMeta}>
                  <Text style={styles.histVersion}>v{item.version}</Text>
                  {index === 0 ? (
                    <View style={styles.latestBadge}>
                      <Text style={styles.latestBadgeText}>Atual</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.histTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.histDate}>{formatarData(item.updatedAt)}</Text>
                <Text style={styles.histPreview} numberOfLines={2}>
                  {item.content}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupWrap: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: adminC.accentBright,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.surface,
    minWidth: 220,
    maxWidth: 320,
    flex: 1,
  },
  tabActive: {
    backgroundColor: adminC.accent,
    borderColor: adminC.accentBright,
  },
  tabTextWrap: {
    flex: 1,
    gap: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminC.textPrimary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: adminC.textMuted,
  },
  tabDescActive: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  editorHeading: {
    flex: 1,
    gap: 4,
  },
  editorType: {
    fontSize: 12,
    color: adminC.textMuted,
    fontWeight: '600',
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: adminC.accent,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  loader: { marginVertical: 24 },
  fieldHint: {
    fontSize: 12,
    color: adminC.textMuted,
    lineHeight: 17,
    marginBottom: 8,
    marginTop: -6,
  },
  textArea: {
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 22,
    color: adminC.textPrimary,
    minHeight: 320,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  emptyHist: {
    fontSize: 13,
    color: adminC.textMuted,
  },
  histScroll: { maxHeight: 360 },
  histRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: adminC.borderStrong,
    gap: 4,
  },
  histRowLatest: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  histMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  histVersion: {
    fontSize: 12,
    fontWeight: '800',
    color: adminC.accentBright,
  },
  latestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: adminC.success,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#022C22',
  },
  histTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: adminC.textPrimary,
  },
  histDate: {
    fontSize: 11,
    color: adminC.textMuted,
  },
  histPreview: {
    fontSize: 12,
    lineHeight: 17,
    color: adminC.textSecondary,
  },
});
