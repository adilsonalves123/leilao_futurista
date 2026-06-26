import { useRouter } from 'expo-router';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AdminPedidoEtapa, AdminPedidoEvento } from '@/src/admin/types';

import type { AdminLeilaoPendencia } from '@/src/lib/adminLeilaoFluxo';

import { responsavelLabel } from '@/src/lib/adminLeilaoFluxo';

import { AdminLeilaoPendenciaBadge } from './AdminLeilaoPendenciaBadge';

import { OrderTimelineVisual } from './OrderTimelineVisual';

import { adminC } from './adminStyles';



type Props = {

  pendencia: AdminLeilaoPendencia;

  timeline: AdminPedidoEtapa[];

  eventos?: AdminPedidoEvento[];

  tituloSecao?: string;

  pedidoId?: string | null;

  pedidoCodigo?: string | null;

  leilaoId?: string | null;

  vencedor?: string | null;

  lance?: string | null;

  lances?: number;

  rastreio?: string | null;

};



export function AdminOperacionalFluxoPanel({

  pendencia,

  timeline,

  eventos = [],

  tituloSecao = 'Pendência operacional',

  pedidoId,

  pedidoCodigo,

  leilaoId,

  vencedor,

  lance,

  lances,

  rastreio,

}: Props) {

  const router = useRouter();



  return (

    <View style={styles.wrap}>

      <Text style={styles.secao}>{tituloSecao}</Text>

      <AdminLeilaoPendenciaBadge pendencia={pendencia} />



      <View style={styles.acaoBox}>

        <Text style={styles.acaoTitulo}>O que fazer agora</Text>

        <Text style={styles.acaoTexto}>{pendencia.acaoSugerida}</Text>

        <Text style={styles.acaoMeta}>

          Responsável:{' '}

          <Text style={styles.acaoMetaDestaque}>{responsavelLabel(pendencia.responsavel)}</Text>

        </Text>

        <Text style={styles.acaoDesc}>{pendencia.descricao}</Text>

      </View>



      {(vencedor || lance || (lances ?? 0) > 0) && (

        <View style={styles.resumoRow}>

          {vencedor ? (

            <Text style={styles.resumoItem}>

              Vencedor: <Text style={styles.resumoDestaque}>{vencedor}</Text>

            </Text>

          ) : null}

          {lance ? (

            <Text style={styles.resumoItem}>

              Lance: <Text style={styles.resumoDestaque}>{lance}</Text>

            </Text>

          ) : null}

          {(lances ?? 0) > 0 ? (

            <Text style={styles.resumoItem}>

              Lances: <Text style={styles.resumoDestaque}>{lances}</Text>

            </Text>

          ) : null}

        </View>

      )}



      {(pedidoId || rastreio) && (

        <View style={styles.pedidoRow}>

          {pedidoId ? (

            <Text style={styles.resumoItem}>

              Pedido:{' '}

              <Text style={styles.resumoDestaque}>

                {pedidoCodigo ?? pedidoId.slice(0, 8)}

              </Text>

            </Text>

          ) : null}

          {rastreio ? (

            <Text style={styles.resumoItem}>

              Rastreio: <Text style={styles.resumoDestaque}>{rastreio}</Text>

            </Text>

          ) : null}

          {pedidoId ? (

            <Pressable

              style={styles.linkPedido}

              onPress={() =>

                router.push(`/admin/pedidos/${encodeURIComponent(pedidoId)}` as never)

              }>

              <Text style={styles.linkPedidoText}>Abrir pedido completo →</Text>

            </Pressable>

          ) : null}

          {leilaoId ? (

            <Pressable

              style={styles.linkPedido}

              onPress={() => router.push('/admin/leiloes' as never)}>

              <Text style={styles.linkPedidoText}>Ver leilão no painel →</Text>

            </Pressable>

          ) : null}

        </View>

      )}



      <Text style={[styles.secao, styles.secaoTimeline]}>Linha do tempo</Text>

      <OrderTimelineVisual etapas={timeline} compact />



      {eventos.length > 0 ? (

        <>

          <Text style={[styles.secao, styles.secaoTimeline]}>Eventos do pedido</Text>

          <View style={styles.eventosBox}>

            {eventos.map((ev) => (

              <View key={ev.id} style={styles.eventoRow}>

                <Text style={styles.eventoTipo}>{ev.tipo}</Text>

                <Text style={styles.eventoMsg}>{ev.mensagem}</Text>

                <Text style={styles.eventoData}>{ev.criadoEm}</Text>

              </View>

            ))}

          </View>

        </>

      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: { gap: 12, marginTop: 16 },

  secao: {

    fontSize: 11,

    fontWeight: '700',

    color: adminC.textMuted,

    textTransform: 'uppercase',

    letterSpacing: 0.6,

  },

  secaoTimeline: { marginTop: 8 },

  acaoBox: {

    backgroundColor: 'rgba(139, 92, 246, 0.08)',

    borderWidth: 1,

    borderColor: adminC.border,

    borderRadius: 12,

    padding: 12,

    gap: 6,

  },

  acaoTitulo: { fontSize: 12, fontWeight: '800', color: adminC.textPrimary },

  acaoTexto: { fontSize: 13, fontWeight: '600', color: adminC.accentBright, lineHeight: 18 },

  acaoMeta: { fontSize: 11, color: adminC.textMuted },

  acaoMetaDestaque: { fontWeight: '700', color: adminC.textSecondary },

  acaoDesc: { fontSize: 12, color: adminC.textSecondary, lineHeight: 18 },

  resumoRow: { gap: 4 },

  resumoItem: { fontSize: 12, color: adminC.textMuted },

  resumoDestaque: { color: adminC.textPrimary, fontWeight: '700' },

  pedidoRow: { gap: 6 },

  linkPedido: { alignSelf: 'flex-start', marginTop: 4 },

  linkPedidoText: { fontSize: 12, fontWeight: '700', color: adminC.accentBright },

  eventosBox: {

    backgroundColor: adminC.surfaceMuted,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: adminC.border,

    padding: 10,

    gap: 10,

  },

  eventoRow: { gap: 2, borderBottomWidth: 1, borderBottomColor: adminC.border, paddingBottom: 8 },

  eventoTipo: { fontSize: 10, fontWeight: '700', color: adminC.accent, textTransform: 'uppercase' },

  eventoMsg: { fontSize: 12, color: adminC.textPrimary, lineHeight: 17 },

  eventoData: { fontSize: 10, color: adminC.textMuted },

});

