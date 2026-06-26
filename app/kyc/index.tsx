import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KycFormField } from '@/components/kyc/KycFormField';
import { KycIdentityVerifiedCard } from '@/components/kyc/KycIdentityVerifiedCard';
import { KycPendingCadastroBanner } from '@/components/kyc/KycPendingCadastroBanner';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { cepValido, formatarCep } from '@/src/lib/cep';
import { emailValido, formatarTelefone, telefoneValido } from '@/src/lib/kycFormUtils';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { buscarEnderecoPorCep } from '@/src/lib/viacep';
import { atualizarContatoKyc } from '@/src/services/kycProfile';
import { useKyc } from '@/src/store/kycContext';
import type { AtualizarContatoKycInput } from '@/src/types/kyc';
import {
  cadastroInicialJaEnviado,
  KYC_STATUS_LABELS,
  precisaCadastroInicial,
} from '@/src/types/kyc';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

/**
 * Edição de perfil (menu Mais → Cadastro completo).
 * Nunca exibe CPF, documentos ou selfie — apenas contato e endereço.
 */
export default function KycEdicaoScreen() {
  const { perfil, atualizar, carregando } = useKyc();

  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [salvandoContato, setSalvandoContato] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [telefoneTouched, setTelefoneTouched] = useState(false);

  const numeroRef = useRef<TextInput>(null);
  const ultimoCepBuscadoRef = useRef('');

  const status = perfil?.statusVerificacao ?? 'pendente';
  const verificado = status === 'aprovado';
  const identidadeEnviada = cadastroInicialJaEnviado(perfil);
  const pendenteCadastro = !carregando && precisaCadastroInicial(perfil);
  const contatoEditavel = !salvandoContato;

  useFocusEffect(
    useCallback(() => {
      atualizar();
    }, [atualizar]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!perfil) return;

      setEmail(perfil.email ?? '');
      setTelefone(perfil.telefone ? formatarTelefone(perfil.telefone) : '');
      setCep(perfil.cep ? formatarCep(perfil.cep) : '');
      setRua(perfil.enderecoLogradouro ?? '');
      setNumero(perfil.enderecoNumero ?? '');
      setComplemento(perfil.enderecoComplemento ?? '');
      setBairro(perfil.enderecoBairro ?? '');
      setCidade(perfil.enderecoCidade ?? '');
      setUf(perfil.enderecoUf ?? '');
      ultimoCepBuscadoRef.current = (perfil.cep ?? '').replace(/\D/g, '');
    }, [perfil]),
  );

  const emailOk = emailValido(email);
  const telefoneOk = telefoneValido(telefone);
  const cepOk = cepValido(cep);

  const emailErro = !emailOk
    ? email.trim().length === 0
      ? 'Informe seu e-mail.'
      : 'E-mail inválido.'
    : null;

  const telefoneErro = !telefoneOk
    ? telefone.replace(/\D/g, '').length === 0
      ? 'Informe seu telefone.'
      : 'Telefone inválido.'
    : null;

  const montarContato = useCallback(
    (): AtualizarContatoKycInput => ({
      email: email.trim(),
      telefone: telefone.trim(),
      cep: formatarCep(cep),
      enderecoLogradouro: rua.trim(),
      enderecoNumero: numero.trim(),
      enderecoComplemento: complemento.trim(),
      enderecoBairro: bairro.trim(),
      enderecoCidade: cidade.trim(),
      enderecoUf: uf.trim().toUpperCase(),
    }),
    [email, telefone, cep, rua, numero, complemento, bairro, cidade, uf],
  );

  const contatoPreenchido = useMemo(
    () => emailOk && telefoneOk && cepOk && rua.trim().length > 0 && numero.trim().length > 0,
    [emailOk, telefoneOk, cepOk, rua, numero],
  );

  const podeSalvarContato = contatoPreenchido && !salvandoContato && contatoEditavel;

  async function handleCepChange(text: string) {
    const formatado = formatarCep(text);
    setCep(formatado);
    const digits = formatado.replace(/\D/g, '');
    if (digits.length !== 8 || digits === ultimoCepBuscadoRef.current) return;

    ultimoCepBuscadoRef.current = digits;
    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCep(digits);
      if (!endereco) {
        Alert.alert('CEP não encontrado', 'Verifique o CEP digitado e tente novamente.');
        return;
      }
      setRua(endereco.logradouro);
      setBairro(endereco.bairro);
      setCidade(endereco.localidade);
      setUf(endereco.uf);
      setTimeout(() => numeroRef.current?.focus(), 120);
    } catch {
      Alert.alert('Erro na consulta', 'Não foi possível buscar o CEP. Tente novamente em instantes.');
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleSalvarContato() {
    setEmailTouched(true);
    setTelefoneTouched(true);

    if (!emailOk) {
      Alert.alert('E-mail inválido', emailErro ?? 'Verifique o e-mail informado.');
      return;
    }
    if (!telefoneOk) {
      Alert.alert('Telefone inválido', telefoneErro ?? 'Verifique o telefone informado.');
      return;
    }
    if (!cepOk) {
      Alert.alert('CEP inválido', 'Informe um CEP com 8 dígitos.');
      return;
    }
    if (!rua.trim() || !numero.trim()) {
      Alert.alert('Endereço incompleto', 'Informe rua e número para salvar.');
      return;
    }

    const userId = await obterIdUsuarioAtual();
    if (!userId) {
      Alert.alert('Sessão', 'Faça login para salvar seus dados.');
      return;
    }

    setSalvandoContato(true);
    try {
      await atualizarContatoKyc(userId, montarContato());
      await atualizar();
      Alert.alert('Salvo', 'E-mail, telefone e endereço atualizados com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar os dados.');
    } finally {
      setSalvandoContato(false);
    }
  }

  return (
    <SubScreenLayout
      title="Edição de perfil"
      subtitle="E-mail, telefone e endereço de entrega">
      {carregando ? <ActivityIndicator color={lightColors.accent} style={styles.loader} /> : null}

      {perfil ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status da verificação</Text>
          <Text style={styles.statusValue}>{KYC_STATUS_LABELS[perfil.statusVerificacao]}</Text>
          <Text style={styles.statusHint}>
            {identidadeEnviada
              ? 'CPF e documentos não podem ser alterados. Atualize apenas contato e entrega.'
              : 'Complete a verificação de identidade para dar lances nos leilões.'}
          </Text>
        </View>
      ) : null}

      {pendenteCadastro ? <KycPendingCadastroBanner /> : null}

      {!carregando && identidadeEnviada && perfil ? (
        <KycIdentityVerifiedCard status={perfil.statusVerificacao} />
      ) : null}

      <Text style={styles.sectionTitle}>Contato e entrega</Text>
      <Text style={styles.sectionHint}>
        CEP preenche rua, bairro, cidade e UF automaticamente (ViaCEP).
      </Text>

      <KycFormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={contatoEditavel}
        touched={emailTouched}
        error={emailErro}
      />

      <KycFormField
        label="Telefone"
        value={telefone}
        onChangeText={(t) => setTelefone(formatarTelefone(t))}
        onBlur={() => setTelefoneTouched(true)}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        maxLength={16}
        editable={contatoEditavel}
        touched={telefoneTouched}
        error={telefoneErro}
      />

      <KycFormField
        label="CEP"
        value={cep}
        onChangeText={handleCepChange}
        placeholder="00000-000"
        keyboardType="numeric"
        maxLength={9}
        editable={contatoEditavel && !buscandoCep}
        hint={buscandoCep ? 'Consultando ViaCEP…' : undefined}
      />

      <KycFormField
        label="Rua / logradouro"
        value={rua}
        onChangeText={setRua}
        placeholder="Preenchido pelo CEP ou digite manualmente"
        editable={contatoEditavel}
      />

      <View style={styles.row}>
        <View style={styles.rowItemLarge}>
          <KycFormField
            ref={numeroRef}
            compact
            label="Número"
            value={numero}
            onChangeText={setNumero}
            placeholder="Nº"
            keyboardType="numeric"
            editable={contatoEditavel}
          />
        </View>
        <View style={styles.rowItem}>
          <KycFormField
            compact
            label="Complemento"
            value={complemento}
            onChangeText={setComplemento}
            placeholder="Apto, bloco…"
            editable={contatoEditavel}
          />
        </View>
      </View>

      <KycFormField
        label="Bairro"
        value={bairro}
        onChangeText={setBairro}
        placeholder="Bairro"
        editable={contatoEditavel}
      />

      <View style={styles.row}>
        <View style={styles.rowItemLarge}>
          <KycFormField
            compact
            label="Cidade"
            value={cidade}
            onChangeText={setCidade}
            placeholder="Cidade"
            editable={contatoEditavel}
          />
        </View>
        <View style={styles.rowItemSmall}>
          <KycFormField
            compact
            label="UF"
            value={uf}
            onChangeText={(t) => setUf(t.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
            placeholder="UF"
            autoCapitalize="characters"
            maxLength={2}
            editable={contatoEditavel}
          />
        </View>
      </View>

      <Pressable
        style={[styles.submitBtn, !podeSalvarContato && styles.submitBtnLocked]}
        onPress={handleSalvarContato}
        disabled={!podeSalvarContato}>
        {salvandoContato ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.submitBtnText, !podeSalvarContato && styles.submitBtnTextLocked]}>
            Salvar alterações
          </Text>
        )}
      </Pressable>

      {identidadeEnviada ? (
        <Text style={styles.lockedHint}>
          {verificado
            ? 'Seu cadastro está aprovado. Você já pode dar lances nos leilões.'
            : 'Seu cadastro foi enviado e está em análise. Assistir aos leilões continua liberado.'}
        </Text>
      ) : null}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.md },
  statusCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
    marginBottom: spacing.lg,
  },
  statusLabel: { fontSize: 11, color: lightColors.textMuted, marginBottom: 4 },
  statusValue: {
    fontSize: 16,
    fontWeight: '800',
    color: lightColors.accent,
    fontFamily: fonts.timerRegular,
  },
  statusHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: lightColors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: lightColors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    fontFamily: fonts.timerRegular,
  },
  sectionHint: {
    fontSize: 12,
    color: lightColors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  rowItem: { flex: 1 },
  rowItemLarge: { flex: 1.2 },
  rowItemSmall: { flex: 0.55, minWidth: 72 },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: lightColors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: lightColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnLocked: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  submitBtnTextLocked: { color: '#9CA3AF' },
  lockedHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
});
