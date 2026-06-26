import { formatBRL } from '@/src/lib/bids';

export type JarvisMarketOpportunity = {
  id?: string;
  title?: string;
  current_price_cents?: number;
  market_cents?: number;
  discount_pct?: number;
  verdict?: 'good' | 'fair' | 'bad' | string;
  category?: string | null;
  conservation_state?: string | null;
};

export type JarvisLeiloesOportunidades = {
  live_com_mercado_estimado?: number;
  abaixo_mercado_compensa?: number;
  abaixo_mercado_atencao?: number;
  melhores?: JarvisMarketOpportunity[];
};

function verdictLabel(verdict?: string): string {
  if (verdict === 'good') return 'Compensa';
  if (verdict === 'fair') return 'Atenção';
  return 'Acima';
}

/** Resposta determinística quando o usuário pergunta por lotes abaixo do mercado. */
export function formatJarvisMarketOpportunitiesReply(
  oportunidades?: JarvisLeiloesOportunidades | null,
): string {
  const liveComMercado = Number(oportunidades?.live_com_mercado_estimado ?? 0);
  const compensa = Number(oportunidades?.abaixo_mercado_compensa ?? 0);
  const atencao = Number(oportunidades?.abaixo_mercado_atencao ?? 0);
  const melhores = oportunidades?.melhores ?? [];

  if (liveComMercado === 0) {
    return (
      'Consultei os leilões ao vivo agora: nenhum tem mercado estimado cadastrado. ' +
      'Sem essa referência no app, não dá para calcular se está abaixo do mercado.'
    );
  }

  if (melhores.length === 0 && compensa === 0 && atencao === 0) {
    return (
      `Consultei ${liveComMercado} leilão(ões) ao vivo com mercado estimado. ` +
      'Neste momento nenhum está pelo menos 5% abaixo da referência — os lances podem ter subido. ' +
      'Acompanhe em Leilões; a cada lance o veredito muda.'
    );
  }

  const linhas = [
    `Varri os leilões ao vivo no Levou: ${compensa} com veredito Compensa (≥20% abaixo) e ${atencao} em Atenção (5–19%).`,
    '',
    'Destaques agora:',
    ...melhores.slice(0, 5).map((lote) => {
      const lance = formatBRL(Number(lote.current_price_cents ?? 0));
      const mercado = formatBRL(Number(lote.market_cents ?? 0));
      const pct = lote.discount_pct ?? 0;
      return `• ${lote.title ?? 'Lote'} — lance ${lance} vs mercado ${mercado} (${pct}% abaixo, ${verdictLabel(lote.verdict)})`;
    }),
    '',
    'Abra o lote em Leilões para ver caução, próximo lance mínimo e análise completa.',
  ];

  return linhas.join('\n');
}

export function isMarketOpportunityQuestion(message: string): boolean {
  const q = message.toLowerCase();
  return (
    q.includes('abaixo') ||
    q.includes('mercado') ||
    q.includes('compensa') ||
    q.includes('oportunidade') ||
    q.includes('barato') ||
    q.includes('desconto') ||
    (q.includes('lote') && (q.includes('valor') || q.includes('preço') || q.includes('preco')))
  );
}
