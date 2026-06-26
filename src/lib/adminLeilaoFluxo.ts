import type { AdminLeilaoStatus, AdminPedidoEtapa, StatusPedidoAdmin } from '@/src/admin/types';
import { STATUS_PEDIDO_LABEL } from '@/src/admin/types';

export type PendenciaResponsavel = 'admin' | 'comprador' | 'vendedor' | 'plataforma' | 'nenhum';
export type PendenciaSeveridade = 'ok' | 'info' | 'aviso' | 'critico';

export type AdminLeilaoPendencia = {
  codigo: string;
  label: string;
  descricao: string;
  responsavel: PendenciaResponsavel;
  severidade: PendenciaSeveridade;
  acaoSugerida: string;
};

export type AdminLeilaoFluxoInput = {
  status: AdminLeilaoStatus;
  criadoEm?: string | null;
  encerraEm?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  orderStatus?: StatusPedidoAdmin | null;
  trackingCode?: string | null;
  winnerName?: string | null;
  winnerBidCents?: number | null;
  bidCount?: number;
};

export function resolverPendenciaLeilaoAdmin(input: AdminLeilaoFluxoInput): AdminLeilaoPendencia {
  const bids = input.bidCount ?? 0;
  const hasWinner = Boolean(input.winnerName && (input.winnerBidCents ?? 0) > 0);
  const orderStatus = input.orderStatus;

  if (input.status === 'em_analise') {
    return {
      codigo: 'aguardando_aprovacao',
      label: 'Aguardando aprovação',
      descricao: 'Anúncio publicado pelo vendedor aguarda moderação.',
      responsavel: 'admin',
      severidade: 'aviso',
      acaoSugerida: 'Aprovar ou rejeitar no painel.',
    };
  }

  if (input.status === 'rejeitado') {
    return {
      codigo: 'rejeitado',
      label: 'Rejeitado',
      descricao: 'Anúncio cancelado na moderação.',
      responsavel: 'nenhum',
      severidade: 'ok',
      acaoSugerida: 'Nenhuma ação necessária.',
    };
  }

  if (input.status === 'pausado') {
    return {
      codigo: 'pausado',
      label: 'Leilão pausado',
      descricao: 'Leilão temporariamente suspenso.',
      responsavel: 'plataforma',
      severidade: 'info',
      acaoSugerida: 'Retomar quando apropriado.',
    };
  }

  if (orderStatus === 'em_disputa') {
    return {
      codigo: 'disputa_aberta',
      label: 'Disputa aberta',
      descricao: 'Comprador ou vendedor abriu mediação.',
      responsavel: 'plataforma',
      severidade: 'critico',
      acaoSugerida: 'Acompanhar em Pedidos e intervir se necessário.',
    };
  }

  if (orderStatus === 'estornado') {
    return {
      codigo: 'estornado',
      label: 'Pedido estornado',
      descricao: 'Pagamento devolvido ou cancelado.',
      responsavel: 'nenhum',
      severidade: 'info',
      acaoSugerida: 'Arquivar e comunicar partes se necessário.',
    };
  }

  if (orderStatus === 'finalizado') {
    return {
      codigo: 'finalizado',
      label: 'Concluído',
      descricao: 'Entrega confirmada e pedido encerrado.',
      responsavel: 'nenhum',
      severidade: 'ok',
      acaoSugerida: 'Nenhuma pendência.',
    };
  }

  if (orderStatus === 'aguardando_confirmacao') {
    return {
      codigo: 'aguardando_confirmacao',
      label: 'Aguardando confirmação',
      descricao: 'Item entregue — comprador deve confirmar ou disputar.',
      responsavel: 'comprador',
      severidade: 'aviso',
      acaoSugerida: 'Monitorar prazo de 48h para auto-liberação.',
    };
  }

  if (orderStatus === 'em_envio') {
    return {
      codigo: 'em_transito',
      label: 'Em trânsito',
      descricao: input.trackingCode
        ? `Rastreio: ${input.trackingCode}`
        : 'Envio postado, aguardando entrega.',
      responsavel: 'vendedor',
      severidade: 'info',
      acaoSugerida: 'Acompanhar rastreio até confirmação do comprador.',
    };
  }

  if (orderStatus === 'pago') {
    return {
      codigo: 'aguardando_envio',
      label: 'Aguardando envio',
      descricao: 'Pagamento em custódia — vendedor deve gerar etiqueta e postar.',
      responsavel: 'vendedor',
      severidade: 'aviso',
      acaoSugerida: 'Cobrar postagem no prazo (72h úteis).',
    };
  }

  if (orderStatus === 'pendente_pagamento') {
    return {
      codigo: 'pagamento_pendente',
      label: 'Pagamento pendente',
      descricao: 'Pedido criado, aguardando confirmação financeira.',
      responsavel: 'comprador',
      severidade: 'aviso',
      acaoSugerida: 'Comprador deve concluir checkout no app.',
    };
  }

  if (input.status === 'encerrado') {
    if (!hasWinner || bids === 0) {
      return {
        codigo: 'encerrado_sem_lances',
        label: 'Encerrado sem lances',
        descricao: 'Leilão terminou sem arrematante.',
        responsavel: 'nenhum',
        severidade: 'info',
        acaoSugerida: 'Informar vendedor ou republicar.',
      };
    }

    return {
      codigo: 'aguardando_pagamento_vencedor',
      label: 'Aguardando pagamento',
      descricao: `Vencedor: ${input.winnerName}. Ainda não há pedido pago.`,
      responsavel: 'comprador',
      severidade: 'aviso',
      acaoSugerida: 'Vencedor deve ir ao checkout e pagar no app.',
    };
  }

  if (input.status === 'ao_vivo') {
    const endsMs = input.encerraEm ? new Date(input.encerraEm).getTime() : null;
    const endingSoon = endsMs != null && endsMs - Date.now() < 15 * 60_000;

    return {
      codigo: 'ao_vivo',
      label: endingSoon ? 'Encerrando em breve' : 'Ao vivo',
      descricao: endingSoon
        ? 'Cronômetro próximo do fim — monitore lances.'
        : 'Leilão ativo recebendo lances.',
      responsavel: 'nenhum',
      severidade: endingSoon ? 'aviso' : 'info',
      acaoSugerida: endingSoon ? 'Acompanhar encerramento.' : 'Nenhuma ação imediata.',
    };
  }

  return {
    codigo: 'indefinido',
    label: 'Sem pendência',
    descricao: 'Estado operacional normal.',
    responsavel: 'nenhum',
    severidade: 'ok',
    acaoSugerida: 'Nenhuma ação necessária.',
  };
}

