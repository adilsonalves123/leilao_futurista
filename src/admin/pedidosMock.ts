import type {
  AdminPedidoDetalhe,
  AdminPedidoEtapa,
  AdminPedidoEvento,
  AdminPedidoResumo,
  FiltroPedidoAdmin,
  MetodoPagamentoPedido,
  StatusPedidoAdmin,
} from '@/src/admin/types';
import {
  pendenciaEhEntrega,
  pendenciaEhPagamento,
  resolverPendenciaPedidoAdmin,
} from '@/src/lib/adminLeilaoFluxo';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timelineFromStatus(
  criadoEm: string,
  status: StatusPedidoAdmin,
  aprovadoEm: string | null,
  enviadoEm: string | null,
  finalizadoEm: string | null,
): AdminPedidoEtapa[] {
  const pagoOk = Boolean(aprovadoEm) || !['pendente_pagamento', 'estornado'].includes(status);
  const envioOk = Boolean(enviadoEm) || ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(status);
  const finalOk = status === 'finalizado';

  const pendentePagamento = status === 'pendente_pagamento';
  const emDisputa = status === 'em_disputa';

  return [
    {
      id: 'arrematado',
      titulo: 'Arrematado',
      descricao: 'Lote vencido pelo licitante',
      data: formatarData(criadoEm),
      concluida: true,
    },
    {
      id: 'pagamento',
      titulo: emDisputa
        ? 'Disputa aberta'
        : pendentePagamento
          ? 'Pagamento pendente'
          : 'Pago',
      descricao: emDisputa
        ? 'Mediação em andamento — pagamento retido'
        : pendentePagamento
          ? 'Aguardando confirmação financeira'
          : 'Pagamento confirmado pela plataforma',
      data: aprovadoEm ? formatarData(aprovadoEm) : null,
      concluida: pagoOk && !emDisputa,
      atual: pendentePagamento || emDisputa,
    },
    {
      id: 'envio',
      titulo: 'Aguardando envio',
      descricao: 'Vendedor prepara postagem do item',
      data: enviadoEm ? formatarData(enviadoEm) : null,
      concluida: envioOk && status !== 'pago',
      atual: pagoOk && !envioOk && !finalOk && !emDisputa,
    },
    {
      id: 'transito',
      titulo: 'Em trânsito',
      descricao: 'Item postado e a caminho do comprador',
      data: enviadoEm ? formatarData(enviadoEm) : null,
      concluida: ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(status),
      atual: status === 'em_envio',
    },
    {
      id: 'finalizado',
      titulo: 'Finalizado',
      descricao: 'Entrega confirmada e pedido encerrado',
      data: finalizadoEm ? formatarData(finalizadoEm) : null,
      concluida: finalOk,
      atual: status === 'aguardando_confirmacao',
    },
  ];
}

function eventosBase(
  codigo: string,
  criadoEm: string,
  status: StatusPedidoAdmin,
  aprovadoEm: string | null,
  enviadoEm: string | null,
  finalizadoEm: string | null,
  extra?: AdminPedidoEvento[],
): AdminPedidoEvento[] {
  const base: AdminPedidoEvento[] = [
    {
      id: `${codigo}-evt-1`,
      tipo: 'pedido_criado',
      mensagem: `Pedido ${codigo} criado após arremate do leilão.`,
      criadoEm: formatarData(criadoEm),
    },
  ];

  if (aprovadoEm) {
    base.push({
      id: `${codigo}-evt-2`,
      tipo: 'pagamento_aprovado',
      mensagem: `Pagamento aprovado em ${formatarData(aprovadoEm)}.`,
      criadoEm: formatarData(aprovadoEm),
    });
  } else if (status === 'pendente_pagamento') {
    base.push({
      id: `${codigo}-evt-2`,
      tipo: 'pagamento_pendente',
      mensagem: 'Aguardando confirmação do gateway de pagamento.',
      criadoEm: formatarData(criadoEm),
    });
  }

  if (enviadoEm) {
    base.push({
      id: `${codigo}-evt-3`,
      tipo: 'envio_postado',
      mensagem: `Etiqueta gerada e item postado em ${formatarData(enviadoEm)}.`,
      criadoEm: formatarData(enviadoEm),
    });
  } else if (status === 'pago') {
    base.push({
      id: `${codigo}-evt-3`,
      tipo: 'envio_pendente',
      mensagem: 'Pagamento confirmado — aguardando postagem do vendedor.',
      criadoEm: aprovadoEm ? formatarData(aprovadoEm) : formatarData(criadoEm),
    });
  }

  if (finalizadoEm) {
    base.push({
      id: `${codigo}-evt-4`,
      tipo: 'pedido_finalizado',
      mensagem: `Entrega confirmada e pedido encerrado em ${formatarData(finalizadoEm)}.`,
      criadoEm: formatarData(finalizadoEm),
    });
  }

  if (status === 'em_disputa') {
    base.push({
      id: `${codigo}-evt-disputa`,
      tipo: 'disputa_aberta',
      mensagem: 'Comprador abriu disputa — pagamento retido em custódia.',
      criadoEm: formatarData(new Date(Date.now() - 3600_000 * 6).toISOString()),
    });
  }

  return [...base, ...(extra ?? [])];
}

