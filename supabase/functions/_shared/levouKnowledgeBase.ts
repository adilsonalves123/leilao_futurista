/** Regras oficiais do Levou — usadas nos prompts do Jarvis (edge functions). */

export const MARKET_GOOD_MIN_DISCOUNT_PCT = 20;
export const MARKET_FAIR_MIN_DISCOUNT_PCT = 5;
export const LEVOU_COMMISSION_RATE = 0.1;
export const LEVOU_PENALTY_RATE = 0.3;

export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function computeMinNextBidCents(currentPriceCents: number): number {
  if (currentPriceCents < 50_000) return currentPriceCents + 500;
  if (currentPriceCents < 100_000) return currentPriceCents + 5_000;
  return currentPriceCents + 20_000;
}

export function computeBidHoldCents(bidCents: number, category: string | null): number {
  if (bidCents <= 0) return 0;
  const cat = (category ?? '').toLowerCase();
  if (cat === 'veiculos' || cat === 'imoveis') return 200_000;

  let base = 0;
  if (bidCents <= 200_000) {
    base = Math.max(Math.round(bidCents * 0.2), 5_000);
  } else if (bidCents <= 2_000_000) {
    base = Math.round(bidCents * 0.1);
  } else if (bidCents <= 10_000_000) {
    base = Math.min(Math.round(bidCents * 0.03), 300_000);
  } else {
    base = Math.min(Math.round(bidCents * 0.02), 500_000);
  }
  return Math.max(base, 5_000);
}

export function computeMarketVerdict(bidCents: number, marketCents: number | null): {
  verdict: 'good' | 'fair' | 'bad' | 'unknown';
  discountPct: number | null;
  savingsCents: number | null;
} {
  if (marketCents == null || marketCents <= 0) {
    return { verdict: 'unknown', discountPct: null, savingsCents: null };
  }
  const discountPct = Math.round((1 - bidCents / marketCents) * 100);
  const savingsCents = Math.max(0, marketCents - bidCents);
  if (discountPct >= MARKET_GOOD_MIN_DISCOUNT_PCT) {
    return { verdict: 'good', discountPct, savingsCents };
  }
  if (discountPct >= MARKET_FAIR_MIN_DISCOUNT_PCT) {
    return { verdict: 'fair', discountPct, savingsCents };
  }
  return { verdict: 'bad', discountPct, savingsCents };
}

export function verdictLabelPt(verdict: string): string {
  switch (verdict) {
    case 'good':
      return 'Compensa';
    case 'fair':
      return 'Atenção';
    case 'bad':
      return 'Acima do mercado';
    default:
      return 'Sem referência';
  }
}

export type BuyerMarketOpportunity = {
  id?: string;
  title?: string;
  current_price_cents?: number;
  market_cents?: number;
  discount_pct?: number;
  verdict?: string;
  category?: string | null;
};

export function formatBuyerMarketOpportunitiesReply(
  oportunidades: Record<string, unknown> | undefined,
): string {
  const melhores = (oportunidades?.melhores ?? []) as BuyerMarketOpportunity[];
  const compensa = Number(oportunidades?.abaixo_mercado_compensa ?? 0);
  const atencao = Number(oportunidades?.abaixo_mercado_atencao ?? 0);
  const liveComMercado = Number(oportunidades?.live_com_mercado_estimado ?? 0);

  if (liveComMercado === 0) {
    return (
      'Consultei os leilões ao vivo: nenhum tem mercado estimado cadastrado. ' +
      'Sem essa referência no app, não calculo se está abaixo do mercado.'
    );
  }

  if (melhores.length === 0 && compensa === 0 && atencao === 0) {
    return (
      `Consultei ${liveComMercado} leilão(ões) ao vivo com mercado estimado. ` +
      'Nenhum está ≥5% abaixo da referência neste momento. Acompanhe em Leilões.'
    );
  }

  return [
    `Varri os leilões ao vivo: ${compensa} Compensa (≥20%) e ${atencao} Atenção (5–19%).`,
    '',
    'Destaques:',
    ...melhores.slice(0, 5).map((l) => {
      const verdict = verdictLabelPt(String(l.verdict ?? 'unknown'));
      return `• ${l.title ?? 'Lote'} — lance ${formatBrl(Number(l.current_price_cents ?? 0))} vs mercado ${formatBrl(Number(l.market_cents ?? 0))} (${l.discount_pct ?? 0}% abaixo, ${verdict})`;
    }),
    '',
    'Abra o lote em Leilões para caução, teto e próximo lance.',
  ].join('\n');
}

