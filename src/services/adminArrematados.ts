import { ARREMATADOS_INICIAIS, LEILOES_INICIAIS } from '@/src/admin/mockData';
import { formatarDataPedidoAdmin } from '@/src/admin/pedidosMock';
import type {
  AdminLoteArrematado,
  AlertaAdmArrematado,
  FluxoArrematadoStatus,
  StatusPedidoAdmin,
} from '@/src/admin/types';
import { resolverPendenciaPedidoAdmin } from '@/src/lib/adminLeilaoFluxo';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { formatBRL } from '@/src/lib/bids';
import { resolverVendorId } from '@/src/services/adminVendedor';
import { normalizarHandle, resolverCompradorId } from '@/src/services/adminComprador';

export type AdminLoteArrematadoLinha = {
  id: string;
  loteId: string;
  titulo: string;
  imagemUrl: string;
  ganhador: string;
  compradorId: string;
  vendedor: string;
  vendedorId: string;
  valorFinalCents: number;
  valorFinalLabel: string;
  fluxoLabel: string;
  alertaAdm: AlertaAdmArrematado | null;
  orderStatus?: StatusPedidoAdmin | null;
  trackingCode?: string | null;
  pendencia?: ReturnType<typeof resolverPendenciaPedidoAdmin>;
};

export type AdminLanceHistorico = {
  id: string;
  licitante: string;
  valorCents: number;
  valorLabel: string;
  createdAt: string;
  vencedor: boolean;
};

export type AdminLoteArrematadoDetalhe = AdminLoteArrematado & {
  pedidoId: string;
  pedidoCodigo?: string | null;
  vendedorId: string;
  valorFinalCents: number;
  lances: AdminLanceHistorico[];
  descricao?: string;
  eventos?: { id: string; tipo: string; mensagem: string; criadoEm: string }[];
};

function fluxoParaOrderStatus(fluxo: FluxoArrematadoStatus): StatusPedidoAdmin | null {
  switch (fluxo) {
    case 'aguardando_pagamento':
      return 'pendente_pagamento';
    case 'pago_aguardando_envio':
    case 'atrasado':
      return 'pago';
    case 'enviado':
      return 'em_envio';
    case 'entregue':
      return 'finalizado';
    default:
      return null;
  }
}

function enrichLinha(
  base: Omit<AdminLoteArrematadoLinha, 'pendencia'> & { orderStatus?: StatusPedidoAdmin | null },
): AdminLoteArrematadoLinha {
  const orderStatus = base.orderStatus ?? null;
  return {
    ...base,
    pendencia: resolverPendenciaPedidoAdmin({
      orderStatus,
      trackingCode: base.trackingCode,
    }),
  };
}

function parseFtkParaCentavos(valor: string): number {
  const numeros = valor.replace(/[^\d,]/g, '').replace(',', '.');
  const valorNum = parseFloat(numeros);
  return Number.isFinite(valorNum) ? Math.round(valorNum * 100) : 0;
}

function mapMock(lote: AdminLoteArrematado): AdminLoteArrematadoLinha {
  const orderStatus = lote.orderStatus ?? fluxoParaOrderStatus(lote.fluxoStatus);
  return enrichLinha({
    id: lote.id,
    loteId: lote.loteId,
    titulo: lote.titulo,
    imagemUrl: lote.imagemUrl,
    ganhador: lote.comprador,
    compradorId: resolverCompradorId(lote.comprador),
    vendedor: lote.vendedor,
    vendedorId: resolverVendorId(lote.vendedor),
    valorFinalCents: parseFtkParaCentavos(lote.valorFinal),
    valorFinalLabel: lote.valorFinal,
    fluxoLabel: lote.fluxoLabel,
    alertaAdm: lote.alertaAdm,
    orderStatus,
    trackingCode: lote.trackingCode,
  });
}

const LICITANTES_MOCK = [
  '@ana_bids',
  '@carlos_ftk',
  '@renata_l',
  '@joao_leiloes',
  '@bia_compras',
];

function gerarLancesMock(
  lote: AdminLoteArrematado,
  valorFinalCents: number,
): AdminLanceHistorico[] {
  const ganhador = normalizarHandle(lote.comprador);
  const base = Math.max(valorFinalCents - 80000, valorFinalCents * 0.7);
  const steps = 6;
  const lances: AdminLanceHistorico[] = [];

  for (let i = 0; i < steps; i += 1) {
    const isLast = i === steps - 1;
    const valor = isLast
      ? valorFinalCents
      : Math.round(base + ((valorFinalCents - base) * i) / (steps - 1));
    const licitante = isLast ? ganhador : LICITANTES_MOCK[i % LICITANTES_MOCK.length];
    const minsAgo = (steps - i) * 4 + Math.floor(Math.random() * 3);
    lances.push({
      id: `${lote.id}-bid-${i}`,
      licitante,
      valorCents: valor,
      valorLabel: formatBRL(valor),
      createdAt: new Date(Date.now() - minsAgo * 60_000).toISOString(),
      vencedor: isLast,
    });
  }

  return lances.sort((a, b) => b.valorCents - a.valorCents);
}

