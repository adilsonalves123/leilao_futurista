import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  filtrarPedidosMock,
  obterPedidoMock,
  PEDIDOS_ADMIN_MOCK,
  formatarDataPedidoAdmin,
} from '@/src/admin/pedidosMock';
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
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const ADMIN_PEDIDOS_MOCK_KEY = '@aetherion/admin_pedidos';

type SearchRow = {
  id: string;
  code: string;
  auction_id: string;
  auction_title: string;
  auction_image: string;
  buyer_id: string;
  buyer_nome: string;
  buyer_email: string;
  buyer_cpf: string | null;
  buyer_telefone: string | null;
  vendor_id: string;
  vendor_nome: string;
  vendor_email: string;
  vendor_telefone: string | null;
  item_cents: number;
  shipping_cents: number;
  commission_cents: number;
  total_cents: number;
  status: StatusPedidoAdmin;
  tracking_code: string | null;
  created_at: string;
  updated_at: string;
};

function enrichPedidoResumo(base: Omit<AdminPedidoResumo, 'pendencia'>): AdminPedidoResumo {
  const pendencia = resolverPendenciaPedidoAdmin({
    orderStatus: base.status,
    trackingCode: base.trackingCode,
  });
  return { ...base, pendencia };
}

function mapResumo(row: SearchRow): AdminPedidoResumo {
  return enrichPedidoResumo({
    id: row.id,
    codigo: row.code,
    leilaoId: row.auction_id,
    tituloLeilao: row.auction_title,
    imagemLeilao: row.auction_image,
    comprador: {
      id: row.buyer_id,
      nome: row.buyer_nome,
      email: row.buyer_email,
      telefone: row.buyer_telefone,
      cpf: row.buyer_cpf,
    },
    vendedor: {
      id: row.vendor_id,
      nome: row.vendor_nome,
      email: row.vendor_email,
      telefone: row.vendor_telefone,
    },
    valorCents: row.total_cents,
    status: row.status,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
    trackingCode: row.tracking_code,
  });
}

function timelineFromDb(
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
      data: formatarDataPedidoAdmin(criadoEm),
      concluida: true,
    },
    {
      id: 'pagamento',
      titulo: emDisputa ? 'Disputa aberta' : pendentePagamento ? 'Pagamento pendente' : 'Pago',
      descricao: emDisputa
        ? 'Mediação em andamento — pagamento retido'
        : pendentePagamento
          ? 'Aguardando confirmação financeira'
          : 'Pagamento confirmado pela plataforma',
      data: aprovadoEm ? formatarDataPedidoAdmin(aprovadoEm) : null,
      concluida: pagoOk && !emDisputa,
      atual: pendentePagamento || emDisputa,
    },
    {
      id: 'envio',
      titulo: 'Aguardando envio',
      descricao: 'Vendedor prepara postagem do item',
      data: enviadoEm ? formatarDataPedidoAdmin(enviadoEm) : null,
      concluida: envioOk && status !== 'pago',
      atual: pagoOk && !envioOk && !finalOk && !emDisputa,
    },
    {
      id: 'transito',
      titulo: 'Em trânsito',
      descricao: 'Item postado e a caminho do comprador',
      data: enviadoEm ? formatarDataPedidoAdmin(enviadoEm) : null,
      concluida: ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(status),
      atual: status === 'em_envio',
    },
    {
      id: 'finalizado',
      titulo: 'Finalizado',
      descricao: 'Entrega confirmada e pedido encerrado',
      data: finalizadoEm ? formatarDataPedidoAdmin(finalizadoEm) : null,
      concluida: finalOk,
      atual: status === 'aguardando_confirmacao',
    },
  ];
}

function mapEvento(row: {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
}): AdminPedidoEvento {
  return {
    id: row.id,
    tipo: row.event_type,
    mensagem: row.message,
    criadoEm: formatarDataPedidoAdmin(row.created_at),
  };
}

async function usarMock(): Promise<boolean> {
  return isMockMode() || !isSupabaseConfigured();
}

export async function buscarPedidosAdmin(
  query: string,
  categoria: FiltroPedidoAdmin,
): Promise<AdminPedidoResumo[]> {
  if (await usarMock()) {
    return filtrarPedidosMock(PEDIDOS_ADMIN_MOCK, query, categoria);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return filtrarPedidosMock(PEDIDOS_ADMIN_MOCK, query, categoria);
  }

  const rpcCategoria =
    categoria === 'pagamento_pendente' || categoria === 'entrega_pendente' ? 'todos' : categoria;

  const { data, error } = await supabase.rpc('search_admin_orders', {
    p_query: query.trim(),
    p_categoria: rpcCategoria,
    p_limit: 80,
  });

  if (error) {
    const raw = await AsyncStorage.getItem(ADMIN_PEDIDOS_MOCK_KEY);
    const fallback = raw ? (JSON.parse(raw) as AdminPedidoDetalhe[]) : PEDIDOS_ADMIN_MOCK;
    return filtrarPedidosMock(fallback, query, categoria);
  }

  let lista = ((data ?? []) as SearchRow[]).map(mapResumo);

  if (categoria === 'pagamento_pendente') {
    lista = lista.filter((p) => p.pendencia && pendenciaEhPagamento(p.pendencia));
  }
  if (categoria === 'entrega_pendente') {
    lista = lista.filter((p) => p.pendencia && pendenciaEhEntrega(p.pendencia));
  }

  return lista;
}