export function isBuyerMarketQuestion(message: string): boolean {
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

/** Texto compacto das regras do app — injetado no system prompt. */
export const LEVOU_RULES_KNOWLEDGE = `
=== REGRAS OFICIAIS DO APP LEVOU (use como fonte primária) ===

KYC E BLOQUEIO DE LANCE
- Navegar e ver leilões é livre sem KYC.
- Dar lance exige KYC aprovado (documento + selfie). Status "pendente" ou "rejeitado" bloqueia lances.
- Orientar: Perfil/Mais → completar verificação.

CARTEIRA, DEPÓSITO E SAQUE
- Depósito somente via Pix na aba Carteira; compensação em segundos após confirmação.
- Saldo disponível: livre para lances ou saque. Saldo retido: caução bloqueada em lances ativos.
- Se outro usuário cobrir o lance, a retenção volta ao disponível na hora.
- Saque: só para chave Pix do MESMO CPF do KYC; liquidação em até 2h úteis após auditoria.
- Operações de depósito/saque são na Carteira (menu inferior), não no chat.

CAUÇÃO DE LANCE (RETENÇÃO)
- Veículos e imóveis: caução fixa R$ 2.000,00 por lance.
- Demais categorias: 20% (até R$ 2.000), 10% (até R$ 20.000), 3% (até R$ 100.000), 2% acima — mínimo R$ 50.
- Ao aumentar o próprio lance, retém-se caução só sobre o incremento (exceto veículos/imóveis).

MOTOR DE LEILÃO
- Incremento mínimo automático: +R$ 5 (lance < R$ 500), +R$ 50 (até R$ 1.000), +R$ 200 acima.
- Anti-robô: lance nos últimos 15s adiciona +15s ao cronômetro.
- Lance é vinculante; vencer gera fatura de arremate.

ARREMATE, TAXAS E PENALIDADES
- Prazo de pagamento da fatura: 24 horas corridas após o fim do leilão.
- Comissão Levou: 10% sobre valor arrematado (+ frete/custódia se houver no checkout).
- Multa por desistência/inadimplência: 30% irrevogável sobre o arremate; conta pode ser suspensa; lote vai ao 2º colocado.
- Pagamento pode usar saldo interno; se faltar, Pix complementar em até 24h.

ENVIO E RASTREIO
- Envio para endereço do perfil após pagamento confirmado.
- Preparação/etiqueta: até 3 dias úteis; rastreio em Meus Arremates.
- Prazo de entrega conforme transportadora (geralmente 2–12 dias úteis após postagem).
- Conferir embalagem na entrega; recusar se violada e acionar suporte.

AVALIAÇÃO DE MERCADO NO APP
- "Mercado estimado" vem do vendedor no cadastro do lote (referência interna do app).
- Veredito matemático do app:
  • Compensa: ≥20% abaixo do mercado estimado
  • Atenção: 5% a 19% abaixo
  • Acima do mercado: <5% de desconto ou acima do estimado
- NÃO invente preços de sites externos. Oriente o usuário a comparar manualmente em OLX, Mercado Livre ou Webmotors para o mesmo modelo/estado.
- Ao avaliar se compensa: considere lance atual + comissão 10% + frete estimado + estado do item + urgência do leilão.
- Teto sugerido conservador: ~85% do mercado estimado (ou do preço médio que o usuário achar na web), ajustando por conservação.
`.trim();

/** Guia passo a passo — usado quando o usuário pergunta como funciona o leilão. */
export const LEVOU_AUCTION_HOWTO = `
=== GUIA: COMO FUNCIONA O LEILÃO NO LEVOU (ordem real do usuário) ===

1) NAVEGAR (sem pagar)
- Criar conta e ver lotes, cronômetros e lances ao vivo é gratuito.
- O botão "Dar Lance" só libera após KYC aprovado.

2) KYC — IDENTIDADE (obrigatório para lance)
- Perfil/Mais → verificação: nome, CPF, documento (RG/CNH) + selfie com documento.
- Status "pendente" ou "rejeitado" = lances bloqueados até aprovação.

3) CARTEIRA — CRÉDITO REAL (obrigatório para lance)
- Deposite via Pix em Carteira → Depositar. Saldo cai em segundos após confirmação.
- Saldo DISPONÍVEL: pode usar em novos lances ou sacar.
- Saldo RETIDO: parte bloqueada como caução dos lances que você está disputando.
- Sem saldo disponível suficiente para a caução, o lance não é aceito.

4) CAUÇÃO ANTI-GOLPE (garantia de cada lance)
- Cada lance exige retenção de uma GARANTIA na carteira — não é necessariamente o valor total do lote.
- Isso evita lances falsos e desistência após vencer.
- Veículos e imóveis: caução fixa de R$ 2.000,00 por lance.
- Demais categorias (faixa do valor do lance):
  • até R$ 2.000 → 20% (mínimo R$ 50)
  • até R$ 20.000 → 10%
  • até R$ 100.000 → 3%
  • acima → 2%
- Se OUTRO usuário cobrir seu lance: a caução volta ao saldo DISPONÍVEL na hora.
- Se você aumenta seu próprio lance: retém caução só sobre o incremento (exceto veículos/imóveis).

5) MOTOR DE LANCES (disputa justa)
- Incremento mínimo automático: +R$ 5 (lance < R$ 500), +R$ 50 (até R$ 1.000), +R$ 200 acima.
- Anti-robô: lance nos últimos 15 segundos adiciona +15s ao cronômetro.
- O leilão só encerra quando o relógio zera sem novos lances nessa janela.
- Todo lance é vinculante: participar implica compromisso se vencer.

6) SE VOCÊ VENCER (arremate)
- Fatura gerada na hora em Meus Arremates / compras.
- Prazo estrito: 24 horas corridas para pagar.
- Comissão Levou: 10% sobre o valor arrematado (+ frete/custódia se houver).
- Pagamento: saldo interno e/ou Pix complementar.
- Não pagar ou desistir: multa irrevogável de 30%, conta pode ser suspensa, lote vai ao 2º colocado.

7) APÓS O PAGAMENTO
- Envio para endereço do perfil; etiqueta em até 3 dias úteis.
- Rastreio em Meus Arremates; prazo de entrega conforme transportadora.
`.trim();

export function isBuyerAuctionHowToQuestion(message: string): boolean {
  const q = message.toLowerCase();
  if (q.includes('como funciona')) return true;
  if (q.includes('funcionamento')) return true;
  if (q.includes('passo a passo')) return true;
  if (q.includes('preciso de saldo') || q.includes('preciso de credito') || q.includes('preciso de crédito')) {
    return true;
  }
  if (
    (q.includes('garantia') || q.includes('caução') || q.includes('caucao') || q.includes('anti-golpe')) &&
    (q.includes('lance') || q.includes('leil') || q.includes('como') || q.includes('funciona'))
  ) {
    return true;
  }
  if ((q.includes('regras') || q.includes('regra')) && (q.includes('leilão') || q.includes('leilao'))) {
    return true;
  }
  if (
    (q.includes('leilão') || q.includes('leilao')) &&
    (q.includes('funciona') || q.includes('explica') || q.includes('entender') || q.includes('funcionamento'))
  ) {
    return true;
  }
  return false;
}

export function formatBuyerAuctionHowToReply(context: Record<string, unknown>): string {
  const wallet = (context.wallet ?? {}) as Record<string, unknown>;
  const user = (context.user ?? {}) as Record<string, unknown>;
  const kyc = (context.kyc ?? {}) as Record<string, unknown>;
  const kycStatus = String(user.kyc_status ?? kyc.status ?? 'pendente');
  const podeLance = kyc.pode_dar_lance === true;
  const disponivel = formatBrl(Number(wallet.available_cents ?? 0));
  const retido = formatBrl(Number(wallet.hold_cents ?? 0));
  const nome = user.display_name ? String(user.display_name) : 'comprador';

  const situacao = podeLance
    ? `📌 Sua situação agora: KYC aprovado — você já pode dar lances. Saldo disponível ${disponivel} | Retido em garantias ${retido}. Antes de cada lance, confira se o disponível cobre a caução daquele lote.`
    : `📌 Sua situação agora: KYC "${kycStatus}" — lances ainda bloqueados. Saldo disponível ${disponivel}. Vá em Perfil, envie documento + selfie e aguarde aprovação para disputar.`;

  return [
    `${nome}, no Levou não existem lances "de mentira": cada oferta exige identidade verificada e garantia financeira real na carteira. Abaixo está o fluxo completo, na ordem em que você vive no app:`,
    '',
    '1️⃣ Navegar sem pagar',
    'Você pode criar conta, ver todos os lotes, acompanhar cronômetros e assistir lances ao vivo sem custo. O botão "Dar Lance" só libera depois que o KYC for aprovado.',
    '',
    '2️⃣ KYC — verificação de identidade (obrigatório para lance)',
    'Em Perfil/Mais, envie nome completo, CPF, foto do documento (RG ou CNH) e selfie segurando o documento. Com status "pendente" ou "rejeitado", o lance fica bloqueado. Após aprovação, o painel de lances libera na hora.',
    '',
    '3️⃣ Carteira com saldo — você precisa de crédito real',
    'Antes de disputar, deposite via Pix em Carteira → Depositar. O saldo cai em poucos segundos após a confirmação.',
    '• Saldo DISPONÍVEL: livre para novos lances ou saque.',
    '• Saldo RETIDO: valor bloqueado como caução dos lances que você está disputando agora.',
    'Se o disponível for menor que a caução exigida, o app não aceita o lance — carregue a carteira antes.',
    '',
    '4️⃣ Caução anti-golpe — garantia retida em cada lance',
    'Ao clicar em "Dar Lance", o sistema NÃO debita o valor total do produto de uma vez. Ele retém uma GARANTIA (caução) na carteira para evitar lances falsos e desistência após vencer.',
    'Tabela de caução:',
    '• Veículos e imóveis: R$ 2.000,00 fixos por lance.',
    '• Demais categorias, conforme o valor do lance:',
    '  – até R$ 2.000 → 20% (mínimo R$ 50)',
    '  – até R$ 20.000 → 10%',
    '  – até R$ 100.000 → 3%',
    '  – acima de R$ 100.000 → 2%',
    'Se outro participante cobrir seu lance, a caução volta ao saldo DISPONÍVEL no mesmo instante — você pode relançar ou sacar.',
    'Se você aumenta o próprio lance, retém-se caução só sobre o incremento (exceto veículos/imóveis, que mantêm os R$ 2.000).',
    '',
    '5️⃣ Motor de lances — disputa justa',
    'Incremento mínimo automático: +R$ 5 (lance atual < R$ 500), +R$ 50 (até R$ 1.000), +R$ 200 acima.',
    'Anti-robô: qualquer lance nos últimos 15 segundos adiciona +15s ao cronômetro. O leilão só termina quando o relógio zera sem novos lances nessa janela.',
    'Todo lance é vinculante — ao participar, você assume o compromisso de pagar se vencer.',
    '',
    '6️⃣ Se você vencer o leilão (arremate)',
    'No instante em que o cronômetro zera com você na frente, o app gera a Fatura de Arremate (Meus Arremates / compras).',
    '• Prazo: 24 horas corridas para pagar a fatura completa.',
    '• Comissão Levou: 10% sobre o valor arrematado (+ frete/custódia se constar no checkout).',
    '• Pagamento: saldo interno e/ou Pix complementar dentro do prazo.',
    '• Não pagar ou desistir: multa irrevogável de 30%, conta pode ser suspensa e o lote vai ao 2º colocado.',
    '',
    '7️⃣ Depois do pagamento — envio e rastreio',
    'Com o pagamento confirmado, o envio segue para o endereço do seu perfil. Etiqueta/postagem em até 3 dias úteis. Acompanhe o rastreio em Meus Arremates.',
    '',
    situacao,
    '',
    'Texto completo das regras: Mais → Ajuda → Como funciona o leilão.',
  ].join('\n');
}

export function buildBuyerJarvisSystemPrompt(
  context: Record<string, unknown>,
  route: string,
  userMessage?: string | null,
): string {
  const kyc = (context.user as Record<string, unknown> | undefined)?.kyc_status ?? 'pendente';
  const podeLance = (context.kyc as Record<string, unknown> | undefined)?.pode_dar_lance;
  const isHowTo = userMessage ? isBuyerAuctionHowToQuestion(userMessage) : false;

  const lengthRule = isHowTo
    ? 'Pergunta sobre COMO FUNCIONA O LEILÃO: resposta ELABORADA (300–450 palavras), em 6–7 etapas numeradas, linguagem clara para leigo. Explique: navegação grátis → KYC → depósito Pix/saldo → caução anti-golpe (percentuais) → motor de lances → arremate 24h → envio. Personalize com saldo/KYC do contexto. NÃO resuma em 2 frases.'
    : 'Respostas normais: máximo 220 palavras, diretas e acionáveis.';

  return [
    'Você é o Jarvis, assistente oficial do app Levou (leilões brasileiro), em português do Brasil.',
    'Responda com base nas REGRAS OFICIAIS abaixo e no CONTEXTO JSON do usuário.',
    'Não invente números, prazos ou políticas. Se faltar dado, diga o que falta e onde ver no app.',
    lengthRule,
    'Tom profissional e didático. Cite telas: Carteira, Perfil, Leilões, Meus Arremates, Mais → Ajuda.',
    '',
    'COMO RESPONDER:',
    '- "Como funciona o leilão?" / regras gerais: use o GUIA PASSO A PASSO abaixo — resposta completa, não genérica.',
    '- Depósito/Pix/saque: use regras de carteira + saldos do contexto.',
    '- KYC/bloqueio de lance: use status do contexto; explique o que falta para desbloquear.',
    '- Caução/garantia anti-golpe: explique percentuais e que só retém garantia, não o valor total do lote (salvo arremate).',
    '- Lances/incremento/overtime: use regras do motor de leilão.',
    '- Arremate/multa/24h: use regras de penalidade e comissão 10%.',
    '- Envio/rastreio: use regras de envio; se houver pedidos no contexto, cite status.',
    '- Oportunidades / "tem lote abaixo do mercado?": use leiloes_oportunidades do JSON — liste títulos, lance atual, mercado estimado, % desconto e veredito.',
    '- Lote específico (detalhe fino): oriente abrir a tela do leilão para caução, teto e próximo lance.',
    '',
    LEVOU_AUCTION_HOWTO,
    '',
    LEVOU_RULES_KNOWLEDGE,
    '',
    `Rota atual: ${route}`,
    `KYC: ${kyc}${podeLance === false ? ' (LANCES BLOQUEADOS até aprovação)' : podeLance === true ? ' (pode dar lance)' : ''}`,
    '',
    'CONTEXTO DO USUÁRIO (JSON):',
    JSON.stringify(context).slice(0, 12_000),
  ].join('\n');
}

export type AuctionInsightInput = {
  title: string;
  description: string | null;
  currentPriceCents: number;
  startingPriceCents: number;
  marketCents: number | null;
  conservationState: string | null;
  listingCategory: string | null;
  listingExtras: Record<string, unknown> | null;
  status: string;
  secondsLeft: number | null;
  verdict: string;
  discountPct: number | null;
  savingsCents: number | null;
  buyerContext?: {
    availableCents?: number;
    holdCents?: number;
    isLeading?: boolean;
    kycStatus?: string;
    podeDarLance?: boolean;
  };
};

export function buildAuctionMarketInsight(input: AuctionInsightInput): string {
  const nextBid = computeMinNextBidCents(input.currentPriceCents);
  const holdNext = computeBidHoldCents(nextBid, input.listingCategory);
  const ceiling =
    input.marketCents != null && input.marketCents > 0
      ? Math.max(input.currentPriceCents, Math.round(input.marketCents * 0.85))
      : null;
  const commissionOnBid = Math.round(input.currentPriceCents * LEVOU_COMMISSION_RATE);

  const lines = [
    `Próximo lance mínimo: ${formatBrl(nextBid)}`,
    `Caução estimada no próximo lance: ${formatBrl(holdNext)} (${input.listingCategory ?? 'categoria padrão'})`,
    `Comissão Levou (10%) sobre lance atual: ~${formatBrl(commissionOnBid)}`,
  ];

  if (input.marketCents != null && input.marketCents > 0) {
    lines.push(
      `Mercado estimado (cadastro do lote): ${formatBrl(input.marketCents)}`,
      `Economia vs mercado no lance atual: ${input.savingsCents != null ? formatBrl(input.savingsCents) : 'n/d'} (${input.discountPct ?? 0}%)`,
    );
    if (ceiling != null) {
      lines.push(`Teto conservador sugerido pelo app: ~${formatBrl(ceiling)} (≈15% abaixo do mercado estimado)`);
    }
  } else {
    lines.push('Sem mercado estimado — compare manualmente em OLX/Mercado Livre/Webmotors.');
  }

  if (input.buyerContext) {
    const b = input.buyerContext;
    if (b.kycStatus) lines.push(`KYC do comprador: ${b.kycStatus}${b.podeDarLance === false ? ' (não pode lance)' : ''}`);
    if (b.availableCents != null) {
      lines.push(
        `Saldo disponível do comprador: ${formatBrl(b.availableCents)} | Retido: ${formatBrl(b.holdCents ?? 0)}`,
      );
      if (b.availableCents < holdNext) {
        lines.push('ALERTA: saldo disponível pode ser insuficiente para a caução do próximo lance.');
      }
    }
    if (b.isLeading != null) {
      lines.push(b.isLeading ? 'Comprador LIDERA este leilão agora.' : 'Comprador NÃO lidera este leilão.');
    }
  }

  return lines.join('\n');
}

export function buildAuctionAdvisorSystemPrompt(input: AuctionInsightInput): string {
  const insight = buildAuctionMarketInsight(input);

  return [
    'Você é o Jarvis de análise de lote do app Levou, em português do Brasil.',
    'Responda com base nas REGRAS OFICIAIS, nos DADOS DO LOTE e na ANÁLISE MATEMÁTICA abaixo.',
    'NÃO contradiga o veredito determinístico. NÃO invente preços de mercado externos.',
    'Ao falar de "compensa", use o veredito + economia + caução + comissão 10% + frete (se citado nos extras).',
    'Sugira comparar em marketplaces reais (OLX, Mercado Livre) quando o usuário pedir "mercado na web".',
    'Máximo 140 palavras. Objetivo, sem prometer lucro.',
    '',
    LEVOU_RULES_KNOWLEDGE,
    '',
    '=== DADOS DO LOTE ===',
    `Título: ${input.title}`,
    `Descrição: ${(input.description ?? '').slice(0, 500) || 'n/d'}`,
    `Lance atual: ${formatBrl(input.currentPriceCents)} | Inicial: ${formatBrl(input.startingPriceCents)}`,
    `Estado: ${input.conservationState ?? 'n/d'} | Categoria: ${input.listingCategory ?? 'n/d'}`,
    `Status: ${input.status}${input.secondsLeft != null ? ` | ~${input.secondsLeft}s restantes` : ''}`,
    `Extras do anúncio: ${JSON.stringify(input.listingExtras ?? {}).slice(0, 400)}`,
    '',
    '=== ANÁLISE MATEMÁTICA (obrigatória — não contradizer) ===',
    `Veredito: ${verdictLabelPt(input.verdict)}${input.discountPct != null ? ` (${input.discountPct}% vs mercado estimado)` : ''}`,
    insight,
  ].join('\n');
}