function montarDetalheMock(pedidoId: string): AdminLoteArrematadoDetalhe | null {
  const lote = ARREMATADOS_INICIAIS.find((l) => l.id === pedidoId);
  if (!lote) return null;

  const leilao = LEILOES_INICIAIS.find((l) => l.id === lote.loteId);
  const valorFinalCents = parseFtkParaCentavos(lote.valorFinal);

  const orderStatus = lote.orderStatus ?? fluxoParaOrderStatus(lote.fluxoStatus);
  return {
    ...lote,
    pedidoId: lote.id,
    vendedorId: resolverVendorId(lote.vendedor),
    valorFinalCents,
    lances: gerarLancesMock(lote, valorFinalCents),
    descricao: leilao?.descricao,
    orderStatus,
    pendencia: resolverPendenciaPedidoAdmin({
      orderStatus,
      trackingCode: lote.trackingCode,
    }),
  };
}

export async function obterDetalheLoteArrematado(
  pedidoId: string,
): Promise<AdminLoteArrematadoDetalhe | null> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return montarDetalheMock(pedidoId);
  }

  const supabase = getSupabase();
  if (!supabase) return montarDetalheMock(pedidoId);

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      code,
      item_cents,
      status,
      tracking_code,
      shipped_at,
      finalized_at,
      created_at,
      auction:auctions!auction_id(id, title, image_urls, description, current_price_cents),
      buyer:users!buyer_id(id, display_name, nome_completo, email),
      vendor:users!vendor_id(id, display_name, nome_completo, email),
      invoice:auction_invoices(approved_at),
      events:order_events(id, event_type, message, created_at)
    `,
    )
    .eq('id', pedidoId)
    .maybeSingle();

  if (error || !order?.auction) {
    return montarDetalheMock(pedidoId);
  }

  const auction = order.auction as {
    id: string;
    title: string;
    image_urls: string[];
    description?: string;
    current_price_cents: number;
  };
  const buyer = order.buyer as {
    id: string;
    display_name: string | null;
    nome_completo: string | null;
    email: string;
  };
  const vendor = order.vendor as {
    id: string;
    display_name: string | null;
    email: string;
  };

  const compradorHandle = buyer.display_name?.startsWith('@')
    ? buyer.display_name
    : `@${(buyer.display_name ?? buyer.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()}`;

  const vendedorHandle = vendor.display_name?.startsWith('@')
    ? vendor.display_name
    : `@${(vendor.display_name ?? vendor.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()}`;

  const valorFinalCents = (order.item_cents as number) ?? auction.current_price_cents;

  const { data: bids } = await supabase
    .from('bids')
    .select('id, amount_cents, created_at, bidder_id, users:bidder_id(display_name, email)')
    .eq('auction_id', auction.id)
    .order('amount_cents', { ascending: false })
    .limit(30);

  const lances: AdminLanceHistorico[] = (bids ?? []).map((b, index) => {
    const u = b.users as { display_name: string | null; email: string } | null;
    const licitante =
      u?.display_name?.startsWith('@')
        ? u.display_name
        : `@${(u?.display_name ?? u?.email?.split('@')[0] ?? 'licitante').replace(/\s+/g, '_').toLowerCase()}`;
    return {
      id: b.id as string,
      licitante,
      valorCents: b.amount_cents as number,
      valorLabel: formatBRL(b.amount_cents as number),
      createdAt: b.created_at as string,
      vencedor: index === 0,
    };
  });

  const orderStatus = order.status as StatusPedidoAdmin;
  const trackingCode = (order.tracking_code as string | null) ?? null;
  const invoiceRaw = order.invoice as { approved_at: string | null } | { approved_at: string | null }[] | null;
  const invoice = Array.isArray(invoiceRaw) ? invoiceRaw[0] : invoiceRaw;
  const eventos = ((order.events as { id: string; event_type: string; message: string; created_at: string }[]) ?? [])
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((ev) => ({
      id: ev.id,
      tipo: ev.event_type,
      mensagem: ev.message,
      criadoEm: formatarDataPedidoAdmin(ev.created_at),
    }));

  const montarTimeline = (): AdminLoteArrematado['timeline'] => {
    const pagoOk = Boolean(invoice?.approved_at) || !['pendente_pagamento', 'estornado'].includes(orderStatus);
    const envioOk = Boolean(order.shipped_at) || ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(orderStatus);
    const finalOk = orderStatus === 'finalizado';
    return [
      { id: 'arremate', titulo: 'Arrematado', descricao: 'Lote vencido pelo licitante', data: null, concluida: true },
      { id: 'pagamento', titulo: 'Pagamento', descricao: orderStatus === 'pendente_pagamento' ? 'Aguardando confirmação' : 'Pago em custódia', data: null, concluida: pagoOk, atual: orderStatus === 'pendente_pagamento' },
      { id: 'envio', titulo: 'Envio', descricao: trackingCode ? `Rastreio: ${trackingCode}` : 'Vendedor posta o item', data: null, concluida: envioOk && orderStatus !== 'pago', atual: orderStatus === 'pago' },
      { id: 'transito', titulo: 'Em trânsito', descricao: 'Item a caminho do comprador', data: null, concluida: ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(orderStatus), atual: orderStatus === 'em_envio' },
      { id: 'entrega', titulo: 'Entrega', descricao: 'Confirmação do comprador', data: null, concluida: finalOk, atual: orderStatus === 'aguardando_confirmacao' },
    ];
  };

  const pendencia = resolverPendenciaPedidoAdmin({ orderStatus, trackingCode });
  const fluxoLabel = pendencia.label;

  if (lances.length === 0) {
    const stub: AdminLoteArrematado = {
      id: pedidoId,
      loteId: auction.id,
      titulo: auction.title,
      imagemUrl: auction.image_urls?.[0] ?? '',
      galeriaUrls: auction.image_urls ?? [],
      comprador: compradorHandle,
      vendedor: vendedorHandle,
      valorFinal: formatBRL(valorFinalCents),
      taxaPlataforma: formatBRL(Math.round(valorFinalCents * 0.1)),
      valorFrete: '—',
      fluxoStatus: 'aguardando_pagamento',
      fluxoLabel,
      alertaAdm: null,
      timeline: montarTimeline(),
      orderStatus,
      trackingCode,
      pendencia,
    };
    return {
      ...stub,
      pedidoId,
      pedidoCodigo: (order.code as string) ?? null,
      vendedorId: vendor.id,
      valorFinalCents,
      lances: gerarLancesMock(stub, valorFinalCents),
      descricao: auction.description,
      eventos,
    };
  }

  return {
    id: pedidoId,
    loteId: auction.id,
    titulo: auction.title,
    imagemUrl: auction.image_urls?.[0] ?? '',
    galeriaUrls: auction.image_urls ?? [],
    comprador: compradorHandle,
    vendedor: vendedorHandle,
    valorFinal: formatBRL(valorFinalCents),
    taxaPlataforma: formatBRL(Math.round(valorFinalCents * 0.1)),
    valorFrete: '—',
    fluxoStatus: 'aguardando_pagamento',
    fluxoLabel,
    alertaAdm: null,
    timeline: montarTimeline(),
    orderStatus,
    trackingCode,
    pendencia,
    pedidoId,
    pedidoCodigo: (order.code as string) ?? null,
    vendedorId: vendor.id,
    valorFinalCents,
    lances,
    descricao: auction.description,
    eventos,
  };
}

export async function listarLotesArrematados(): Promise<AdminLoteArrematadoLinha[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return ARREMATADOS_INICIAIS.map(mapMock);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return ARREMATADOS_INICIAIS.map(mapMock);
  }

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      item_cents,
      status,
      tracking_code,
      auction:auctions!auction_id(
        id,
        title,
        image_urls,
        current_price_cents,
        status,
        ends_at
      ),
      buyer:users!buyer_id(id, display_name, nome_completo, email),
      vendor:users!vendor_id(id, display_name, nome_completo, email)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data?.length) {
    return ARREMATADOS_INICIAIS.map(mapMock);
  }

  return data
    .filter((row) => row.auction)
    .map((row) => {
      const auction = row.auction as {
        id: string;
        title: string;
        image_urls: string[];
        current_price_cents: number;
      };
      const buyer = row.buyer as {
        id: string;
        display_name: string | null;
        nome_completo: string | null;
        email: string;
      };
      const vendor = row.vendor as {
        id: string;
        display_name: string | null;
        nome_completo: string | null;
        email: string;
      };

      const ganhadorDisplay =
        buyer.display_name?.startsWith('@')
          ? buyer.display_name
          : buyer.nome_completo ??
            buyer.display_name ??
            `@${buyer.email.split('@')[0].replace(/\./g, '_')}`;

      const vendedorHandle = vendor.display_name?.startsWith('@')
        ? vendor.display_name
        : `@${(vendor.display_name ?? vendor.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()}`;

      const orderStatus = row.status as StatusPedidoAdmin;
      const trackingCode = (row.tracking_code as string | null) ?? null;
      const pendencia = resolverPendenciaPedidoAdmin({ orderStatus, trackingCode });

      return enrichLinha({
        id: row.id as string,
        loteId: auction.id,
        titulo: auction.title,
        imagemUrl: auction.image_urls?.[0] ?? '',
        ganhador: ganhadorDisplay,
        compradorId: buyer.id,
        vendedor: vendedorHandle,
        vendedorId: vendor.id,
        valorFinalCents: (row.item_cents as number) ?? auction.current_price_cents,
        valorFinalLabel: formatBRL((row.item_cents as number) ?? auction.current_price_cents),
        fluxoLabel: pendencia.label,
        alertaAdm: null,
        orderStatus,
        trackingCode,
      });
    });
}
