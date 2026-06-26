import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatBRL } from '@/src/lib/bids';
import { resolverVendorId } from '@/src/services/adminVendedor';
import {
  METODO_PAGAMENTO_LABEL,
  type TransacaoRecente,
} from './transactionTypes';
import { adminC } from './adminStyles';

const KYC_CORES = {
  aprovado: { bg: '#064E3B', text: '#6EE7B7', label: 'Verificado' },
  em_analise: { bg: '#422006', text: '#FCD34D', label: 'Em análise' },
  pendente: { bg: '#374151', text: '#D1D5DB', label: 'Pendente' },
  rejeitado: { bg: '#450A0A', text: '#FCA5A5', label: 'Rejeitado' },
};

type ModalBaseProps = {
  visible: boolean;
  onClose: () => void;
  transacao: TransacaoRecente | null;
};

export function TransactionUserModal({ visible, onClose, transacao }: ModalBaseProps) {
  if (!transacao) return null;
  const kyc = KYC_CORES[transacao.usuario.kycStatus];

  return (
    <AdminModalShell
      visible={visible}
      onClose={onClose}
      title="Perfil do licitante"
      subtitle={transacao.usuario.nome}>
      <View style={styles.userHeader}>
        <Image source={{ uri: transacao.usuario.avatar }} style={styles.avatarLg} />
        <View style={styles.userHeaderText}>
          <Text style={styles.userName}>{transacao.usuario.nome}</Text>
          <Text style={styles.userHandle}>{transacao.usuario.handle}</Text>
          <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
            <Text style={[styles.kycBadgeText, { color: kyc.text }]}>KYC: {kyc.label}</Text>
          </View>
        </View>
      </View>

      <InfoRow icon="mail-outline" label="E-mail" value={transacao.usuario.email} />
      <InfoRow icon="call-outline" label="Contato" value={transacao.usuario.telefone} />
      <InfoRow icon="card-outline" label="CPF" value={transacao.usuario.cpf} />
      <InfoRow icon="receipt-outline" label="Pedido vinculado" value={transacao.id} />
    </AdminModalShell>
  );
}

export function TransactionLeilaoModal({ visible, onClose, transacao }: ModalBaseProps) {
  const router = useRouter();
  if (!transacao) return null;

  const vendorId = transacao.pedido.vendedorId
    ? transacao.pedido.vendedorId
    : transacao.pedido.vendedor
      ? resolverVendorId(transacao.pedido.vendedor)
      : null;

  function abrirPerfilVendedor() {
    if (!vendorId) return;
    onClose();
    router.push(`/admin/vendedores/${encodeURIComponent(vendorId)}` as never);
  }

  return (
    <AdminModalShell
      visible={visible}
      onClose={onClose}
      title="Detalhes do leilão"
      subtitle={transacao.pedido.nome}>
      <Image source={{ uri: transacao.pedido.imagem }} style={styles.leilaoImg} />
      <InfoRow icon="pricetag-outline" label="Lote" value={transacao.pedido.nome} />
      <InfoRow icon="key-outline" label="ID do leilão" value={transacao.leilaoId} />
      {transacao.pedido.vendedor ? (
        <Pressable style={styles.linkInfoRow} onPress={abrirPerfilVendedor}>
          <Ionicons name="storefront-outline" size={16} color={adminC.accentBright} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Vendedor</Text>
            <Text style={[styles.infoValue, styles.linkValue]}>{transacao.pedido.vendedor}</Text>
            <Text style={styles.linkHint}>Ver perfil detalhado →</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C4B5FD" />
        </Pressable>
      ) : null}
      <InfoRow icon="cash-outline" label="Valor arrematado" value={formatBRL(transacao.valorCents)} />
      {transacao.pedido.descricao ? (
        <View style={styles.descBox}>
          <Text style={styles.descTitle}>Descrição</Text>
          <Text style={styles.descBody}>{transacao.pedido.descricao}</Text>
        </View>
      ) : null}
    </AdminModalShell>
  );
}

