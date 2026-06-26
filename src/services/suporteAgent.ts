import { formatBRL } from '@/src/lib/bids';
import { isMockMode } from '@/src/lib/mockMode';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { obterPerfilKyc } from '@/src/services/kycProfile';
import { KYC_STATUS_LABELS } from '@/src/types/kyc';
import type { StatusVerificacao } from '@/src/types/database';

export type SuporteAgentContexto = {
  /** Centavos — mock ou Supabase */
  saldoDisponivelCents: number;
  saldoRetidoCents: number;
};

type PedidoRastreio = {
  code: string;
  title: string;
  trackingCode: string | null;
  status: string;
};

const MOCK_RASTREIOS: PedidoRastreio[] = [
  {
    code: 'LC-45821',
    title: 'PlayStation 5 Edição Digital',
    trackingCode: 'BR123456789BR',
    status: 'em_envio',
  },
  {
    code: 'LC-44102',
    title: 'Monitor Gamer UltraWide 34"',
    trackingCode: 'BR987654321BR',
    status: 'pago',
  },
];

const MOCK_SALDO = { disponivel: 250_000, retido: 50_000 };

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function mencionaContestacaoFatura(texto: string): boolean {
  const t = normalizar(texto);
  return (
    t.includes('contest') ||
    t.includes('disputa') ||
    t.includes('cobranca errada') ||
    t.includes('fatura errada') ||
    t.includes('cobranca indevida') ||
    (t.includes('fatura') && (t.includes('errad') || t.includes('incorret') || t.includes('nao reconheco')))
  );
}

function intent(texto: string): 'kyc' | 'rastreio' | 'carteira' | 'humano' | 'lance' | 'geral' {
  const t = normalizar(texto);
  if (mencionaContestacaoFatura(texto) || t.includes('atendente humano') || t === 'humano') {
    return 'humano';
  }
  if (
    t.includes('kyc') ||
    t.includes('cadastro') ||
    t.includes('verificacao') ||
    t.includes('identidade') ||
    t.includes('documento') ||
    t.includes('aprovad')
  ) {
    return 'kyc';
  }
  if (
    t.includes('rastreio') ||
    t.includes('rastreamento') ||
    t.includes('codigo de rastreio') ||
    t.includes('correios') ||
    t.includes('envio') ||
    t.includes('pacote') ||
    t.includes('entrega')
  ) {
    return 'rastreio';
  }
  if (
    t.includes('carteira') ||
    t.includes('saldo') ||
    t.includes('retido') ||
    t.includes('disponivel') ||
    t.includes('deposito') ||
    t.includes('saque') ||
    t.includes('pix') ||
    t.includes('ftk')
  ) {
    return 'carteira';
  }
  if (t.includes('lance') || t.includes('leilao') || t.includes('arremate')) {
    return 'lance';
  }
  return 'geral';
}

async function carregarSaldoUsuario(userId: string): Promise<SuporteAgentContexto> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return {
      saldoDisponivelCents: MOCK_SALDO.disponivel,
      saldoRetidoCents: MOCK_SALDO.retido,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      saldoDisponivelCents: MOCK_SALDO.disponivel,
      saldoRetidoCents: MOCK_SALDO.retido,
    };
  }

  const { data } = await supabase
    .from('users')
    .select('escrow_balance_cents')
    .eq('id', userId)
    .maybeSingle();

  const disponivel = (data?.escrow_balance_cents as number) ?? 0;
  return {
    saldoDisponivelCents: disponivel,
    saldoRetidoCents: 0,
  };
}

