export type StatusTransacao = 'concluido' | 'pendente';

export type MetodoPagamento = 'pix' | 'boleto' | 'cartao';

export type EtapaTimelinePedido = {
  id: string;
  titulo: string;
  descricao: string;
  data: string | null;
  concluida: boolean;
  atual?: boolean;
};

export type TransacaoRecente = {
  id: string;
  leilaoId: string;
  pedido: {
    nome: string;
    imagem: string;
    descricao?: string;
    vendedor?: string;
    vendedorId?: string;
  };
  usuario: {
    id: string;
    nome: string;
    handle: string;
    avatar: string;
    email: string;
    telefone: string;
    cpf: string;
    kycStatus: 'aprovado' | 'em_analise' | 'pendente' | 'rejeitado';
  };
  valorCents: number;
  data: string;
  status: StatusTransacao;
  pagamento: {
    metodo: MetodoPagamento;
    transacaoId: string;
    aprovadoEm: string | null;
    comprovanteUrl: string | null;
    gateway: string;
  };
  timeline: EtapaTimelinePedido[];
};

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamento, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
};

function timelineCompleta(
  arrematado: string,
  pago: string | null,
  envio: string | null,
  finalizado: string | null,
  pendentePagamento: boolean,
): EtapaTimelinePedido[] {
  const pagoOk = Boolean(pago);
  const envioOk = Boolean(envio);
  const finalOk = Boolean(finalizado);

  return [
    {
      id: 'arrematado',
      titulo: 'Arrematado',
      descricao: 'Lote vencido pelo licitante',
      data: arrematado,
      concluida: true,
    },
    {
      id: 'pagamento',
      titulo: pendentePagamento && !pagoOk ? 'Pagamento pendente' : 'Pago',
      descricao: pendentePagamento && !pagoOk
        ? 'Aguardando confirmação financeira'
        : 'Pagamento confirmado pela plataforma',
      data: pago,
      concluida: pagoOk,
      atual: pendentePagamento && !pagoOk,
    },
    {
      id: 'envio',
      titulo: 'Aguardando envio',
      descricao: 'Vendedor prepara postagem do item',
      data: envio,
      concluida: envioOk,
      atual: pagoOk && !envioOk && !finalOk,
    },
    {
      id: 'finalizado',
      titulo: 'Finalizado',
      descricao: 'Entrega confirmada e pedido encerrado',
      data: finalizado,
      concluida: finalOk,
      atual: envioOk && !finalOk,
    },
  ];
}

