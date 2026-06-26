import { useFocusEffect, useRouter } from 'expo-router';
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
import { KycDesktopWebBlock } from '@/components/kyc/KycDesktopWebBlock';
import { KycDocumentPicker } from '@/components/kyc/KycDocumentPicker';
import { KycFormField } from '@/components/kyc/KycFormField';
import { KycSelfiePicker } from '@/components/kyc/KycSelfiePicker';
import { TermsAcceptanceBlock } from '@/components/kyc/TermsAcceptanceBlock';
import { useKycCapturePlatform } from '@/src/hooks/useKycCapturePlatform';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { cpfValido, formatarCpf, normalizarCpf } from '@/src/lib/cpf';
import { cepValido, formatarCep } from '@/src/lib/cep';
import { isUsingMockBackend } from '@/src/lib/auth';
import { emailValido, formatarTelefone, telefoneValido } from '@/src/lib/kycFormUtils';
import {
  dataNascimentoValida,
  formatarDataNascimento,
  nomeCompletoValido,
} from '@/src/lib/kycValidation';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { buscarEnderecoPorCep } from '@/src/lib/viacep';
import { obterPoliticaAtual } from '@/src/services/appPolicies';
import { aprovarKycMock, enviarCadastroKyc } from '@/src/services/kycProfile';
import { useKyc } from '@/src/store/kycContext';
import type { AppPolicy } from '@/src/types/appPolicy';
import type { AtualizarContatoKycInput } from '@/src/types/kyc';
import { cadastroInicialJaEnviado } from '@/src/types/kyc';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

