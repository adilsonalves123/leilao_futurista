import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatBRL } from '@/src/lib/bids';
import {
  METODO_PAGAMENTO_LABEL,
  marcarTransacaoComoPaga,
  type MetodoPagamento,
  type StatusTransacao,
  type TransacaoRecente,
} from './transactionTypes';
import {
  TransactionLeilaoModal,
  TransactionPaymentModal,
  TransactionTimelineModal,
  TransactionUserModal,
} from './TransactionModals';
import { adminTheme } from './adminStyles';

type Props = {
  transacoes: TransacaoRecente[];
  somenteLeitura?: boolean;
};

type ModalTipo = 'usuario' | 'leilao' | 'pagamento' | 'timeline' | null;

function metodoIcon(metodo: MetodoPagamento): keyof typeof Ionicons.glyphMap {
  if (metodo === 'pix') return 'qr-code-outline';
  if (metodo === 'boleto') return 'barcode-outline';
  return 'card-outline';
}

function StatusBadge({ status }: { status: StatusTransacao }) {
  const concluido = status === 'concluido';
  return (
    <View style={[styles.badge, concluido ? styles.badgeConcluido : styles.badgePendente]}>
      <Ionicons
        name={concluido ? 'checkmark-circle' : 'time'}
        size={13}
        color={concluido ? '#34D399' : '#FBBF24'}
      />
      <Text style={[styles.badgeText, concluido ? styles.textConcluido : styles.textPendente]}>
        {concluido ? 'Concluído' : 'Pendente'}
      </Text>
    </View>
  );
}