export function pendenciaRequerAtencao(p: AdminLeilaoPendencia): boolean {
  return p.severidade === 'aviso' || p.severidade === 'critico';
}

const PENDENCIA_PAGAMENTO = new Set([
  'aguardando_pagamento_vencedor',
  'pagamento_pendente',
]);

const PENDENCIA_ENTREGA = new Set([
  'aguardando_envio',
  'em_transito',
  'aguardando_confirmacao',
  'disputa_aberta',
]);

export function pendenciaEhPagamento(p: AdminLeilaoPendencia): boolean {
  return PENDENCIA_PAGAMENTO.has(p.codigo);
}

export function pendenciaEhEntrega(p: AdminLeilaoPendencia): boolean {
  return PENDENCIA_ENTREGA.has(p.codigo);
}

export function pendenciaEhConcluido(p: AdminLeilaoPendencia): boolean {
  return p.codigo === 'finalizado';
}

/** Pagamento ou entrega ainda em aberto (tela Arrematados). */
export function pendenciaEhArrematePendente(p: AdminLeilaoPendencia): boolean {
  return pendenciaEhPagamento(p) || pendenciaEhEntrega(p);
}

export type AdminPedidoFluxoInput = {
  orderStatus: StatusPedidoAdmin | null;
  trackingCode?: string | null;
};

/** Pendência operacional a partir do status do pedido (Pedidos / Arrematados). */
export function resolverPendenciaPedidoAdmin(input: AdminPedidoFluxoInput): AdminLeilaoPendencia {
  if (!input.orderStatus) {
    return {
      codigo: 'aguardando_pagamento_vencedor',
      label: 'Aguardando pagamento',
      descricao: 'Lote arrematado — pedido ainda não pago.',
      responsavel: 'comprador',
      severidade: 'aviso',
      acaoSugerida: 'Vencedor deve concluir checkout e pagar no app.',
    };
  }

  return resolverPendenciaLeilaoAdmin({
    status: 'encerrado',
    orderStatus: input.orderStatus,
    trackingCode: input.trackingCode,
    winnerName: 'vencedor',
    winnerBidCents: 1,
    bidCount: 1,
  });
}

function formatarDataIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function montarTimelineLeilaoAdmin(
  input: AdminLeilaoFluxoInput,
  pendencia: AdminLeilaoPendencia,
): AdminPedidoEtapa[] {
  const orderStatus = input.orderStatus;
  const pago =
    orderStatus &&
    !['pendente_pagamento', 'estornado'].includes(orderStatus);
  const enviado =
    orderStatus &&
    ['em_envio', 'aguardando_confirmacao', 'finalizado'].includes(orderStatus);
  const finalizado = orderStatus === 'finalizado';
  const encerrado = input.status === 'encerrado' || finalizado;
  const temPedido = Boolean(input.orderId);
  const temVencedor = Boolean(input.winnerName && (input.bidCount ?? 0) > 0);

  const etapas: AdminPedidoEtapa[] = [];

  if (input.status === 'em_analise') {
    etapas.push({
      id: 'moderacao',
      titulo: 'Moderação',
      descricao: 'Anúncio na fila de análise do admin',
      data: formatarDataIso(input.criadoEm),
      concluida: false,
      atual: true,
    });
    return etapas;
  }

  etapas.push({
    id: 'publicado',
    titulo: 'Publicado',
    descricao: 'Leilão aprovado e visível no app',
    data: null,
    concluida: input.status !== 'em_analise',
    atual: input.status === 'ao_vivo',
  });

  etapas.push({
    id: 'ao_vivo',
    titulo: 'Leilão ao vivo',
    descricao:
      input.status === 'ao_vivo'
        ? `Encerra em ${formatarDataIso(input.encerraEm) ?? '—'}`
        : 'Período de lances encerrado',
    data: formatarDataIso(input.encerraEm),
    concluida: encerrado || temPedido,
    atual: input.status === 'ao_vivo',
  });

  etapas.push({
    id: 'arremate',
    titulo: temVencedor ? 'Arrematado' : 'Arremate',
    descricao: temVencedor
      ? `Vencedor: ${input.winnerName}`
      : encerrado
        ? 'Sem lances válidos'
        : 'Aguardando fim do leilão',
    data: encerrado ? formatarDataIso(input.encerraEm) : null,
    concluida: encerrado && temVencedor,
    atual: pendencia.codigo === 'aguardando_pagamento_vencedor',
  });

  etapas.push({
    id: 'pagamento',
    titulo: orderStatus ? STATUS_PEDIDO_LABEL[orderStatus] : 'Pagamento',
    descricao:
      orderStatus === 'pendente_pagamento'
        ? 'Checkout iniciado — aguardando pagamento'
        : pago
          ? 'Valor retido em custódia Levou'
          : pendencia.codigo === 'aguardando_pagamento_vencedor'
            ? 'Vencedor ainda não pagou'
            : 'Aguardando arremate',
    data: null,
    concluida: Boolean(pago),
    atual:
      pendencia.codigo === 'pagamento_pendente' ||
      pendencia.codigo === 'aguardando_pagamento_vencedor',
  });

  etapas.push({
    id: 'envio',
    titulo: 'Envio',
    descricao: input.trackingCode
      ? `Rastreio: ${input.trackingCode}`
      : 'Vendedor gera etiqueta e posta o item',
    data: null,
    concluida: Boolean(enviado),
    atual: pendencia.codigo === 'aguardando_envio' || pendencia.codigo === 'em_transito',
  });

  etapas.push({
    id: 'entrega',
    titulo: 'Entrega confirmada',
    descricao: 'Comprador confirma recebimento ou abre disputa',
    data: null,
    concluida: finalizado,
    atual: pendencia.codigo === 'aguardando_confirmacao',
  });

  if (pendencia.codigo === 'disputa_aberta') {
    etapas.push({
      id: 'disputa',
      titulo: 'Disputa',
      descricao: 'Mediação da plataforma em andamento',
      data: null,
      concluida: false,
      atual: true,
    });
  }

  return etapas;
}

export function responsavelLabel(r: PendenciaResponsavel): string {
  switch (r) {
    case 'admin':
      return 'Admin';
    case 'comprador':
      return 'Comprador';
    case 'vendedor':
      return 'Vendedor';
    case 'plataforma':
      return 'Plataforma';
    default:
      return '—';
  }
}
