import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type { MetodoPagamento, TransacaoRecente } from '@/app/admin/_components/transactionTypes';
import {
  FLUXO_COMISSOES,
  METRICAS_FATURAMENTO,
  SPARKLINE_COMISSAO,
  SPARKLINE_RECEITA,
  TRANSACOES_RECENTES,
} from '@/app/admin/_components/faturamentoData';

export type AdminFaturamentoMensal = {
  comissaoCents: number;
  comissaoVariacao: string;
  receitaCents: number;
  receitaVariacao: string;
  pedidosLiquidados: number;
  transacoesTotais: number;
  sparklineComissao: number[];
  sparklineReceita: number[];
  fluxoComissoes: { valores: number[]; labels: string[] };
  transacoesRecentes: TransacaoRecente[];
  fonte: 'supabase' | 'mock';
};

function formatarVariacao(pct: number): string {
  const sinal = pct >= 0 ? '+' : '';
  return `${sinal}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% este mês`;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function mapMetodo(method: string): MetodoPagamento {
  if (method === 'boleto') return 'boleto';
  if (method === 'cartao') return 'cartao';
  return 'pix';
}

function mapTransacao(row: Record<string, unknown>): TransacaoRecente {
  const buyerNome = String(row.buyerNome ?? 'Comprador');
  const handle = `@${buyerNome.split(' ')[0]?.toLowerCase() ?? 'user'}`;
  const createdAt = String(row.createdAt ?? '');
  const aprovadoEm = row.aprovadoEm ? String(row.aprovadoEm) : null;

  return {
    id: String(row.id ?? ''),
    leilaoId: String(row.leilaoId ?? ''),
    pedido: {
      nome: String(row.auctionTitle ?? 'Leilão'),
      imagem: String(row.auctionImage ?? ''),
    },
    usuario: {
      id: String(row.buyerId ?? ''),
      nome: buyerNome,
      handle,
      avatar: `https://i.pravatar.cc/64?u=${encodeURIComponent(String(row.buyerId ?? 'u'))}`,
      email: String(row.buyerEmail ?? ''),
      telefone: String(row.buyerTelefone ?? '—'),
      cpf: String(row.buyerCpf ?? '—'),
      kycStatus: 'aprovado',
    },
    valorCents: Number(row.valorCents ?? 0),
    data: formatarData(createdAt),
    status: row.status === 'pendente' ? 'pendente' : 'concluido',
    pagamento: {
      metodo: mapMetodo(String(row.paymentMethod ?? 'pix')),
      transacaoId: String(row.transacaoId ?? row.id ?? ''),
      aprovadoEm: aprovadoEm ? formatarData(aprovadoEm) : null,
      comprovanteUrl: row.comprovanteUrl ? String(row.comprovanteUrl) : null,
      gateway: String(row.gateway ?? 'luckcode'),
    },
    timeline: [],
  };
}

const MOCK_FATURAMENTO: AdminFaturamentoMensal = {
  comissaoCents: METRICAS_FATURAMENTO.comissaoCents,
  comissaoVariacao: METRICAS_FATURAMENTO.comissaoVariacao,
  receitaCents: METRICAS_FATURAMENTO.receitaCents,
  receitaVariacao: METRICAS_FATURAMENTO.receitaVariacao,
  pedidosLiquidados: METRICAS_FATURAMENTO.pedidosLiquidados,
  transacoesTotais: METRICAS_FATURAMENTO.transacoesTotais,
  sparklineComissao: SPARKLINE_COMISSAO,
  sparklineReceita: SPARKLINE_RECEITA,
  fluxoComissoes: FLUXO_COMISSOES,
  transacoesRecentes: TRANSACOES_RECENTES,
  fonte: 'mock',
};

function downsampleFluxo<T>(items: T[], maxPoints = 7): T[] {
  if (items.length <= maxPoints) return items;
  return Array.from({ length: maxPoints }, (_, i) => {
    const idx = Math.round((i / (maxPoints - 1)) * (items.length - 1));
    return items[idx];
  });
}

export async function obterFaturamentoMensalAdmin(days = 30): Promise<AdminFaturamentoMensal> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_FATURAMENTO;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_FATURAMENTO;

  try {
    const { data, error } = await supabase.rpc('admin_obter_faturamento_mensal', { p_days: days });
    if (error) {
      if (error.message.includes('admin_obter_faturamento_mensal')) {
        console.warn('[adminFaturamento] Execute migration 061_admin_faturamento_buyer_disputes.sql');
      }
      return MOCK_FATURAMENTO;
    }

    const payload = data as Record<string, unknown>;
    if (payload?.ok !== true) return MOCK_FATURAMENTO;

    const fluxoDiario = (payload.fluxoDiario as Record<string, unknown>[]) ?? [];
    const fluxoAmostra = downsampleFluxo(fluxoDiario);
    const sparkComissao = ((payload.sparklineComissao as number[]) ?? []).map(Number);
    const sparkReceita = ((payload.sparklineReceita as number[]) ?? []).map(Number);

    const fluxoLabels = fluxoAmostra.map((d) => String(d.label ?? ''));
    const fluxoValores = fluxoAmostra.map((d) => Number(d.comissaoCents ?? 0));

    const recentesRaw = (payload.transacoesRecentes as Record<string, unknown>[]) ?? [];

    return {
      comissaoCents: Number(payload.comissaoCents ?? 0),
      comissaoVariacao: formatarVariacao(Number(payload.comissaoVariacaoPct ?? 0)),
      receitaCents: Number(payload.receitaCents ?? 0),
      receitaVariacao: formatarVariacao(Number(payload.receitaVariacaoPct ?? 0)),
      pedidosLiquidados: Number(payload.pedidosLiquidados ?? 0),
      transacoesTotais: Number(payload.transacoesTotais ?? 0),
      sparklineComissao: sparkComissao.length ? sparkComissao : SPARKLINE_COMISSAO,
      sparklineReceita: sparkReceita.length ? sparkReceita : SPARKLINE_RECEITA,
      fluxoComissoes: {
        valores: fluxoValores.length ? fluxoValores : FLUXO_COMISSOES.valores,
        labels: fluxoLabels.length ? fluxoLabels : FLUXO_COMISSOES.labels,
      },
      transacoesRecentes: recentesRaw.length ? recentesRaw.map(mapTransacao) : TRANSACOES_RECENTES,
      fonte: 'supabase',
    };
  } catch {
    return MOCK_FATURAMENTO;
  }
}
