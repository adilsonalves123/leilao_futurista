import { formatBRL } from '@/src/lib/bids';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const PRAZO_PAGAMENTO_MS = 24 * 60 * 60 * 1000;
const LIMITE_ESCALACAO_MS = 2 * 60 * 60 * 1000;

export const MSG_ESCALACAO_PRAZO =
  '⚠️ ATENÇÃO: Usuário se aproximando do prazo limite de 24h sem quitar o lote. Transferido para auditoria humana.';

export type ContextoPedidoLote = {
  code: string;
  title: string;
  status: string;
  trackingCode: string | null;
  totalCents: number;
  vendorName: string;
  createdAt: string;
  horasRestantesPagamento: number | null;
};

export type LotChatAgentResult = {
  respostas: string[];
  escalarAdmin: boolean;
  mensagemSistemaEscalacao?: string;
  /** Conflito grave: robô não responde, só escala */
  interceptarSemResposta?: boolean;
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

const PALAVRAS_CONFLITO = [
  'defeito',
  'quebrado',
  'estorno',
  'procon',
  'processo',
  'nao recebi',
  'não recebi',
  'nao chegou',
  'não chegou',
  'golpe',
  'fraude',
];

function temConflito(texto: string): boolean {
  const t = normalizar(texto);
  return PALAVRAS_CONFLITO.some((p) => t.includes(normalizar(p)));
}

function pedeAdminExplicito(texto: string): boolean {
  const t = normalizar(texto);
  return (
    t.includes('atendente') ||
    t.includes('plataforma') ||
    t.includes('admin') ||
    t.includes('humano') ||
    t.includes('contest') ||
    t.includes('disputa') ||
    t === 'admin'
  );
}

function pedeVendedor(texto: string): boolean {
  const t = normalizar(texto);
  return t.includes('vendedor') || t.includes('loja') || t.includes('envio direto');
}

function ehComprovantePix(texto: string, temImagem: boolean): boolean {
  return temImagem && normalizar(texto).includes('comprovante');
}

async function carregarPedido(orderId: string): Promise<ContextoPedidoLote | null> {
  if (isMockMode() || !isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('orders')
    .select(
      'code, status, tracking_code, total_cents, created_at, auction:auctions(title), vendor:users!vendor_id(display_name, nome_completo, email)',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) return null;

  const vendor = data.vendor as {
    display_name?: string | null;
    nome_completo?: string | null;
    email?: string;
  } | null;

  const createdAt = data.created_at as string;
  let horasRestantes: number | null = null;
  if ((data.status as string) === 'pendente_pagamento') {
    const limite = new Date(createdAt).getTime() + PRAZO_PAGAMENTO_MS;
    horasRestantes = (limite - Date.now()) / (60 * 60 * 1000);
  }

  return {
    code: data.code as string,
    title: (data.auction as { title?: string } | null)?.title ?? 'Lote',
    status: data.status as string,
    trackingCode: (data.tracking_code as string | null) ?? null,
    totalCents: (data.total_cents as number) ?? 0,
    vendorName:
      vendor?.nome_completo ?? vendor?.display_name ?? vendor?.email?.split('@')[0] ?? 'Vendedor',
    createdAt,
    horasRestantesPagamento: horasRestantes,
  };
}

/** Gatilho de tempo: fatura pendente com menos de 2h para estourar 24h */
export async function verificarEscalacaoPrazoPagamento(
  orderId: string,
): Promise<LotChatAgentResult | null> {
  const pedido = await carregarPedido(orderId);
  if (!pedido || pedido.status !== 'pendente_pagamento') return null;
  if (pedido.horasRestantesPagamento == null) return null;
  if (pedido.horasRestantesPagamento > 2) return null;

  return {
    respostas: [],
    escalarAdmin: true,
    mensagemSistemaEscalacao: MSG_ESCALACAO_PRAZO,
    interceptarSemResposta: true,
  };
}

export async function processarMensagemLoteChat(
  orderId: string,
  mensagem: string,
  atalhoId?: string,
  opcoes?: { temImagem?: boolean },
): Promise<LotChatAgentResult> {
  const temImagem = opcoes?.temImagem ?? false;
  const texto =
    atalhoId === 'rastreio'
      ? 'codigo de rastreio do meu pedido'
      : atalhoId === 'pagamento'
        ? 'status do pagamento do pedido'
        : atalhoId === 'prazo'
          ? 'prazos de envio e entrega'
          : atalhoId === 'admin'
            ? 'preciso falar com a plataforma'
            : mensagem;

  if (ehComprovantePix(texto, temImagem)) {
    return {
      respostas: [],
      escalarAdmin: true,
      mensagemSistemaEscalacao:
        'Comprovante de pagamento recebido. Transferido para conferência visual pela equipe da plataforma.',
      interceptarSemResposta: true,
    };
  }

  if (temConflito(texto)) {
    return {
      respostas: [],
      escalarAdmin: true,
      mensagemSistemaEscalacao:
        'Detectamos um possível conflito neste atendimento. Um administrador assumirá a conversa em instantes.',
      interceptarSemResposta: true,
    };
  }

  if (pedeAdminExplicito(texto) || atalhoId === 'admin') {
    return {
      respostas: [
        'Vou encaminhar você para um atendente da plataforma sobre este lote. Aguarde um instante.',
      ],
      escalarAdmin: true,
    };
  }

  if (pedeVendedor(texto)) {
    return {
      respostas: [
        'Para falar diretamente com o vendedor, primeiro um atendente da plataforma analisa seu caso.',
        'Use o atalho "Falar com a plataforma" ou descreva o problema que eu encaminho.',
      ],
      escalarAdmin: false,
    };
  }

  const pedido = await carregarPedido(orderId);
  const t = normalizar(texto);

  if (t.includes('rastreio') || t.includes('correios') || t.includes('envio')) {
    if (!pedido) {
      return {
        respostas: [
          'Após o pagamento, o código de rastreio aparece em Meus Lotes → detalhes do pedido.',
        ],
        escalarAdmin: false,
      };
    }
    if (pedido.trackingCode) {
      return {
        respostas: [
          `Pedido ${pedido.code} (${pedido.title}):\n\nCódigo de rastreio: ${pedido.trackingCode}\nStatus: ${pedido.status}`,
        ],
        escalarAdmin: false,
      };
    }
    return {
      respostas: [
        `Pedido ${pedido.code}: o vendedor ainda não registrou o rastreio. Prazo típico: até 3 dias úteis após o pagamento.`,
      ],
      escalarAdmin: false,
    };
  }

  if (t.includes('pagamento') || t.includes('pix') || t.includes('pagar')) {
    if (!pedido) {
      return {
        respostas: ['Conclua o pagamento pelo botão Efetuar Pagamento na ficha do lote.'],
        escalarAdmin: false,
      };
    }
    const prazo =
      pedido.horasRestantesPagamento != null && pedido.horasRestantesPagamento > 0
        ? `\nPrazo restante para quitar: cerca de ${Math.ceil(pedido.horasRestantesPagamento)}h.`
        : '';
    return {
      respostas: [
        `Pedido ${pedido.code}: status ${pedido.status}. Total ${formatBRL(pedido.totalCents)}.${prazo}`,
      ],
      escalarAdmin: false,
    };
  }

  return {
    respostas: [
      `Posso ajudar com este lote${pedido ? ` (${pedido.code})` : ''}: rastreio, pagamento ou prazos.`,
      'Use os atalhos abaixo ou peça "Falar com a plataforma" para um humano.',
    ],
    escalarAdmin: false,
  };
}
