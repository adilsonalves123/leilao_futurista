import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { enviarDocumentoKyc } from '@/src/services/kycUpload';
import type {
  AtualizarContatoKycInput,
  KycProfile,
  StatusVerificacao,
} from '@/src/types/kyc';
import type { Database } from '@/src/types/database';

const MOCK_KYC_KEY = '@aetherion/mock_kyc';

/** Colunas da migration 004 (+ telefone da 010). */
const KYC_SELECT_CORE =
  'id, email, telefone, nome_completo, cpf, documento_url, selfie_url, status_verificacao, termos_aceitos';

const KYC_SELECT_EXT =
  'data_nascimento, cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf';

const KYC_SELECT_FULL = `${KYC_SELECT_CORE}, ${KYC_SELECT_EXT}`;

export type SubmitKycInput = {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  documentoUri: string;
  selfieUri: string;
  termosAceitosEm: Date;
  contato?: AtualizarContatoKycInput;
};

type UserKycRow = {
  id: string;
  email: string;
  telefone?: string | null;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento?: string | null;
  documento_url: string | null;
  selfie_url: string | null;
  cep?: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  status_verificacao: StatusVerificacao;
  termos_aceitos: string | null;
};

const PERFIL_VAZIO = (userId: string): KycProfile => ({
  userId,
  email: null,
  telefone: null,
  nomeCompleto: null,
  cpf: null,
  dataNascimento: null,
  documentoUrl: null,
  selfieUrl: null,
  cep: null,
  enderecoLogradouro: null,
  enderecoNumero: null,
  enderecoComplemento: null,
  enderecoBairro: null,
  enderecoCidade: null,
  enderecoUf: null,
  statusVerificacao: 'pendente',
  termosAceitos: null,
});

function mapRow(row: UserKycRow): KycProfile {
  return {
    userId: row.id,
    email: row.email,
    telefone: row.telefone ?? null,
    nomeCompleto: row.nome_completo,
    cpf: row.cpf,
    dataNascimento: row.data_nascimento ?? null,
    documentoUrl: row.documento_url,
    selfieUrl: row.selfie_url,
    cep: row.cep ?? null,
    enderecoLogradouro: row.endereco_logradouro ?? null,
    enderecoNumero: row.endereco_numero ?? null,
    enderecoComplemento: row.endereco_complemento ?? null,
    enderecoBairro: row.endereco_bairro ?? null,
    enderecoCidade: row.endereco_cidade ?? null,
    enderecoUf: row.endereco_uf ?? null,
    statusVerificacao: row.status_verificacao,
    termosAceitos: row.termos_aceitos,
  };
}

function mapContatoToDb(input: AtualizarContatoKycInput) {
  return {
    email: input.email.trim(),
    telefone: input.telefone.trim(),
    cep: input.cep.trim(),
    endereco_logradouro: input.enderecoLogradouro.trim(),
    endereco_numero: input.enderecoNumero.trim(),
    endereco_complemento: input.enderecoComplemento.trim(),
    endereco_bairro: input.enderecoBairro.trim(),
    endereco_cidade: input.enderecoCidade.trim(),
    endereco_uf: input.enderecoUf.trim().toUpperCase(),
  };
}

function erroColunaOuSchema(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('schema') ||
    m.includes('invalid or incompatible') ||
    m.includes('does not exist') ||
    m.includes('could not find') ||
    m.includes('column') ||
    m.includes('pgrst')
  );
}

function traduzirErroKycDb(error: { message: string; code?: string }): Error {
  const msg = error.message;

  if (msg.toLowerCase().includes('infinite recursion')) {
    return new Error(
      'Erro de permissão no banco (RLS). No Supabase SQL Editor execute o arquivo 026_kyc_submit_rpc_reset_users_policies.sql e tente enviar de novo.',
    );
  }

  if (msg.toLowerCase().includes('invalid or incompatible')) {
    return new Error(
      'Erro no Storage do Supabase ao salvar documento/selfie — não significa que o SQL 004/017 falhou. Verifique o bucket kyc-documents (Storage) e se o .env aponta para o mesmo projeto. Teste enviar um arquivo pelo painel Storage.',
    );
  }

  if (msg.toLowerCase().includes('schema') && !msg.toLowerCase().includes('storage')) {
    return new Error(
      'Colunas KYC ausentes ou cache da API desatualizado. Execute 004 e 017 no SQL Editor do mesmo projeto do app e, em Settings → API, use Reload schema.',
    );
  }

  if (erroColunaOuSchema(msg)) {
    return new Error(
      'Faltam colunas no banco (KYC). Execute supabase/migrations/017_kyc_contact_address.sql no painel Supabase.',
    );
  }

  if (msg.includes('Bucket not found') || msg.includes('kyc-documents')) {
    return new Error(
      'Bucket de documentos KYC ausente. Execute supabase/migrations/004_kyc_user_profiles.sql.',
    );
  }

  if (msg.includes('duplicate key') && msg.includes('cpf')) {
    return new Error('Este CPF já está cadastrado em outra conta.');
  }

  return new Error(msg);
}

