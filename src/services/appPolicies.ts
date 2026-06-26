import AsyncStorage from '@react-native-async-storage/async-storage';

import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { humanizarErroSupabaseFetch } from '@/src/lib/supabaseEnv';
import {
  ALL_POLICY_TYPES,
  DEFAULT_POLICIES,
  LEGACY_TYPES_BY_POLICY,
  type AppPolicy,
  type AppPolicyType,
} from '@/src/types/appPolicy';

const MOCK_POLICIES_KEY = '@aetherion/app_policies';

type PolicyRow = {
  id: string;
  title: string;
  content: string;
  type: string;
  version: number;
  updated_at: string;
};

function mapRow(row: PolicyRow, typeOverride?: AppPolicyType): AppPolicy {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: typeOverride ?? (row.type as AppPolicyType),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

function fallbackLocal(type: AppPolicyType): AppPolicy {
  const base = DEFAULT_POLICIES[type];
  return {
    ...base,
    id: `local-${type}`,
    updatedAt: new Date().toISOString(),
  };
}

function defaultsIniciaisMock(): AppPolicy[] {
  return ALL_POLICY_TYPES.map((type) => fallbackLocal(type));
}

async function lerMockPolicies(): Promise<AppPolicy[]> {
  const raw = await AsyncStorage.getItem(MOCK_POLICIES_KEY);
  if (!raw) {
    return defaultsIniciaisMock();
  }
  try {
    const parsed = JSON.parse(raw) as AppPolicy[];
    return parsed.map((p) => ({
      ...p,
      type: normalizarTipoPolitica(p.type as string),
    }));
  } catch {
    return defaultsIniciaisMock();
  }
}

async function salvarMockPolicies(policies: AppPolicy[]): Promise<void> {
  await AsyncStorage.setItem(MOCK_POLICIES_KEY, JSON.stringify(policies));
}

function normalizarTipoPolitica(type: string): AppPolicyType {
  if (type in DEFAULT_POLICIES) return type as AppPolicyType;
  if (type === 'comprador_terms' || type === 'kyc_terms') return 'comprador_termo_arremate';
  if (type === 'vendedor_terms') return 'vendedor_termos_responsabilidade';
  if (type === 'vendedor_rules') return 'vendedor_regras_leilao';
  if (type === 'app_policy') return 'vendedor_politica_app';
  return 'comprador_termo_arremate';
}

function obterMaisRecente(lista: AppPolicy[], type: AppPolicyType): AppPolicy | null {
  const filtradas = lista
    .filter((p) => p.type === type)
    .sort((a, b) => b.version - a.version);
  return filtradas[0] ?? null;
}

async function buscarPoliticaSupabase(type: string): Promise<PolicyRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('app_policies')
    .select('id, title, content, type, version, updated_at')
    .eq('type', type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      console.warn('[appPolicies] Falha ao carregar política:', error.message);
    }
    return null;
  }

  return (data as PolicyRow | null) ?? null;
}

async function buscarComLegado(type: AppPolicyType): Promise<AppPolicy | null> {
  const atual = await buscarPoliticaSupabase(type);
  if (atual) return mapRow(atual, type);

  const legados = LEGACY_TYPES_BY_POLICY[type] ?? [];
  for (const legado of legados) {
    const row = await buscarPoliticaSupabase(legado);
    if (row) return mapRow(row, type);
  }

  return null;
}

/** Retorna a versão mais recente de uma política (type + version DESC). */
export async function obterPoliticaAtual(type: AppPolicyType): Promise<AppPolicy> {
  if (isMockMode()) {
    const lista = await lerMockPolicies();
    return obterMaisRecente(lista, type) ?? fallbackLocal(type);
  }

  const row = await buscarComLegado(type);
  if (!row) {
    return fallbackLocal(type);
  }

  return row;
}

/** Busca várias políticas atuais na ordem solicitada. */
export async function obterPoliticasAtuais(types: AppPolicyType[]): Promise<AppPolicy[]> {
  const unicos = [...new Set(types)];
  const resultados = await Promise.all(unicos.map((type) => obterPoliticaAtual(type)));
  const mapa = new Map(resultados.map((p) => [p.type, p]));
  return types.map((type) => mapa.get(type) ?? fallbackLocal(type));
}

/** Lista histórico de versões de um type (admin). */
export async function listarHistoricoPoliticas(type: AppPolicyType): Promise<AppPolicy[]> {
  if (isMockMode()) {
    const lista = await lerMockPolicies();
    return lista.filter((p) => p.type === type).sort((a, b) => b.version - a.version);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [fallbackLocal(type)];
  }

  const { data, error } = await supabase
    .from('app_policies')
    .select('id, title, content, type, version, updated_at')
    .eq('type', type)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.length) {
    return (data as PolicyRow[]).map((row) => mapRow(row, type));
  }

  const legado = await buscarComLegado(type);
  return legado ? [legado] : [fallbackLocal(type)];
}

export type SalvarPoliticaInput = {
  title: string;
  content: string;
  type: AppPolicyType;
};

/** Grava uma nova versão incremental no banco. */
export async function salvarNovaVersaoPolitica(
  input: SalvarPoliticaInput,
): Promise<AppPolicy> {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title || !content) {
    throw new Error('Título e conteúdo são obrigatórios.');
  }

  if (isMockMode()) {
    const lista = await lerMockPolicies();
    const atual = obterMaisRecente(lista, input.type);
    const novaVersao = (atual?.version ?? 0) + 1;
    const nova: AppPolicy = {
      id: `mock-${input.type}-v${novaVersao}`,
      title,
      content,
      type: input.type,
      version: novaVersao,
      updatedAt: new Date().toISOString(),
    };
    const filtrada = lista.filter((p) => p.type !== input.type || p.version !== novaVersao);
    await salvarMockPolicies([...filtrada, nova]);
    return nova;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data: maxRow, error: maxError } = await supabase
    .from('app_policies')
    .select('version')
    .eq('type', input.type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw new Error(maxError.message);
  }

  const proximaVersao = ((maxRow as { version: number } | null)?.version ?? 0) + 1;

  try {
    const { data, error } = await supabase
      .from('app_policies')
      .insert({
        title,
        content,
        type: input.type,
        version: proximaVersao,
        updated_at: new Date().toISOString(),
      })
      .select('id, title, content, type, version, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data as PolicyRow, input.type);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(humanizarErroSupabaseFetch(err));
  }
}
