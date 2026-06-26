import type { AdminLeilao } from '@/src/admin/types';

import type { AdminPedidoEvento } from '@/src/admin/types';

import { montarTimelineLeilaoAdmin } from '@/src/lib/adminLeilaoFluxo';

import { formatBRL } from '@/src/lib/bids';

import { AdminOperacionalFluxoPanel } from './AdminOperacionalFluxoPanel';



type Props = {

  leilao: AdminLeilao;

  eventos?: AdminPedidoEvento[];

};



export function AdminLeilaoFluxoPanel({ leilao, eventos = [] }: Props) {

  const pendencia = leilao.pendencia;

  if (!pendencia) return null;



  const timeline = montarTimelineLeilaoAdmin(

    {

      status: leilao.status,

      criadoEm: leilao.criadoEm,

      encerraEm: leilao.encerraEm,

      orderId: leilao.orderId,

      orderCode: leilao.orderCode,

      orderStatus: leilao.orderStatus,

      trackingCode: leilao.trackingCode,

      winnerName: leilao.winnerName,

      winnerBidCents: leilao.winnerBidCents,

      bidCount: leilao.bidCount,

    },

    pendencia,

  );



  return (

    <AdminOperacionalFluxoPanel

      pendencia={pendencia}

      timeline={timeline}

      eventos={eventos}

      pedidoId={leilao.orderId}

      pedidoCodigo={leilao.orderCode}

      vencedor={leilao.winnerName}

      lance={

        (leilao.winnerBidCents ?? 0) > 0 ? formatBRL(leilao.winnerBidCents!) : undefined

      }

      lances={leilao.bidCount}

      rastreio={leilao.trackingCode}

    />

  );

}