async function lerMockKyc(userId: string): Promise<KycProfile> {
  const raw = await AsyncStorage.getItem(MOCK_KYC_KEY);
  if (!raw) return PERFIL_VAZIO(userId);
  try {
    const parsed = JSON.parse(raw) as KycProfile;
    return { ...PERFIL_VAZIO(userId), ...parsed, userId };
  } catch {
    return PERFIL_VAZIO(userId);
  }
}

async function salvarMockKyc(perfil: KycProfile): Promise<void> {
  await AsyncStorage.setItem(MOCK_KYC_KEY, JSON.stringify(perfil));
}

async function buscarUsuarioKyc(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserKycRow | null> {
  const selects = [KYC_SELECT_FULL, KYC_SELECT_CORE];

  for (const selectCols of selects) {
    const { data, error } = await supabase
      .from('users')
      .select(selectCols)
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return data as UserKycRow;
    }

    if (error && !erroColunaOuSchema(error.message)) {
      throw traduzirErroKycDb(error);
    }
  }

  return null;
}

async function atualizarCamposOpcionaisKyc(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: Record<string, string | null>,
): Promise<void> {
  const { error } = await supabase.from('users').update(payload).eq('id', userId);
  if (error && !erroColunaOuSchema(error.message)) {
    throw traduzirErroKycDb(error);
  }
}

export async function obterPerfilKyc(userId: string): Promise<KycProfile> {
  if (isMockMode()) {
    return lerMockKyc(userId);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return lerMockKyc(userId);
  }

  const row = await buscarUsuarioKyc(supabase, userId);
  if (!row) {
    return PERFIL_VAZIO(userId);
  }

  return mapRow(row);
}

export async function atualizarContatoKyc(
  userId: string,
  input: AtualizarContatoKycInput,
): Promise<KycProfile> {
  const contatoDb = mapContatoToDb(input);

  if (isMockMode()) {
    const perfil = await lerMockKyc(userId);
    const atualizado: KycProfile = { ...perfil, userId, ...mapContatoToPerfil(contatoDb) };
    await salvarMockKyc(atualizado);
    return atualizado;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const perfil = await lerMockKyc(userId);
    const atualizado: KycProfile = { ...perfil, ...mapContatoToPerfil(contatoDb) };
    await salvarMockKyc(atualizado);
    return atualizado;
  }

  await atualizarCamposOpcionaisKyc(supabase, userId, contatoDb);

  const row = await buscarUsuarioKyc(supabase, userId);
  if (!row) {
    throw new Error('Perfil não encontrado após salvar contato.');
  }

  return mapRow(row);
}

function mapContatoToPerfil(contatoDb: ReturnType<typeof mapContatoToDb>): Partial<KycProfile> {
  return {
    email: contatoDb.email,
    telefone: contatoDb.telefone,
    cep: contatoDb.cep,
    enderecoLogradouro: contatoDb.endereco_logradouro,
    enderecoNumero: contatoDb.endereco_numero,
    enderecoComplemento: contatoDb.endereco_complemento,
    enderecoBairro: contatoDb.endereco_bairro,
    enderecoCidade: contatoDb.endereco_cidade,
    enderecoUf: contatoDb.endereco_uf,
  };
}