/** Primeiro cadastro KYC — CPF, documentos e selfie (uso único). */
export default function KycCadastroScreen() {
  const router = useRouter();
  const { perfil, atualizar, carregando } = useKyc();
  const { kycCadastroBlockedOnWeb } = useKycCapturePlatform();
  const mockMode = isUsingMockBackend();

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [documentoUri, setDocumentoUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieVerificada, setSelfieVerificada] = useState(false);

  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [termosAceitos, setTermosAceitos] = useState(false);
  const [termosPolicy, setTermosPolicy] = useState<AppPolicy | null>(null);
  const [carregandoTermos, setCarregandoTermos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [nomeTouched, setNomeTouched] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [dataTouched, setDataTouched] = useState(false);

  const numeroRef = useRef<TextInput>(null);
  const ultimoCepBuscadoRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      atualizar();
    }, [atualizar]),
  );

  useFocusEffect(
    useCallback(() => {
      if (carregando) return;
      if (cadastroInicialJaEnviado(perfil)) {
        router.replace('/kyc');
      }
    }, [carregando, perfil, router]),
  );

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      setCarregandoTermos(true);
      obterPoliticaAtual('comprador_termo_arremate')
        .then((policy) => {
          if (ativo) setTermosPolicy(policy);
        })
        .catch(() => {
          if (ativo) setTermosPolicy(null);
        })
        .finally(() => {
          if (ativo) setCarregandoTermos(false);
        });
      return () => {
        ativo = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!perfil) return;

      setNomeCompleto(perfil.nomeCompleto ?? '');
      setCpf(perfil.cpf ? formatarCpf(perfil.cpf) : '');
      setDataNascimento(perfil.dataNascimento ?? '');
      setDocumentoUri(perfil.documentoUrl);
      setSelfieUri(perfil.selfieUrl);
      setSelfieVerificada(false);
      setTermosAceitos(Boolean(perfil.termosAceitos));

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

  const cpfLimpo = normalizarCpf(cpf);
  const cpfOk = cpfLimpo.length === 11 && cpfValido(cpfLimpo);
  const nomeOk = nomeCompletoValido(nomeCompleto);
  const dataOk = dataNascimentoValida(dataNascimento);
  const emailOk = emailValido(email);
  const telefoneOk = telefoneValido(telefone);
  const cepOk = cepValido(cep);

  const nomeErro = !nomeOk
    ? nomeCompleto.trim().length === 0
      ? 'Informe seu nome completo.'
      : 'Use nome e sobrenome, como no documento.'
    : null;

  const cpfErro = !cpfOk
    ? cpfLimpo.length === 0
      ? 'Informe seu CPF.'
      : cpfLimpo.length < 11
        ? 'CPF incompleto.'
        : 'CPF inválido.'
    : null;

  const dataErro = !dataOk
    ? dataNascimento.replace(/\D/g, '').length === 0
      ? 'Informe sua data de nascimento.'
      : 'Data inválida ou idade mínima de 18 anos.'
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

  const podeEnviar = useMemo(
    () =>
      nomeOk &&
      cpfOk &&
      dataOk &&
      Boolean(documentoUri) &&
      Boolean(selfieUri) &&
      selfieVerificada &&
      Boolean(termosPolicy) &&
      termosAceitos &&
      !carregandoTermos &&
      !enviando,
    [
      nomeOk,
      cpfOk,
      dataOk,
      documentoUri,
      selfieUri,
      selfieVerificada,
      termosPolicy,
      termosAceitos,
      carregandoTermos,
      enviando,
    ],
  );

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

  async function handleSubmit() {
    setNomeTouched(true);
    setCpfTouched(true);
    setDataTouched(true);

    if (!nomeOk) {
      Alert.alert('Dados incompletos', nomeErro ?? 'Informe seu nome completo.');
      return;
    }
    if (!cpfOk) {
      Alert.alert('CPF inválido', cpfErro ?? 'Verifique o CPF informado.');
      return;
    }
    if (!dataOk) {
      Alert.alert('Data inválida', dataErro ?? 'Verifique sua data de nascimento.');
      return;
    }
    if (!documentoUri) {
      Alert.alert('Documento obrigatório', 'Envie foto do RG ou CNH.');
      return;
    }
    if (!selfieUri || !selfieVerificada) {
      Alert.alert(
        'Selfie não verificada',
        'Capture uma selfie e aguarde a verificação facial com IA antes de enviar.',
      );
      return;
    }
    if (!termosAceitos) {
      Alert.alert('Termos obrigatórios', 'Aceite os termos de arremate antes de enviar.');
      return;
    }

    const userId = await obterIdUsuarioAtual();
    if (!userId) {
      Alert.alert('Sessão', 'Faça login para enviar o cadastro completo.');
      return;
    }

    setEnviando(true);
    try {
      await enviarCadastroKyc(userId, {
        nomeCompleto: nomeCompleto.trim(),
        cpf: cpfLimpo,
        dataNascimento,
        documentoUri,
        selfieUri,
        termosAceitosEm: new Date(),
        contato: contatoPreenchido ? montarContato() : undefined,
      });
      await atualizar();
      Alert.alert(
        'Cadastro enviado',
        'Seus documentos foram recebidos e estão em análise.',
        [{ text: 'OK', onPress: () => router.replace('/kyc') }],
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar o cadastro.');
    } finally {
      setEnviando(false);
    }
  }

  async function simularAprovacaoMock() {
    await aprovarKycMock();
    await atualizar();
    Alert.alert('Modo teste', 'KYC aprovado localmente.', [
      { text: 'OK', onPress: () => router.replace('/kyc') },
    ]);
  }

  if (carregando || cadastroInicialJaEnviado(perfil)) {
    return (
      <SubScreenLayout
        title="Cadastro completo (KYC)"
        subtitle="Verificação de identidade">
        <ActivityIndicator color={lightColors.accent} style={styles.loader} />
      </SubScreenLayout>
    );
  }

  if (kycCadastroBlockedOnWeb) {
    return (
      <SubScreenLayout
        title="Cadastro completo (KYC)"
        subtitle="Verificação de identidade">
        <KycDesktopWebBlock />
      </SubScreenLayout>
    );
  }

  return (
    <SubScreenLayout
      title="Cadastro completo (KYC)"
      subtitle="Verificação obrigatória para dar lances nos leilões">
      <Text style={styles.sectionTitle}>Identificação civil</Text>
      <Text style={styles.sectionHint}>
        Preencha exatamente como consta no seu documento oficial. Estes dados só podem ser enviados
        uma vez.
      </Text>

      <KycFormField
        label="Nome completo"
        value={nomeCompleto}
        onChangeText={setNomeCompleto}
        onBlur={() => setNomeTouched(true)}
        placeholder="Como consta no documento"
        autoCapitalize="words"
        autoCorrect={false}
        editable={!enviando}
        touched={nomeTouched}
        error={nomeErro}
      />

      <KycFormField
        label="CPF"
        value={cpf}
        onChangeText={(t) => setCpf(formatarCpf(t))}
        onBlur={() => setCpfTouched(true)}
        placeholder="000.000.000-00"
        keyboardType="numeric"
        maxLength={14}
        editable={!enviando}
        touched={cpfTouched}
        error={cpfErro}
      />

      <KycFormField
        label="Data de nascimento"
        value={dataNascimento}
        onChangeText={(t) => setDataNascimento(formatarDataNascimento(t))}
        onBlur={() => setDataTouched(true)}
        placeholder="DD/MM/AAAA"
        keyboardType="numeric"
        maxLength={10}
        editable={!enviando}
        touched={dataTouched}
        error={dataErro}
      />

      <Text style={styles.sectionTitle}>Documentos</Text>
      <Text style={styles.sectionHint}>
        Envie fotos nítidas. Dados devem coincidir com o nome informado acima.
      </Text>

      <KycDocumentPicker
        label="RG ou CNH (frente)"
        hint="Foto legível, sem reflexos ou cortes nas bordas."
        uri={documentoUri}
        onChange={setDocumentoUri}
        disabled={enviando}
      />

      <KycSelfiePicker
        uri={selfieUri}
        onChange={(uri) => {
          setSelfieUri(uri);
          if (!uri) setSelfieVerificada(false);
        }}
        onVerifiedChange={setSelfieVerificada}
        validated={selfieVerificada}
        disabled={enviando}
      />

      <Text style={styles.sectionTitle}>Contato e endereço</Text>
      <Text style={styles.sectionHint}>
        Usado para entregas. CEP preenche rua, bairro, cidade e UF automaticamente.
      </Text>

      <KycFormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!enviando}
      />

      <KycFormField
        label="Telefone"
        value={telefone}
        onChangeText={(t) => setTelefone(formatarTelefone(t))}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        maxLength={16}
        editable={!enviando}
      />

      <KycFormField
        label="CEP"
        value={cep}
        onChangeText={handleCepChange}
        placeholder="00000-000"
        keyboardType="numeric"
        maxLength={9}
        editable={!enviando && !buscandoCep}
        hint={buscandoCep ? 'Consultando ViaCEP…' : undefined}
      />

      <KycFormField
        label="Rua / logradouro"
        value={rua}
        onChangeText={setRua}
        placeholder="Preenchido pelo CEP"
        editable={!enviando}
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
            editable={!enviando}
          />
        </View>
        <View style={styles.rowItem}>
          <KycFormField
            compact
            label="Complemento"
            value={complemento}
            onChangeText={setComplemento}
            placeholder="Apto, bloco…"
            editable={!enviando}
          />
        </View>
      </View>

      <KycFormField
        label="Bairro"
        value={bairro}
        onChangeText={setBairro}
        editable={!enviando}
      />

      <View style={styles.row}>
        <View style={styles.rowItemLarge}>
          <KycFormField
            compact
            label="Cidade"
            value={cidade}
            onChangeText={setCidade}
            editable={!enviando}
          />
        </View>
        <View style={styles.rowItemSmall}>
          <KycFormField
            compact
            label="UF"
            value={uf}
            onChangeText={(t) => setUf(t.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
            maxLength={2}
            editable={!enviando}
          />
        </View>
      </View>

      <TermsAcceptanceBlock
        aceito={termosAceitos}
        onToggle={() => setTermosAceitos((v) => !v)}
        policy={termosPolicy}
        carregando={carregandoTermos}
      />

      <Pressable
        style={[styles.submitBtn, !podeEnviar && styles.submitBtnLocked]}
        onPress={handleSubmit}
        disabled={!podeEnviar}>
        {enviando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.submitBtnText, !podeEnviar && styles.submitBtnTextLocked]}>
            Enviar cadastro para análise
          </Text>
        )}
      </Pressable>

      {!podeEnviar ? (
        <Text style={styles.formHint}>
          Preencha todos os campos, anexe documento e selfie, e aceite os termos para habilitar o
          envio.
        </Text>
      ) : null}

      {mockMode ? (
        <Pressable style={styles.mockBtn} onPress={simularAprovacaoMock}>
          <Text style={styles.mockBtnText}>[Demo] Aprovar KYC localmente</Text>
        </Pressable>
      ) : null}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xl },
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
  },
  submitBtnLocked: { backgroundColor: '#D1D5DB' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  submitBtnTextLocked: { color: '#9CA3AF' },
  formHint: {
    marginTop: spacing.sm,
    fontSize: 11,
    lineHeight: 16,
    color: lightColors.textMuted,
    textAlign: 'center',
  },
  mockBtn: { marginTop: spacing.md, padding: spacing.sm, alignItems: 'center' },
  mockBtnText: { fontSize: 12, color: lightColors.textMuted, fontWeight: '600' },
});