export async function obterPedidoAdmin(idOuCodigo: string): Promise<AdminPedidoDetalhe | null> {
  if (await usarMock()) {
    const mock = obterPedidoMock(idOuCodigo);
    if (!mock) return null;
    return {
      ...mock,
      trackingCode: mock.codigoRastreio,
      pendencia: resolverPendenciaPedidoAdmin({
        orderStatus: mock.status,
        trackingCode: mock.codigoRastreio,
      }),
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return obterPedidoMock(idOuCodigo);
  }

  const chave = decodeURIComponent(idOuCodigo);
  const isUuid = /^[0-9a-f-]{36}$/i.test(chave);

  let orderQuery = supabase
    .from('orders')
    .select(
      `
      id, code, auction_id, buyer_id, vendor_id,
      item_cents, shipping_cents, commission_cents, total_cents,
      status, tracking_code, shipped_at, delivered_at, finalized_at,
      created_at, updated_at,
      buyer:users!buyer_id(id, email, display_name, nome_completo, cpf, telefone),
      vendor:users!vendor_id(id, email, display_name, nome_completo, telefone),
      auction:auctions!auction_id(id, title, image_urls),
      invoice:auction_invoices(payment_method, gateway_transaction_id, approved_at, receipt_url, gateway, amount_cents),
      events:order_events(id, event_type, message, created_at)
    `,
    )
    .limit(1);

  orderQuery = isUuid ? orderQuery.eq('id', chave) : orderQuery.ilike('code', chave);

  const { data, error } = await orderQuery.maybeSingle();

  if (error || !data) {
    return obterPedidoMock(idOuCodigo);
  }

  const buyer = data.buyer as {
    id: string;
    email: string;
    display_name: string | null;
    nome_completo: string | null;
    cpf: string | null;
    telefone: string | null;
  };
  const vendor = data.vendor as {
    id: string;
    email: string;
    display_name: string | null;
    nome_completo: string | null;
    telefone: string | null;
  };
  const auction = data.auction as { id: string; title: string; image_urls: string[] };
  const invoiceRaw = data.invoice as
    | {
        payment_method: MetodoPagamentoPedido;
        gateway_transaction_id: string | null;
        approved_at: string | null;
        receipt_url: string | null;
        gateway: string;
        amount_cents: number;
      }
    | {
        payment_method: MetodoPagamentoPedido;
        gateway_transaction_id: string | null;
        approved_at: string | null;
        receipt_url: string | null;
        gateway: string;
        amount_cents: number;
      }[]
    | null;
  const invoice = Array.isArray(invoiceRaw) ? invoiceRaw[0] : invoiceRaw;
  const events = (data.events as { id: string; event_type: string; message: string; created_at: string }[]) ?? [];

  const status = data.status as StatusPedidoAdmin;
  const base = {
    id: data.id,
    codigo: data.code,
    leilaoId: auction.id,
    tituloLeilao: auction.title,
    imagemLeilao: auction.image_urls?.[0] ?? '',
    comprador: {
      id: buyer.id,
      nome: buyer.nome_completo ?? buyer.display_name ?? buyer.email,
      email: buyer.email,
      telefone: buyer.telefone,
      cpf: buyer.cpf,
    },
    vendedor: {
      id: vendor.id,
      nome: vendor.nome_completo ?? vendor.display_name ?? vendor.email,
      email: vendor.email,
      telefone: vendor.telefone,
    },
    valorCents: data.total_cents,
    itemCents: data.item_cents,
    freteCents: data.shipping_cents,
    comissaoCents: data.commission_cents,
    status,
    criadoEm: data.created_at,
    atualizadoEm: data.updated_at,
    codigoRastreio: data.tracking_code,
    trackingCode: data.tracking_code,
    pagamento: {
      metodo: invoice?.payment_method ?? 'pix',
      transacaoId: invoice?.gateway_transaction_id ?? null,
      aprovadoEm: invoice?.approved_at ?? null,
      comprovanteUrl: invoice?.receipt_url ?? null,
      gateway: invoice?.gateway ?? 'luckcode',
    },
    timeline: timelineFromDb(
      data.created_at,
      status,
      invoice?.approved_at ?? null,
      data.shipped_at,
      data.finalized_at,
    ),
    eventos: events
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(mapEvento),
  };

  return {
    ...base,
    pendencia: resolverPendenciaPedidoAdmin({
      orderStatus: status,
      trackingCode: data.tracking_code,
    }),
  };
}

export function contarPedidosPorCategoria(pedidos: AdminPedidoResumo[]): Record<FiltroPedidoAdmin, number> {
  return {
    todos: pedidos.length,
    pagamento_pendente: pedidos.filter((p) => p.pendencia && pendenciaEhPagamento(p.pendencia))
      .length,
    entrega_pendente: pedidos.filter((p) => p.pendencia && pendenciaEhEntrega(p.pendencia)).length,
    disputas: pedidos.filter((p) => ['em_disputa', 'estornado'].includes(p.status)).length,
    pagamentos_pendentes: pedidos.filter((p) => p.status === 'pendente_pagamento').length,
    em_envio: pedidos.filter((p) => ['em_envio', 'pago'].includes(p.status)).length,
  };
}

export { resolverPendenciaPedidoAdmin, pendenciaEhPagamento, pendenciaEhEntrega };
