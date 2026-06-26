import { DISPUTAS_ADMIN_MOCK } from '@/src/admin/disputasMock';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { listarLeiloesAdmin } from '@/src/services/adminLeiloes';
import { listarSolicitacoesKyc } from '@/src/services/adminKyc';
import { buscarPedidosAdmin } from '@/src/services/adminPedidos';
import { obterResumoPushAdmin } from '@/src/services/adminPush';
import { listarConversasSuporteAdmin } from '@/src/services/adminSuporteChat';
import { listarDisputasAdmin } from '@/src/services/adminDisputas';

export type AdminOpsCounts = {
  kycPendentes: number;
  leiloesEmAnalise: number;
  disputasAbertas: number;
  pedidosPagamentoPendente: number;
  pushNaFila: number;
  suporteAguardando: number;
  fonte: 'supabase' | 'mock';
};

const MOCK_COUNTS: AdminOpsCounts = {
  kycPendentes: 2,
  leiloesEmAnalise: 3,
  disputasAbertas: DISPUTAS_ADMIN_MOCK.filter((d) => d.status === 'aberta').length,
  pedidosPagamentoPendente: 1,
  pushNaFila: 2,
  suporteAguardando: 1,
  fonte: 'mock',
};

export async function obterContagensOperacionaisAdmin(): Promise<AdminOpsCounts> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_COUNTS;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_COUNTS;

  try {
    const [kyc, leiloes, disputas, pedidos, push, suporte] = await Promise.all([
      listarSolicitacoesKyc().catch(() => []),
      listarLeiloesAdmin().catch(() => []),
      listarDisputasAdmin('aberta').catch(() => []),
      buscarPedidosAdmin('', 'pagamento_pendente').catch(() => []),
      obterResumoPushAdmin(7).catch(() => null),
      listarConversasSuporteAdmin().catch(() => []),
    ]);

    const kycPendentes = kyc.filter(
      (s) => s.statusVerificacao === 'em_analise' || s.statusVerificacao === 'pendente',
    ).length;

    const leiloesEmAnalise = leiloes.filter((l) => l.status === 'em_analise').length;

    const suporteAguardando = suporte.filter((c) => c.status === 'bot_ativo').length;

    return {
      kycPendentes,
      leiloesEmAnalise,
      disputasAbertas: disputas.length,
      pedidosPagamentoPendente: pedidos.length,
      pushNaFila: push?.pending ?? 0,
      suporteAguardando,
      fonte: 'supabase',
    };
  } catch {
    return MOCK_COUNTS;
  }
}

export function badgePorRota(href: string, counts: AdminOpsCounts): number | undefined {
  switch (href) {
    case '/admin/kyc':
      return counts.kycPendentes || undefined;
    case '/admin/leiloes':
      return counts.leiloesEmAnalise || undefined;
    case '/admin/disputas':
      return counts.disputasAbertas || undefined;
    case '/admin/pedidos':
      return counts.pedidosPagamentoPendente || undefined;
    case '/admin/notificacoes':
      return counts.pushNaFila || undefined;
    case '/admin/suporte':
      return counts.suporteAguardando || undefined;
    default:
      return undefined;
  }
}