async function carregarPedidosRastreio(userId: string): Promise<PedidoRastreio[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_RASTREIOS;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_RASTREIOS;

  const { data, error } = await supabase
    .from('orders')
    .select('code, status, tracking_code, auction:auctions(title)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !data?.length) return MOCK_RASTREIOS;

  return data.map((row) => ({
    code: row.code as string,
    title: (row.auction as { title?: string } | null)?.title ?? 'Leilão',
    trackingCode: (row.tracking_code as string | null) ?? null,
    status: row.status as string,
  }));
}

function respostaKyc(status: StatusVerificacao | null, email: string | null): string {
  if (!status) {
    return (
      'Não encontrei seu cadastro logado. Faça login e conclua a verificação em Mais → Meu cadastro (KYC).'
    );
  }

  const label = KYC_STATUS_LABELS[status];
  let orientacao = '';

  switch (status) {
    case 'pendente':
      orientacao =
        'Envie nome completo, CPF, documento (RG/CNH) e selfie em Mais → Meu cadastro (KYC).';
      break;
    case 'em_analise':
      orientacao =
        'Nossa equipe está analisando seus documentos. Você receberá uma notificação quando for aprovado.';
      break;
    case 'aprovado':
      orientacao = 'Seu cadastro está liberado para dar lances nos leilões.';
      break;
    case 'rejeitado':
      orientacao =
        'Reenvie os documentos pelo app em Mais → Meu cadastro (KYC) com fotos nítidas.';
      break;
  }

  return (
    `Status KYC (${email ?? 'sua conta'}): ${label}.\n\n${orientacao}`
  );
}

function respostaRastreio(pedidos: PedidoRastreio[]): string {
  const comCodigo = pedidos.filter((p) => p.trackingCode?.trim());
  if (!comCodigo.length) {
    return (
      'Ainda não há código de rastreio nos seus arremates. Assim que o vendedor postar, o código aparece em Mais → Meus Lotes / Arremates.\n\n' +
      'Prazo típico de postagem: até 3 dias úteis após o pagamento confirmado.'
    );
  }

  const linhas = comCodigo
    .slice(0, 5)
    .map(
      (p) =>
        `• ${p.title} (${p.code})\n  Código: ${p.trackingCode}\n  Status do pedido: ${p.status}`,
    )
    .join('\n\n');

  return `Seus rastreios mais recentes:\n\n${linhas}\n\nRastreie também em Mais → Meus Lotes / Arremates → Rastrear Objeto.`;
}

function respostaCarteira(ctx: SuporteAgentContexto): string {
  const total = ctx.saldoDisponivelCents + ctx.saldoRetidoCents;
  return (
    `Resumo da sua carteira:\n\n` +
    `• Saldo disponível: ${formatBRL(ctx.saldoDisponivelCents)} — livre para lances ou saque.\n` +
    `• Saldo retido (garantia): ${formatBRL(ctx.saldoRetidoCents)} — bloqueado em lances ativos.\n` +
    `• Total na conta: ${formatBRL(total)}.\n\n` +
    `Se outro participante cobrir seu lance, o valor retido volta ao disponível na hora.\n` +
    `Depósitos e saques: aba Carteira no menu inferior (não é esta tela de ajuda).`
  );
}

function respostaHumano(): string {
  const protocolo = `SUP-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  return (
    `Entendi — vou encaminhar para atendimento humano.\n\n` +
    `Protocolo: ${protocolo}\n` +
    `Horário: seg–sex, 9h às 18h (horário de Brasília).\n\n` +
    `Um especialista vai analisar sua contestação de fatura ou caso complexo. ` +
    `Guarde o protocolo e aguarde retorno pelo e-mail cadastrado ou notificações do app.`
  );
}

function respostaLance(): string {
  return (
    'Sobre lances e leilões:\n\n' +
    '• É necessário KYC aprovado para dar lance.\n' +
    '• Cada lote exige incremento mínimo (não dá para cobrir com centavos).\n' +
    '• Nos últimos 15s do cronômetro, cada lance pode acrescentar +15s (anti-robô).\n\n' +
    'Leia as regras completas em Mais → Ajuda → Como funciona o leilão.'
  );
}

function respostaGeral(): string {
  return (
    'Posso ajudar com:\n\n' +
    '• Status do seu KYC (cadastro)\n' +
    '• Código de rastreio dos arremates\n' +
    '• Saldo disponível e retido na carteira\n' +
    '• Contestação de faturas (encaminho para humano)\n\n' +
    'Digite sua dúvida ou use os atalhos abaixo.'
  );
}

export async function processarMensagemSuporte(
  mensagem: string,
  atalhoId?: string,
): Promise<string[]> {
  const userId = await obterIdUsuarioAtual();
  const texto =
    atalhoId === 'kyc'
      ? 'status kyc'
      : atalhoId === 'rastreio'
        ? 'codigo de rastreio'
        : atalhoId === 'carteira'
          ? 'saldo carteira'
          : atalhoId === 'humano'
            ? 'contestação fatura atendente humano'
            : mensagem;

  const alvo = intent(texto);

  if (alvo === 'humano') {
    return [respostaHumano()];
  }

  if (!userId && alvo !== 'geral') {
    return ['Faça login no app para eu consultar seus dados com segurança.'];
  }

  switch (alvo) {
    case 'kyc': {
      const perfil = userId ? await obterPerfilKyc(userId) : null;
      return [
        respostaKyc(
          perfil?.statusVerificacao ?? null,
          perfil?.email ?? null,
        ),
      ];
    }
    case 'rastreio': {
      const pedidos = userId ? await carregarPedidosRastreio(userId) : MOCK_RASTREIOS;
      return [respostaRastreio(pedidos)];
    }
    case 'carteira': {
      const ctx = userId
        ? await carregarSaldoUsuario(userId)
        : { saldoDisponivelCents: MOCK_SALDO.disponivel, saldoRetidoCents: MOCK_SALDO.retido };
      return [respostaCarteira(ctx)];
    }
    case 'lance':
      return [respostaLance()];
    default:
      return [respostaGeral()];
  }
}