export function TransactionPaymentModal({ visible, onClose, transacao }: ModalBaseProps) {
  if (!transacao) return null;
  const p = transacao.pagamento;

  return (
    <AdminModalShell
      visible={visible}
      onClose={onClose}
      title="Dados técnicos do pagamento"
      subtitle={METODO_PAGAMENTO_LABEL[p.metodo]}>
      <InfoRow icon="finger-print-outline" label="ID da transação" value={p.transacaoId} mono />
      <InfoRow icon="card-outline" label="Método" value={METODO_PAGAMENTO_LABEL[p.metodo]} />
      <InfoRow icon="business-outline" label="Gateway" value={p.gateway} />
      <InfoRow
        icon="time-outline"
        label="Data de aprovação"
        value={p.aprovadoEm ?? 'Aguardando confirmação'}
      />
      {p.comprovanteUrl ? (
        <Pressable
          style={styles.linkBtn}
          onPress={() => Linking.openURL(p.comprovanteUrl!).catch(() => undefined)}>
          <Ionicons name="document-attach-outline" size={18} color="#C4B5FD" />
          <Text style={styles.linkBtnText}>Abrir comprovante</Text>
        </Pressable>
      ) : (
        <Text style={styles.pendingHint}>Comprovante indisponível enquanto o pagamento estiver pendente.</Text>
      )}
    </AdminModalShell>
  );
}

export function TransactionTimelineModal({ visible, onClose, transacao }: ModalBaseProps) {
  if (!transacao) return null;

  return (
    <AdminModalShell
      visible={visible}
      onClose={onClose}
      title="Timeline do pedido"
      subtitle={transacao.id}>
      <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
        {transacao.timeline.map((etapa, index) => {
          const ultima = index === transacao.timeline.length - 1;
          return (
            <View key={etapa.id} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    etapa.concluida && styles.timelineDotDone,
                    etapa.atual && styles.timelineDotCurrent,
                  ]}>
                  {etapa.concluida ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : etapa.atual ? (
                    <View style={styles.timelineDotInner} />
                  ) : null}
                </View>
                {!ultima ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineTitle,
                    etapa.atual && styles.timelineTitleCurrent,
                    !etapa.concluida && !etapa.atual && styles.timelineTitleMuted,
                  ]}>
                  {etapa.titulo}
                </Text>
                <Text style={styles.timelineDesc}>{etapa.descricao}</Text>
                <Text style={styles.timelineDate}>
                  {etapa.data ?? (etapa.atual ? 'Em andamento' : 'Pendente')}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </AdminModalShell>
  );
}

function AdminModalShell({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{title}</Text>
              {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={adminC.textMuted} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={adminC.accentBright} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, mono && styles.infoMono]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 520,
    width: '100%' as unknown as number,
    alignSelf: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 22,
    maxHeight: '85%' as unknown as number,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: adminC.textPrimary },
  cardSubtitle: { fontSize: 13, color: adminC.textMuted, marginTop: 4 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userHeader: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  avatarLg: { width: 64, height: 64, borderRadius: 32, backgroundColor: adminC.border },
  userHeaderText: { flex: 1, gap: 4 },
  userName: { fontSize: 17, fontWeight: '800', color: adminC.textPrimary },
  userHandle: { fontSize: 13, color: adminC.textMuted },
  kycBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  kycBadgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  infoValue: { fontSize: 14, color: adminC.textPrimary, fontWeight: '600' },
  infoMono: { fontFamily: 'monospace' },
  linkInfoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  linkValue: { color: '#93C5FD' },
  linkHint: { fontSize: 10, color: '#C4B5FD', marginTop: 3, fontWeight: '600' },
  leilaoImg: {
    width: '100%' as unknown as number,
    height: 160,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: adminC.border,
  },
  descBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  descTitle: { fontSize: 12, fontWeight: '700', color: '#C4B5FD', marginBottom: 6 },
  descBody: { fontSize: 13, lineHeight: 20, color: adminC.textSecondary },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: adminC.accent,
  },
  linkBtnText: { color: '#C4B5FD', fontWeight: '700', fontSize: 13 },
  pendingHint: { marginTop: 12, fontSize: 12, color: adminC.textMuted, lineHeight: 18 },
  timelineScroll: { maxHeight: 360 },
  timelineRow: { flexDirection: 'row', gap: 12, minHeight: 72 },
  timelineRail: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: adminC.success, borderColor: adminC.success },
  timelineDotCurrent: { borderColor: adminC.accent, backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminC.accentBright,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  timelineTitleCurrent: { color: '#C4B5FD' },
  timelineTitleMuted: { color: adminC.textMuted },
  timelineDesc: { fontSize: 12, color: adminC.textSecondary, marginTop: 3, lineHeight: 17 },
  timelineDate: { fontSize: 11, color: adminC.textMuted, marginTop: 4, fontWeight: '600' },
});