export function RecentTransactionsTable({ transacoes: inicial, somenteLeitura = false }: Props) {
  const [transacoes, setTransacoes] = useState(inicial);
  const [selecionada, setSelecionada] = useState<TransacaoRecente | null>(null);
  const [modal, setModal] = useState<ModalTipo>(null);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);

  useEffect(() => {
    setTransacoes(inicial);
  }, [inicial]);

  function abrir(tx: TransacaoRecente, tipo: ModalTipo) {
    setSelecionada(tx);
    setModal(tipo);
  }

  function fecharModal() {
    setModal(null);
    setSelecionada(null);
  }

  function verificarPagamento(tx: TransacaoRecente) {
    setVerificandoId(tx.id);
    setTimeout(() => {
      setVerificandoId(null);
      if (tx.status === 'concluido') {
        Alert.alert('Pagamento confirmado', `${tx.id} já está quitado.`);
        return;
      }
      Alert.alert(
        'Verificação do gateway',
        `Transação ${tx.pagamento.transacaoId}\n\nStatus: ainda pendente no ${tx.pagamento.gateway}.\n\nUse "Marcar como pago" se recebeu confirmação manual.`,
      );
    }, 900);
  }

  function marcarComoPago(tx: TransacaoRecente) {
    Alert.alert(
      'Marcar como pago',
      `Confirmar baixa manual do pedido ${tx.id}?\n\nIsso avançará a timeline para "Pago".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar pagamento',
          onPress: () => {
            setTransacoes((prev) =>
              prev.map((item) => (item.id === tx.id ? marcarTransacaoComoPaga(item) : item)),
            );
            Alert.alert('Pedido atualizado', 'Pagamento registrado e status alterado para concluído.');
          },
        },
      ],
    );
  }

  return (
    <>
      <View
        style={[
          styles.container,
          Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : null,
        ]}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="receipt-outline" size={20} color={adminTheme.neon} />
            <Text style={styles.title}>Transações Recentes</Text>
          </View>
          <Pressable style={styles.filterBtn}>
            <Text style={styles.filterText}>Ver todas</Text>
            <Ionicons name="chevron-down" size={14} color={adminTheme.textMuted} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colId]}>ID</Text>
              <Text style={[styles.th, styles.colPedido]}>Pedido</Text>
              <Text style={[styles.th, styles.colUsuario]}>Usuário</Text>
              <Text style={[styles.th, styles.colPagamento]}>Pagamento</Text>
              <Text style={[styles.th, styles.colValor]}>Valor</Text>
              <Text style={[styles.th, styles.colData]}>Data</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
            </View>

            {transacoes.map((tx, index) => (
              <View
                key={tx.id}
                style={[styles.row, index < transacoes.length - 1 && styles.rowBorder]}>
                <Pressable style={styles.colId} onPress={() => abrir(tx, 'timeline')}>
                  <Text style={[styles.td, styles.idText, styles.linkText]}>{tx.id}</Text>
                </Pressable>

                <Pressable
                  style={[styles.colPedido, styles.pedidoCell]}
                  onPress={() => abrir(tx, 'leilao')}>
                  <Image source={{ uri: tx.pedido.imagem }} style={styles.pedidoImg} />
                  <Text style={[styles.pedidoNome, styles.linkText]} numberOfLines={1}>
                    {tx.pedido.nome}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.colUsuario, styles.usuarioCell]}
                  onPress={() => abrir(tx, 'usuario')}>
                  <Image source={{ uri: tx.usuario.avatar }} style={styles.avatar} />
                  <View style={styles.usuarioText}>
                    <Text style={[styles.usuarioNome, styles.linkText]}>{tx.usuario.nome}</Text>
                    <Text style={styles.usuarioHandle}>{tx.usuario.handle}</Text>
                  </View>
                </Pressable>

                <View style={[styles.colPagamento, styles.pagamentoCell]}>
                  <Ionicons
                    name={metodoIcon(tx.pagamento.metodo)}
                    size={15}
                    color={adminTheme.neon}
                  />
                  <Text style={styles.pagamentoText}>
                    {METODO_PAGAMENTO_LABEL[tx.pagamento.metodo]}
                  </Text>
                  <Pressable
                    style={styles.infoBtn}
                    onPress={() => abrir(tx, 'pagamento')}
                    hitSlop={6}
                    accessibilityLabel="Ver dados técnicos do pagamento">
                    <Ionicons name="information-circle-outline" size={18} color="#C4B5FD" />
                  </Pressable>
                </View>

                <Text style={[styles.td, styles.colValor, styles.valorText]}>
                  {formatBRL(tx.valorCents)}
                </Text>
                <Text style={[styles.td, styles.colData, styles.dataText]}>{tx.data}</Text>

                <View style={styles.colStatus}>
                  <StatusBadge status={tx.status} />
                  {tx.status === 'pendente' && !somenteLeitura ? (
                    <View style={styles.statusActions}>
                      <Pressable
                        style={styles.actionBtnOutline}
                        onPress={() => verificarPagamento(tx)}
                        disabled={verificandoId === tx.id}>
                        <Ionicons name="refresh-outline" size={13} color={adminTheme.neon} />
                        <Text style={styles.actionBtnOutlineText}>
                          {verificandoId === tx.id ? 'Verificando…' : 'Verificar'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.actionBtnPrimary} onPress={() => marcarComoPago(tx)}>
                        <Ionicons name="checkmark-done-outline" size={13} color={adminTheme.neonDim} />
                        <Text style={styles.actionBtnPrimaryText}>Marcar pago</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable style={styles.footerLink}>
          <Text style={styles.footerLinkText}>Ver todas as transações</Text>
          <Ionicons name="arrow-forward" size={14} color={adminTheme.neon} />
        </Pressable>
      </View>

      <TransactionUserModal visible={modal === 'usuario'} onClose={fecharModal} transacao={selecionada} />
      <TransactionLeilaoModal visible={modal === 'leilao'} onClose={fecharModal} transacao={selecionada} />
      <TransactionPaymentModal
        visible={modal === 'pagamento'}
        onClose={fecharModal}
        transacao={selecionada}
      />
      <TransactionTimelineModal
        visible={modal === 'timeline'}
        onClose={fecharModal}
        transacao={selecionada}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: adminTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminTheme.border,
    padding: 20,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: adminTheme.textPrimary },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surfaceMuted,
  },
  filterText: { fontSize: 13, color: adminTheme.textMuted, fontWeight: '500' },
  tableWrap: { minWidth: 980 },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.border,
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.border,
  },
  td: { fontSize: 13, color: adminTheme.textPrimary },
  colId: { width: 96 },
  colPedido: { width: 190 },
  colUsuario: { width: 170 },
  colPagamento: { width: 130 },
  colValor: { width: 120 },
  colData: { width: 130 },
  colStatus: { width: 200 },
  idText: { color: adminTheme.neon, fontWeight: '700', fontSize: 12 },
  linkText: { color: adminTheme.neon },
  pedidoCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pedidoImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: adminTheme.border,
  },
  pedidoNome: { flex: 1, fontSize: 13, fontWeight: '600' },
  usuarioCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: adminTheme.border,
  },
  usuarioText: { flex: 1 },
  usuarioNome: { fontSize: 13, fontWeight: '600' },
  usuarioHandle: { fontSize: 11, color: adminTheme.textMuted, marginTop: 1 },
  pagamentoCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pagamentoText: { fontSize: 12, fontWeight: '600', color: adminTheme.textPrimary, flex: 1 },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: adminTheme.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorText: { fontWeight: '700', fontSize: 13 },
  dataText: { fontSize: 12, color: adminTheme.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeConcluido: {
    backgroundColor: adminTheme.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(5,255,155,0.28)',
  },
  badgePendente: {
    backgroundColor: adminTheme.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  textConcluido: { color: adminTheme.neon },
  textPendente: { color: adminTheme.gold },
  statusActions: { marginTop: 8, gap: 6 },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    backgroundColor: adminTheme.infoSoft,
  },
  actionBtnOutlineText: { fontSize: 10, fontWeight: '700', color: adminTheme.neon },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  actionBtnPrimaryText: { fontSize: 10, fontWeight: '700', color: adminTheme.neonDim },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: adminTheme.border,
  },
  footerLinkText: { fontSize: 13, fontWeight: '600', color: adminTheme.neon },
});