const MOCK_PEDIDOS: AdminPedidoDetalhe[] = [
  {
    id: 'ord-45821',
    codigo: '#LC-45821',
    leilaoId: 'l-rolex-01',
    tituloLeilao: 'Rolex Submariner',
    imagemLeilao:
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-john',
      nome: 'John D.',
      email: 'john.d@email.com',
      telefone: '5511987654321',
      cpf: '123.456.789-00',
    },
    vendedor: {
      id: 'v-luxury',
      nome: 'Luxury Watches BR',
      email: 'contato@luxurywatches.com.br',
      telefone: '5511998877665',
    },
    valorCents: 2850000,
    itemCents: 2850000,
    freteCents: 0,
    comissaoCents: 285000,
    status: 'finalizado',
    criadoEm: '2025-05-28T17:35:00.000Z',
    atualizadoEm: '2025-06-02T19:20:00.000Z',
    codigoRastreio: 'BR123456789BR',
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-9F2A88C1',
      aprovadoEm: '2025-05-28T17:42:00.000Z',
      comprovanteUrl: 'https://example.com/comprovantes/txn-9f2a88c1.pdf',
      gateway: 'Mercado Pago',
    },
    timeline: timelineFromStatus(
      '2025-05-28T17:35:00.000Z',
      'finalizado',
      '2025-05-28T17:42:00.000Z',
      '2025-05-29T12:10:00.000Z',
      '2025-06-02T19:20:00.000Z',
    ),
    eventos: eventosBase(
      '#LC-45821',
      '2025-05-28T17:35:00.000Z',
      'finalizado',
      '2025-05-28T17:42:00.000Z',
      '2025-05-29T12:10:00.000Z',
      '2025-06-02T19:20:00.000Z',
    ),
  },
  {
    id: 'ord-45820',
    codigo: '#LC-45820',
    leilaoId: 'l-porsche-02',
    tituloLeilao: 'Porsche 911 Turbo S',
    imagemLeilao:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-maria',
      nome: 'Maria L.',
      email: 'maria.l@email.com',
      telefone: '5521998761122',
      cpf: '987.654.321-00',
    },
    vendedor: {
      id: 'v-garage',
      nome: 'Garage Premium',
      email: 'vendas@garagepremium.com.br',
      telefone: '5521987654321',
    },
    valorCents: 18500000,
    itemCents: 18500000,
    freteCents: 0,
    comissaoCents: 1850000,
    status: 'pendente_pagamento',
    criadoEm: '2025-05-28T16:12:00.000Z',
    atualizadoEm: '2025-05-28T16:12:00.000Z',
    codigoRastreio: null,
    pagamento: {
      metodo: 'boleto',
      transacaoId: 'TXN-7B3D19E0',
      aprovadoEm: null,
      comprovanteUrl: null,
      gateway: 'PagSeguro',
    },
    timeline: timelineFromStatus(
      '2025-05-28T16:12:00.000Z',
      'pendente_pagamento',
      null,
      null,
      null,
    ),
    eventos: eventosBase(
      '#LC-45820',
      '2025-05-28T16:12:00.000Z',
      'pendente_pagamento',
      null,
      null,
      null,
    ),
  },
  {
    id: 'ord-45819',
    codigo: '#LC-45819',
    leilaoId: 'l-macbook-03',
    tituloLeilao: 'MacBook Pro M3 Max',
    imagemLeilao:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-carlos',
      nome: 'Carlos R.',
      email: 'carlos.r@email.com',
      telefone: '5531976548899',
      cpf: '456.789.123-00',
    },
    vendedor: {
      id: 'v-tech',
      nome: 'Tech Store BR',
      email: 'loja@techstore.com.br',
      telefone: '5511981122334',
    },
    valorCents: 2499000,
    itemCents: 2499000,
    freteCents: 0,
    comissaoCents: 249900,
    status: 'em_envio',
    criadoEm: '2025-05-28T14:48:00.000Z',
    atualizadoEm: '2025-05-28T21:30:00.000Z',
    codigoRastreio: 'BR998877665BR',
    pagamento: {
      metodo: 'cartao',
      transacaoId: 'TXN-4C8E22A9',
      aprovadoEm: '2025-05-28T14:51:00.000Z',
      comprovanteUrl: 'https://example.com/comprovantes/txn-4c8e22a9.pdf',
      gateway: 'Stripe',
    },
    timeline: timelineFromStatus(
      '2025-05-28T14:48:00.000Z',
      'em_envio',
      '2025-05-28T14:51:00.000Z',
      '2025-05-28T21:30:00.000Z',
      null,
    ),
    eventos: eventosBase(
      '#LC-45819',
      '2025-05-28T14:48:00.000Z',
      'em_envio',
      '2025-05-28T14:51:00.000Z',
      '2025-05-28T21:30:00.000Z',
      null,
    ),
  },
  {
    id: 'ord-45818',
    codigo: '#LC-45818',
    leilaoId: 'l-jordan-04',
    tituloLeilao: 'Jordan 1 Retro High',
    imagemLeilao:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-ana',
      nome: 'Ana P.',
      email: 'ana.p@email.com',
      telefone: '5541988776655',
      cpf: '321.654.987-00',
    },
    vendedor: {
      id: 'v-sneaker',
      nome: 'Sneaker Hub',
      email: 'suporte@sneakerhub.com.br',
      telefone: '5511976543210',
    },
    valorCents: 189000,
    itemCents: 189000,
    freteCents: 0,
    comissaoCents: 18900,
    status: 'pago',
    criadoEm: '2025-05-28T01:05:00.000Z',
    atualizadoEm: '2025-05-28T01:07:00.000Z',
    codigoRastreio: null,
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-1A9F77D2',
      aprovadoEm: '2025-05-28T01:07:00.000Z',
      comprovanteUrl: 'https://example.com/comprovantes/txn-1a9f77d2.pdf',
      gateway: 'Mercado Pago',
    },
    timeline: timelineFromStatus(
      '2025-05-28T01:05:00.000Z',
      'pago',
      '2025-05-28T01:07:00.000Z',
      null,
      null,
    ),
    eventos: eventosBase(
      '#LC-45818',
      '2025-05-28T01:05:00.000Z',
      'pago',
      '2025-05-28T01:07:00.000Z',
      null,
      null,
    ),
  },
  {
    id: 'ord-45817',
    codigo: '#LC-45817',
    leilaoId: 'l-guitar-05',
    tituloLeilao: 'Kit Guitarra Fender',
    imagemLeilao:
      'https://images.unsplash.com/photo-1516924960028-331b3b58ea5a?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-pedro',
      nome: 'Pedro M.',
      email: 'pedro.m@email.com',
      telefone: '5551991234567',
      cpf: '654.321.789-00',
    },
    vendedor: {
      id: 'v-music',
      nome: 'Music Gear',
      email: 'contato@musicgear.com.br',
      telefone: '5541987654321',
    },
    valorCents: 875000,
    itemCents: 875000,
    freteCents: 0,
    comissaoCents: 87500,
    status: 'pendente_pagamento',
    criadoEm: '2025-05-27T22:30:00.000Z',
    atualizadoEm: '2025-05-27T22:30:00.000Z',
    codigoRastreio: null,
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-6D2C11B8',
      aprovadoEm: null,
      comprovanteUrl: null,
      gateway: 'Mercado Pago',
    },
    timeline: timelineFromStatus(
      '2025-05-27T22:30:00.000Z',
      'pendente_pagamento',
      null,
      null,
      null,
    ),
    eventos: eventosBase(
      '#LC-45817',
      '2025-05-27T22:30:00.000Z',
      'pendente_pagamento',
      null,
      null,
      null,
    ),
  },
  {
    id: 'ord-45816',
    codigo: '#LC-45816',
    leilaoId: 'l-camera-06',
    tituloLeilao: 'Sony A7 IV + Lente 24-70',
    imagemLeilao:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=120&h=120&fit=crop',
    comprador: {
      id: 'u-lucas',
      nome: 'Lucas F.',
      email: 'lucas.f@email.com',
      telefone: '5531988776655',
      cpf: '111.222.333-44',
    },
    vendedor: {
      id: 'v-foto',
      nome: 'Foto Pro Equipamentos',
      email: 'vendas@fotopro.com.br',
      telefone: '5511995544332',
    },
    valorCents: 1420000,
    itemCents: 1420000,
    freteCents: 0,
    comissaoCents: 142000,
    status: 'em_disputa',
    criadoEm: '2025-05-26T15:20:00.000Z',
    atualizadoEm: '2025-05-27T10:00:00.000Z',
    codigoRastreio: 'BR445566778BR',
    pagamento: {
      metodo: 'pix',
      transacaoId: 'TXN-3E7A55C0',
      aprovadoEm: '2025-05-26T15:25:00.000Z',
      comprovanteUrl: 'https://example.com/comprovantes/txn-3e7a55c0.pdf',
      gateway: 'Mercado Pago',
    },
    timeline: timelineFromStatus(
      '2025-05-26T15:20:00.000Z',
      'em_disputa',
      '2025-05-26T15:25:00.000Z',
      '2025-05-27T08:00:00.000Z',
      null,
    ),
    eventos: eventosBase(
      '#LC-45816',
      '2025-05-26T15:20:00.000Z',
      'em_disputa',
      '2025-05-26T15:25:00.000Z',
      '2025-05-27T08:00:00.000Z',
      null,
    ),
  },
];