export const TRANSACOES_RECENTES: TransacaoRecente[] = [
  {
    id: '#LC-45821',
    leilaoId: 'l-rolex-01',
    pedido: {
      nome: 'Rolex Submariner',
      imagem:
        'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=80&h=80&fit=crop',
      descricao: 'Relógio Submariner Date, caixa e papel, revisado em 2024.',
      vendedor: '@luxury_watches',
      vendedorId: 'v-luxury',
    },
    usuario: {
      id: 'u-john',
      nome: 'John D.',
      handle: '@johnd',
      avatar: 'https://i.pravatar.cc/64?img=12',
      email: 'john.d@email.com',
      telefone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      kycStatus: 'aprovado',
    },
    valorCents: 2850000,
    data: '28/05/2025 14:35',
    status: 'concluido',
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-9F2A88C1',
      aprovadoEm: '28/05/2025 14:42',
      comprovanteUrl: 'https://example.com/comprovantes/txn-9f2a88c1.pdf',
      gateway: 'Mercado Pago',
    },
    timeline: timelineCompleta(
      '28/05/2025 14:35',
      '28/05/2025 14:42',
      '29/05/2025 09:10',
      '02/06/2025 16:20',
      false,
    ),
  },
  {
    id: '#LC-45820',
    leilaoId: 'l-porsche-02',
    pedido: {
      nome: 'Porsche 911 Turbo S',
      imagem:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=80&h=80&fit=crop',
      descricao: '911 Turbo S 2021, 12.000 km, revisões em concessionária.',
      vendedor: '@garage_premium',
      vendedorId: 'v-garage',
    },
    usuario: {
      id: 'u-maria',
      nome: 'Maria L.',
      handle: '@marial',
      avatar: 'https://i.pravatar.cc/64?img=5',
      email: 'maria.l@email.com',
      telefone: '(21) 99876-1122',
      cpf: '987.654.321-00',
      kycStatus: 'aprovado',
    },
    valorCents: 18500000,
    data: '28/05/2025 13:12',
    status: 'pendente',
    pagamento: {
      metodo: 'boleto',
      transacaoId: 'TXN-7B3D19E0',
      aprovadoEm: null,
      comprovanteUrl: null,
      gateway: 'PagSeguro',
    },
    timeline: timelineCompleta('28/05/2025 13:12', null, null, null, true),
  },
  {
    id: '#LC-45819',
    leilaoId: 'l-macbook-03',
    pedido: {
      nome: 'MacBook Pro M3 Max',
      imagem:
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=80&h=80&fit=crop',
      descricao: 'M3 Max 36GB/1TB, AppleCare até 2026.',
      vendedor: '@tech_store_br',
      vendedorId: 'v-tech',
    },
    usuario: {
      id: 'u-carlos',
      nome: 'Carlos R.',
      handle: '@carlosr',
      avatar: 'https://i.pravatar.cc/64?img=33',
      email: 'carlos.r@email.com',
      telefone: '(31) 97654-8899',
      cpf: '456.789.123-00',
      kycStatus: 'em_analise',
    },
    valorCents: 2499000,
    data: '28/05/2025 11:48',
    status: 'concluido',
    pagamento: {
      metodo: 'cartao',
      transacaoId: 'TXN-4C8E22A9',
      aprovadoEm: '28/05/2025 11:51',
      comprovanteUrl: 'https://example.com/comprovantes/txn-4c8e22a9.pdf',
      gateway: 'Stripe',
    },
    timeline: timelineCompleta(
      '28/05/2025 11:48',
      '28/05/2025 11:51',
      '28/05/2025 18:30',
      null,
      false,
    ),
  },
  {
    id: '#LC-45818',
    leilaoId: 'l-jordan-04',
    pedido: {
      nome: 'Jordan 1 Retro High',
      imagem:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop',
      descricao: 'Jordan 1 Chicago Reimagined, tamanho 42 BR.',
      vendedor: '@sneaker_hub',
      vendedorId: 'v-sneaker',
    },
    usuario: {
      id: 'u-ana',
      nome: 'Ana P.',
      handle: '@anape',
      avatar: 'https://i.pravatar.cc/64?img=47',
      email: 'ana.p@email.com',
      telefone: '(41) 98877-6655',
      cpf: '321.654.987-00',
      kycStatus: 'aprovado',
    },
    valorCents: 189000,
    data: '27/05/2025 22:05',
    status: 'concluido',
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-1A9F77D2',
      aprovadoEm: '27/05/2025 22:07',
      comprovanteUrl: 'https://example.com/comprovantes/txn-1a9f77d2.pdf',
      gateway: 'Mercado Pago',
    },
    timeline: timelineCompleta(
      '27/05/2025 22:05',
      '27/05/2025 22:07',
      '28/05/2025 10:15',
      '30/05/2025 14:00',
      false,
    ),
  },
  {
    id: '#LC-45817',
    leilaoId: 'l-guitar-05',
    pedido: {
      nome: 'Kit Guitarra Fender',
      imagem:
        'https://images.unsplash.com/photo-1516924960028-331b3b58ea5a?w=80&h=80&fit=crop',
      descricao: 'Telecaster American Professional II + case.',
      vendedor: '@music_gear',
      vendedorId: 'v-music',
    },
    usuario: {
      id: 'u-pedro',
      nome: 'Pedro M.',
      handle: '@pedrom',
      avatar: 'https://i.pravatar.cc/64?img=68',
      email: 'pedro.m@email.com',
      telefone: '(51) 99123-4567',
      cpf: '654.321.789-00',
      kycStatus: 'pendente',
    },
    valorCents: 875000,
    data: '27/05/2025 19:30',
    status: 'pendente',
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-6D2C11B8',
      aprovadoEm: null,
      comprovanteUrl: null,
      gateway: 'Mercado Pago',
    },
    timeline: timelineCompleta('27/05/2025 19:30', null, null, null, true),
  },
];

export function marcarTransacaoComoPaga(tx: TransacaoRecente): TransacaoRecente {
  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    ...tx,
    status: 'concluido',
    pagamento: {
      ...tx.pagamento,
      aprovadoEm: agora,
      comprovanteUrl:
        tx.pagamento.comprovanteUrl ??
        `https://example.com/comprovantes/${tx.pagamento.transacaoId.toLowerCase()}.pdf`,
    },
    timeline: timelineCompleta(tx.data, agora, null, null, false),
  };
}
