import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';

export type LancePorHora = {
  hora: number;
  label: string;
  total: number;
};

export type MetricasOperacionaisHoje = {
  totalArrematadoCents: number;
  comissaoHojeCents: number;
  novosUsuarios: number;
  quantidadeLances: number;
  visitasUnicas: number;
  usuariosAtivos: number;
  lancesPorHora: LancePorHora[];
  atualizadoEm: string;
  fonte: 'supabase' | 'mock';
};

const METRICAS_HOJE_MOCK: Omit<MetricasOperacionaisHoje, 'atualizadoEm' | 'fonte'> = {
  totalArrematadoCents: 3_245_000,
  comissaoHojeCents: 324_500,
  novosUsuarios: 18,
  quantidadeLances: 247,
  visitasUnicas: 892,
  usuariosAtivos: 156,
  lancesPorHora: [
    2, 1, 0, 0, 1, 3, 8, 14, 19, 22, 18, 24, 28, 31, 26, 29, 33, 38, 42, 47, 52, 38, 21, 9,
  ].map((total, hora) => ({
    hora,
    label: `${String(hora).padStart(2, '0')}h`,
    total,
  })),
};

function inicioDoDiaIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function criarBucketsHorarios(): LancePorHora[] {
  return Array.from({ length: 24 }, (_, hora) => ({
    hora,
    label: `${String(hora).padStart(2, '0')}h`,
    total: 0,
  }));
}

function agruparLancesPorHora(registros: { created_at: string }[]): LancePorHora[] {
  const buckets = criarBucketsHorarios();
  for (const row of registros) {
    const hora = new Date(row.created_at).getHours();
    if (hora >= 0 && hora < 24) {
      buckets[hora].total += 1;
    }
  }
  return buckets;
}

async function contarDistinctAccess(
  campo: 'session_id' | 'user_id',
  desde: string,
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  let query = supabase
    .from('app_access_logs')
    .select(campo)
    .gte('created_at', desde);

  if (campo === 'user_id') {
    query = query.not('user_id', 'is', null);
  }

  const { data, error } = await query;
  if (error || !data) return 0;

  const unicos = new Set(
    (data as Record<string, string | null>[]).map((row) => row[campo]).filter(Boolean),
  );
  return unicos.size;
}

export async function obterMetricasOperacionaisHoje(): Promise<MetricasOperacionaisHoje> {
  const atualizadoEm = new Date().toISOString();

  if (isMockMode()) {
    return { ...METRICAS_HOJE_MOCK, atualizadoEm, fonte: 'mock' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ...METRICAS_HOJE_MOCK, atualizadoEm, fonte: 'mock' };
  }

  const desde = inicioDoDiaIso();

  try {
    const [checkoutsRes, usersRes, bidsRes, visitas, ativos] = await Promise.all([
      supabase
        .from('checkouts')
        .select('subtotal_cents, commission_cents')
        .gte('created_at', desde),
      supabase.from('users').select('id').gte('created_at', desde),
      supabase.from('bids').select('id, created_at').gte('created_at', desde),
      contarDistinctAccess('session_id', desde),
      contarDistinctAccess('user_id', desde),
    ]);

    const checkouts = checkoutsRes.data ?? [];
    const totalArrematadoCents = checkouts.reduce(
      (s, row) => s + Number(row.subtotal_cents ?? 0),
      0,
    );
    const comissaoHojeCents = checkouts.reduce(
      (s, row) => s + Number(row.commission_cents ?? 0),
      0,
    );

    const novosUsuarios = usersRes.data?.length ?? 0;
    const bids = bidsRes.data ?? [];
    const quantidadeLances = bids.length;
    const lancesPorHora = agruparLancesPorHora(bids);

    return {
      totalArrematadoCents,
      comissaoHojeCents,
      novosUsuarios,
      quantidadeLances,
      visitasUnicas: visitas,
      usuariosAtivos: ativos,
      lancesPorHora,
      atualizadoEm,
      fonte: 'supabase',
    };
  } catch {
    return { ...METRICAS_HOJE_MOCK, atualizadoEm, fonte: 'mock' };
  }
}
