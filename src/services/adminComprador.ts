import { USUARIOS_INICIAIS } from '@/src/admin/mockData';
import type { AdminUsuario } from '@/src/admin/types';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const HANDLE_PARA_ID: Record<string, string> = {
  '@marcos_silva_ftk': 'u1',
  '@marta_tech_setup': 'u2',
  '@pedro_42_gamer': 'u3',
  '@lucas_fly_drone': 'u4',
};

const ID_PARA_HANDLE: Record<string, string> = Object.fromEntries(
  Object.entries(HANDLE_PARA_ID).map(([handle, id]) => [id, handle]),
);

export type AdminCompradorResumo = AdminUsuario & {
  handle: string;
};

function normalizarHandle(texto: string): string {
  const t = texto.trim();
  if (t.startsWith('@')) return t;
  return `@${t.replace(/\s+/g, '_').toLowerCase()}`;
}

function resolverCompradorId(handleOuId: string): string {
  const h = normalizarHandle(handleOuId);
  if (HANDLE_PARA_ID[h]) return HANDLE_PARA_ID[h];
  return handleOuId.replace(/^@/, '');
}

function mapUsuario(u: AdminUsuario, handle: string): AdminCompradorResumo {
  return { ...u, handle };
}

export async function obterCompradorAdmin(
  handleOuId: string,
): Promise<AdminCompradorResumo | null> {
  const id = resolverCompradorId(handleOuId);
  const handle =
    handleOuId.startsWith('@')
      ? handleOuId
      : ID_PARA_HANDLE[id] ?? normalizarHandle(handleOuId);

  if (isMockMode() || !isSupabaseConfigured()) {
    const porId = USUARIOS_INICIAIS.find((u) => u.id === id);
    if (porId) return mapUsuario(porId, handle);
    const porEmail = USUARIOS_INICIAIS.find(
      (u) => u.email.split('@')[0].replace(/\./g, '_') === id.replace(/^@/, ''),
    );
    if (porEmail) return mapUsuario(porEmail, handle);
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const mock = USUARIOS_INICIAIS.find((u) => u.id === id);
    return mock ? mapUsuario(mock, handle) : null;
  }

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, email, display_name, nome_completo, telefone, cpf, escrow_balance_cents, status_verificacao, status_conta, role',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    const mock = USUARIOS_INICIAIS.find((u) => u.id === id);
    return mock ? mapUsuario(mock, handle) : null;
  }

  const cents = (data.escrow_balance_cents as number) ?? 0;
  const saldoFtk = `FTK ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return {
    id: data.id as string,
    nome: (data.nome_completo as string) ?? (data.display_name as string) ?? 'Comprador',
    nomeCompleto: (data.nome_completo as string) ?? null,
    email: data.email as string,
    telefone: (data.telefone as string) ?? null,
    cpf: (data.cpf as string) ?? null,
    saldoFtk,
    status: (data.status_conta as AdminUsuario['status']) ?? 'ativo',
    statusConta: (data.status_conta as AdminUsuario['statusConta']) ?? 'ativo',
    statusKyc: String(data.status_verificacao),
    statusVerificacao: data.status_verificacao as AdminUsuario['statusVerificacao'],
    role: (data.role as AdminUsuario['role']) ?? 'bidder',
    handle:
      (data.display_name as string)?.startsWith('@')
        ? (data.display_name as string)
        : `@${((data.display_name as string) ?? data.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()}`,
  };
}

export { resolverCompradorId, normalizarHandle };
