import type { BuyerJarvisContext } from '@/src/types/buyerJarvis';
import { formatBRL } from '@/src/lib/bids';

export function isAuctionHowToQuestion(message: string): boolean {
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

/** Guia completo — espelha formatBuyerAuctionHowToReply da edge function. */
export function formatJarvisAuctionHowToReply(context: BuyerJarvisContext): string {
  const kycStatus = context.kyc?.status ?? context.user.kyc_status;
  const podeLance = context.kyc?.pode_dar_lance === true;
  const disponivel = formatBRL(context.wallet.available_cents);
  const retido = formatBRL(context.wallet.hold_cents);
  const nome = context.user.display_name ?? 'comprador';

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