export const PEDIDOS_ADMIN_MOCK: AdminPedidoDetalhe[] = MOCK_PEDIDOS;

export function filtrarPedidosMock(
  pedidos: AdminPedidoDetalhe[],
  query: string,
  categoria: FiltroPedidoAdmin,
): AdminPedidoResumo[] {
  const termo = query.trim().toLowerCase();
  const digits = termo.replace(/\D/g, '');

  return pedidos
    .filter((p) => {
      const pendencia = resolverPendenciaPedidoAdmin({
        orderStatus: p.status,
        trackingCode: p.codigoRastreio,
      });
      if (categoria === 'pagamento_pendente' && !pendenciaEhPagamento(pendencia)) return false;
      if (categoria === 'entrega_pendente' && !pendenciaEhEntrega(pendencia)) return false;
      if (categoria === 'disputas' && !['em_disputa', 'estornado'].includes(p.status)) return false;
      if (categoria === 'pagamentos_pendentes' && p.status !== 'pendente_pagamento') return false;
      if (categoria === 'em_envio' && !['em_envio', 'pago'].includes(p.status)) return false;

      if (!termo) return true;

      const cpfDigits = (p.comprador.cpf ?? '').replace(/\D/g, '');
      return (
        p.codigo.toLowerCase().includes(termo) ||
        p.comprador.nome.toLowerCase().includes(termo) ||
        (digits.length >= 3 && cpfDigits.includes(digits))
      );
    })
    .map(({ eventos: _e, timeline: _t, pagamento: _p, codigoRastreio, ...resumo }) => ({
      ...resumo,
      trackingCode: codigoRastreio,
      pendencia: resolverPendenciaPedidoAdmin({
        orderStatus: resumo.status,
        trackingCode: codigoRastreio,
      }),
    }));
}

export function obterPedidoMock(idOuCodigo: string): AdminPedidoDetalhe | null {
  const chave = decodeURIComponent(idOuCodigo).toLowerCase();
  return (
    MOCK_PEDIDOS.find(
      (p) =>
        p.id.toLowerCase() === chave ||
        p.codigo.toLowerCase() === chave ||
        p.codigo.toLowerCase() === `#${chave.replace('#', '')}`,
    ) ?? null
  );
}

export function toResumo(p: AdminPedidoDetalhe): AdminPedidoResumo {
  const { eventos: _e, timeline: _t, pagamento: _p, itemCents: _i, freteCents: _f, comissaoCents: _c, codigoRastreio: _r, ...resumo } = p;
  return resumo;
}

export { formatarData as formatarDataPedidoAdmin };