function perfilFromSubmit(userId: string, input: SubmitKycInput, documentoUrl: string, selfieUrl: string): KycProfile {
  return {
    userId,
    email: input.contato?.email ?? null,
    telefone: input.contato?.telefone ?? null,
    nomeCompleto: input.nomeCompleto,
    cpf: input.cpf,
    dataNascimento: input.dataNascimento,
    documentoUrl,
    selfieUrl,
    cep: input.contato?.cep ?? null,
    enderecoLogradouro: input.contato?.enderecoLogradouro ?? null,
    enderecoNumero: input.contato?.enderecoNumero ?? null,
    enderecoComplemento: input.contato?.enderecoComplemento ?? null,
    enderecoBairro: input.contato?.enderecoBairro ?? null,
    enderecoCidade: input.contato?.enderecoCidade ?? null,
    enderecoUf: input.contato?.enderecoUf ?? null,
    statusVerificacao: 'em_analise',
    termosAceitos: input.termosAceitosEm.toISOString(),
  };
}

export async function enviarCadastroKyc(
  userId: string,
  input: SubmitKycInput,
): Promise<KycProfile> {
  if (isMockMode()) {
    const perfil = perfilFromSubmit(userId, input, input.documentoUri, input.selfieUri);
    await salvarMockKyc(perfil);
    return perfil;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const perfil = perfilFromSubmit(userId, input, input.documentoUri, input.selfieUri);
    await salvarMockKyc(perfil);
    return perfil;
  }

  const [documentoUrl, selfieUrl] = await Promise.all([
    enviarDocumentoKyc(userId, input.documentoUri, 'documento'),
    enviarDocumentoKyc(userId, input.selfieUri, 'selfie'),
  ]);

  const contato = input.contato ? mapContatoToDb(input.contato) : null;

  const { data: salvo, error: rpcErr } = await supabase.rpc('salvar_kyc_cadastro', {
    p_nome_completo: input.nomeCompleto,
    p_cpf: input.cpf,
    p_documento_url: documentoUrl,
    p_selfie_url: selfieUrl,
    p_termos_aceitos: input.termosAceitosEm.toISOString(),
    p_email: contato?.email ?? null,
    p_telefone: contato?.telefone ?? null,
    p_data_nascimento: input.dataNascimento,
    p_cep: contato?.cep ?? null,
    p_endereco_logradouro: contato?.endereco_logradouro ?? null,
    p_endereco_numero: contato?.endereco_numero ?? null,
    p_endereco_complemento: contato?.endereco_complemento ?? null,
    p_endereco_bairro: contato?.endereco_bairro ?? null,
    p_endereco_cidade: contato?.endereco_cidade ?? null,
    p_endereco_uf: contato?.endereco_uf ?? null,
  });

  if (rpcErr) {
    if (
      rpcErr.message.includes('salvar_kyc_cadastro') ||
      rpcErr.code === 'PGRST202'
    ) {
      throw new Error(
        'Função salvar_kyc_cadastro ausente. Execute supabase/migrations/026_kyc_submit_rpc_reset_users_policies.sql no SQL Editor.',
      );
    }
    throw traduzirErroKycDb(rpcErr);
  }

  if (salvo && typeof salvo === 'object') {
    const j = salvo as Record<string, string | null>;
    return {
      userId: String(j.id ?? userId),
      email: j.email ?? null,
      telefone: j.telefone ?? null,
      nomeCompleto: j.nome_completo ?? null,
      cpf: j.cpf ?? null,
      dataNascimento: j.data_nascimento ?? null,
      documentoUrl: j.documento_url ?? documentoUrl,
      selfieUrl: j.selfie_url ?? selfieUrl,
      cep: j.cep ?? null,
      enderecoLogradouro: j.endereco_logradouro ?? null,
      enderecoNumero: j.endereco_numero ?? null,
      enderecoComplemento: j.endereco_complemento ?? null,
      enderecoBairro: j.endereco_bairro ?? null,
      enderecoCidade: j.endereco_cidade ?? null,
      enderecoUf: j.endereco_uf ?? null,
      statusVerificacao: (j.status_verificacao as KycProfile['statusVerificacao']) ?? 'em_analise',
      termosAceitos: j.termos_aceitos ?? input.termosAceitosEm.toISOString(),
    };
  }

  const row = await buscarUsuarioKyc(supabase, userId);
  if (row) {
    return mapRow(row);
  }

  return perfilFromSubmit(userId, input, documentoUrl, selfieUrl);
}

/** Apenas para modo demonstração — simula aprovação instantânea. */
export async function aprovarKycMock(): Promise<void> {
  const raw = await AsyncStorage.getItem(MOCK_KYC_KEY);
  if (!raw) return;
  const perfil = JSON.parse(raw) as KycProfile;
  perfil.statusVerificacao = 'aprovado';
  await salvarMockKyc(perfil);
}
