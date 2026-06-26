import AsyncStorage from '@react-native-async-storage/async-storage';
import { USUARIOS_INICIAIS } from '@/src/admin/mockData';
import type { AdminUsuario, StatusContaUsuario } from '@/src/admin/types';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { resolverUrlDocumentoAdmin } from '@/src/services/adminKyc';
import { KYC_STATUS_LABELS } from '@/src/types/kyc';
import type { StatusVerificacao } from '@/src/types/database';

const ADMIN_USUARIOS_STATUS_KEY = '@aetherion/admin_usuarios_status';

type UsuarioRowRpc = {
  id: string;
  email: string;
  display_name: string | null;
  nome_completo: string | null;
  role: string;
  escrow_balance_cents: number;
  status_verificacao: StatusVerificacao;
  status_conta: StatusContaUsuario;
  telefone: string | null;
  cpf: string | null;
  documento_url: string | null;
  selfie_url: string | null;
  data_nascimento: string | null;
  cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  termos_aceitos: string | null;
  created_at: string;
};

function formatarSaldoFtk(cents: number): string {
  const valor = cents / 100;
  return `FTK ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizarStatusConta(raw: string | null | undefined): StatusContaUsuario {
  if (raw === 'suspenso' || raw === 'bloqueado' || raw === 'banido') return raw;
  return 'ativo';
}

function mapRow(row: UsuarioRowRpc): AdminUsuario {
  const nome =
    row.nome_completo?.trim() || row.display_name?.trim() || row.email.split('@')[0] || '—';
  const statusConta = normalizarStatusConta(row.status_conta);

  return {
    id: row.id,
    nome,
    email: row.email,
    saldoFtk: formatarSaldoFtk(row.escrow_balance_cents ?? 0),
    status: statusConta,
    statusConta,
    statusKyc: KYC_STATUS_LABELS[row.status_verificacao] ?? row.status_verificacao,
    statusVerificacao: row.status_verificacao,
    role: row.role,
    criadoEm: row.created_at,
    displayName: row.display_name,
    nomeCompleto: row.nome_completo,
    telefone: row.telefone,
    cpf: row.cpf,
    documentoUrl: row.documento_url,
    selfieUrl: row.selfie_url,
    dataNascimento: row.data_nascimento,
    cep: row.cep,
    enderecoLogradouro: row.endereco_logradouro,
    enderecoNumero: row.endereco_numero,
    enderecoComplemento: row.endereco_complemento,
    enderecoBairro: row.endereco_bairro,
    enderecoCidade: row.endereco_cidade,
    enderecoUf: row.endereco_uf,
    termosAceitos: row.termos_aceitos,
  };
}

async function aplicarStatusMockLocal(
  lista: AdminUsuario[],
): Promise<AdminUsuario[]> {
  const raw = await AsyncStorage.getItem(ADMIN_USUARIOS_STATUS_KEY);
  if (!raw) return lista;
  try {
    const map = JSON.parse(raw) as Record<string, StatusContaUsuario>;
    return lista.map((u) => {
      const st = map[u.id];
      if (!st) return u;
      return { ...u, status: st, statusConta: st };
    });
  } catch {
    return lista;
  }
}

async function salvarStatusMockLocal(userId: string, status: StatusContaUsuario): Promise<void> {
  const raw = await AsyncStorage.getItem(ADMIN_USUARIOS_STATUS_KEY);
  let map: Record<string, StatusContaUsuario> = {};
  if (raw) {
    try {
      map = JSON.parse(raw) as Record<string, StatusContaUsuario>;
    } catch {
      map = {};
    }
  }
  map[userId] = status;
  await AsyncStorage.setItem(ADMIN_USUARIOS_STATUS_KEY, JSON.stringify(map));
}

export async function listarUsuariosAdmin(): Promise<AdminUsuario[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return aplicarStatusMockLocal([...USUARIOS_INICIAIS]);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return aplicarStatusMockLocal([...USUARIOS_INICIAIS]);
  }

  const { data: ehAdmin, error: adminErr } = await supabase.rpc('auth_is_admin');
  if (adminErr || ehAdmin !== true) {
    throw new Error(
      adminErr?.message ??
        'Conta sem permissão admin. Faça login em /admin/login com role = admin.',
    );
  }

  const { data, error } = await supabase.rpc('admin_listar_usuarios');

  if (error) {
    if (
      error.message.includes('admin_listar_usuarios') ||
      error.message.includes('estrutura da consulta') ||
      error.message.includes('structure of query') ||
      error.code === 'PGRST202'
    ) {
      throw new Error(
        'Execute supabase/migrations/032_admin_listar_kyc_type_fix.sql no SQL Editor do Supabase.',
      );
    }
    throw new Error(error.message);
  }

  return ((data ?? []) as UsuarioRowRpc[]).map(mapRow);
}

export async function carregarDocumentosUsuarioAdmin(usuario: AdminUsuario): Promise<{
  documentoUrl: string | null;
  selfieUrl: string | null;
}> {
  const [documentoUrl, selfieUrl] = await Promise.all([
    resolverUrlDocumentoAdmin(usuario.documentoUrl ?? null),
    resolverUrlDocumentoAdmin(usuario.selfieUrl ?? null),
  ]);
  return {
    documentoUrl: documentoUrl ?? usuario.documentoUrl ?? null,
    selfieUrl: selfieUrl ?? usuario.selfieUrl ?? null,
  };
}

export async function atualizarStatusContaAdmin(
  userId: string,
  statusConta: StatusContaUsuario,
): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    await salvarStatusMockLocal(userId, statusConta);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await salvarStatusMockLocal(userId, statusConta);
    return;
  }

  const { error } = await supabase.rpc('admin_atualizar_status_conta', {
    p_user_id: userId,
    p_status_conta: statusConta,
  });

  if (error) {
    if (
      error.message.includes('admin_atualizar_status_conta') ||
      error.code === 'PGRST202'
    ) {
      throw new Error(
        'Função admin_atualizar_status_conta ausente. Execute supabase/migrations/031_admin_usuarios_detalhe_punicoes.sql.',
      );
    }
    throw new Error(error.message);
  }
}
