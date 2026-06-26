import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import {
  PERMISSOES_LABELS,
  TODAS_PERMISSOES,
  type AdminPermission,
  type Colaborador,
} from '@/src/admin/types';
import { adminC, adminStyles } from './_components/adminStyles';

export default function AdminEquipe() {
  const { colaboradorAtivo, colaboradores, setColaboradorAtivo, adicionarColaborador } =
    useAdminSession();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [permissoes, setPermissoes] = useState<AdminPermission[]>([]);

  function togglePermissao(p: AdminPermission) {
    setPermissoes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function cadastrarColaborador() {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, e-mail e senha provisória.');
      return;
    }
    const novo: Colaborador = {
      id: `c${Date.now()}`,
      nome: nome.trim(),
      email: email.trim(),
      senhaProvisoria: senha.trim(),
      permissoes: [...permissoes],
    };
    adicionarColaborador(novo);
    setNome('');
    setEmail('');
    setSenha('');
    setPermissoes([]);
    Alert.alert('Colaborador cadastrado', `${novo.nome} foi adicionado à equipe (simulação).`);
  }

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Equipe e Controle de Permissões</Text>
      <Text style={adminStyles.pageSubtitle}>
        RBAC — cadastre colaboradores e defina o que cada um pode acessar no painel
      </Text>

      <View style={adminStyles.alertInfo}>
        <Text style={adminStyles.alertInfoText}>
          Simulação RBAC local: colaboradores e permissões ficam apenas no dispositivo. Em
          produção, o acesso real é controlado pelo campo role no Supabase (auth.users /
          public.users). Use esta tela para testar visões do painel.
        </Text>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Visualizar painel como colaborador</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.previewRow}>
            {colaboradores.map((c) => {
              const ativo = colaboradorAtivo.id === c.id;
              const semFinanceiro = !c.permissoes.includes('financeiro');
              return (
                <Pressable
                  key={c.id}
                  style={[styles.previewCard, ativo && styles.previewCardActive]}
                  onPress={() => setColaboradorAtivo(c.id)}>
                  <Text style={[styles.previewNome, ativo && styles.previewNomeActive]}>
                    {c.nome}
                  </Text>
                  <Text style={[styles.previewEmail, ativo && styles.previewEmailActive]}>
                    {c.email}
                  </Text>
                  {semFinanceiro && (
                    <Text style={[styles.previewTag, ativo && styles.previewTagActive]}>
                      Sem acesso financeiro
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Cadastrar novo colaborador</Text>

        <Text style={adminStyles.label}>Nome</Text>
        <TextInput
          style={adminStyles.input}
          placeholder="Nome completo"
          placeholderTextColor={adminC.textMuted}
          value={nome}
          onChangeText={setNome}
        />

        <Text style={adminStyles.label}>E-mail</Text>
        <TextInput
          style={adminStyles.input}
          placeholder="email@luckcode.com.br"
          placeholderTextColor={adminC.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={adminStyles.label}>Senha provisória</Text>
        <TextInput
          style={adminStyles.input}
          placeholder="Senha temporária de primeiro acesso"
          placeholderTextColor={adminC.textMuted}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <Text style={[adminStyles.label, { marginTop: 8 }]}>Permissões</Text>
        {TODAS_PERMISSOES.map((p) => {
          const marcado = permissoes.includes(p);
          const info = PERMISSOES_LABELS[p];
          return (
            <Pressable
              key={p}
              style={styles.checkboxRow}
              onPress={() => togglePermissao(p)}>
              <View style={[styles.checkbox, marcado && styles.checkboxChecked]}>
                {marcado && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabels}>
                <Text style={styles.checkboxTitle}>{info.label}</Text>
                <Text style={styles.checkboxDesc}>{info.descricao}</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable style={[adminStyles.btnPrimary, { marginTop: 16 }]} onPress={cadastrarColaborador}>
          <Text style={adminStyles.btnPrimaryText}>Cadastrar colaborador</Text>
        </Pressable>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Equipe cadastrada</Text>
        {colaboradores.map((c) => (
          <View key={c.id} style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberNome}>{c.nome}</Text>
              <Text style={styles.memberEmail}>{c.email}</Text>
              <Text style={styles.memberPerms}>
                {c.permissoes.length > 0
                  ? c.permissoes.map((p) => PERMISSOES_LABELS[p].label).join(' · ')
                  : 'Nenhuma permissão'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  previewCard: {
    width: 200,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: adminC.border,
  },
  previewCardActive: { backgroundColor: adminC.accent, borderColor: adminC.accent },
  previewNome: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  previewNomeActive: { color: '#FFF' },
  previewEmail: { fontSize: 11, color: adminC.textMuted, marginTop: 4 },
  previewEmailActive: { color: 'rgba(255,255,255,0.8)' },
  previewTag: {
    fontSize: 10,
    fontWeight: '600',
    color: adminC.warning,
    marginTop: 8,
  },
  previewTagActive: { color: '#FDE68A' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: adminC.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: adminC.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: adminC.accent },
  checkMark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  checkboxLabels: { flex: 1 },
  checkboxTitle: { fontSize: 14, fontWeight: '600', color: adminC.textPrimary },
  checkboxDesc: { fontSize: 12, color: adminC.textMuted, marginTop: 2 },
  memberRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: adminC.border,
  },
  memberNome: { fontSize: 15, fontWeight: '700', color: adminC.textPrimary },
  memberEmail: { fontSize: 13, color: adminC.textMuted, marginTop: 2 },
  memberPerms: { fontSize: 12, color: adminC.accent, marginTop: 6, fontWeight: '500' },
});
