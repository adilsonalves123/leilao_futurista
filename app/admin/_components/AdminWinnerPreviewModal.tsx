import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LotChatPanel } from '@/src/components/lot-chat/LotChatPanel';
import type { AdminCompradorResumo } from '@/src/services/adminComprador';
import { obterCompradorAdmin } from '@/src/services/adminComprador';
import type { StatusVerificacao } from '@/src/types/database';
import { adminTheme } from './adminTheme';

const KYC_CORES: Record<StatusVerificacao, { bg: string; text: string; border: string }> = {
  aprovado: { bg: 'rgba(5,255,155,0.1)', text: adminTheme.neonDim, border: 'rgba(16,185,129,0.3)' },
  em_analise: { bg: adminTheme.warningSoft, text: adminTheme.gold, border: 'rgba(251,191,36,0.3)' },
  pendente: { bg: 'rgba(107,143,122,0.15)', text: adminTheme.textMuted, border: adminTheme.border },
  rejeitado: { bg: adminTheme.dangerSoft, text: adminTheme.danger, border: 'rgba(248,113,113,0.3)' },
};

const KYC_LABEL: Record<StatusVerificacao, string> = {
  aprovado: 'Aprovado',
  em_analise: 'Em análise',
  pendente: 'Pendente',
  rejeitado: 'Rejeitado',
};

type Props = {
  visible: boolean;
  compradorId: string | null;
  orderId: string | null;
  handleFallback?: string | null;
  onClose: () => void;
};

export function AdminWinnerPreviewModal({
  visible,
  compradorId,
  orderId,
  handleFallback,
  onClose,
}: Props) {
  const [perfil, setPerfil] = useState<AdminCompradorResumo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!compradorId) return;
    setCarregando(true);
    setErro(false);
    try {
      const dados = await obterCompradorAdmin(compradorId);
      if (!dados) {
        setErro(true);
        setPerfil(null);
      } else {
        setPerfil(dados);
      }
    } catch {
      setErro(true);
      setPerfil(null);
    } finally {
      setCarregando(false);
    }
  }, [compradorId]);

  useEffect(() => {
    if (visible && compradorId) {
      carregar();
    } else if (!visible) {
      setPerfil(null);
      setErro(false);
    }
  }, [visible, compradorId, carregar]);

  const kycStatus = perfil?.statusVerificacao ?? 'pendente';
  const kyc = KYC_CORES[kycStatus];
  const handle = perfil?.handle ?? handleFallback ?? '@comprador';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={styles.card}
          {...(Platform.OS === 'web'
            ? ({ onClick: (e: { stopPropagation: () => void }) => e.stopPropagation() } as object)
            : { onStartShouldSetResponder: () => true })}
        >          
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ganhador</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={adminTheme.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.profileScroll}
            contentContainerStyle={styles.profileScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {carregando ? (
              <View style={styles.center}>
                <ActivityIndicator color={adminTheme.neonDim} />
                <Text style={styles.loadingText}>Carregando…</Text>
              </View>
            ) : erro || !perfil ? (
              <View style={styles.profileFallback}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{handle.charAt(1).toUpperCase()}</Text>
                </View>
                <Text style={styles.handle}>{handle}</Text>
                <Text style={styles.erroText}>Perfil completo indisponível</Text>
              </View>
            ) : (
              <>
                <View style={styles.profileRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(perfil.nomeCompleto ?? perfil.nome).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileMeta}>
                    <Text style={styles.handle}>{perfil.handle}</Text>
                    <Text style={styles.nome}>{perfil.nomeCompleto ?? perfil.nome}</Text>
                  </View>
                </View>

                <View style={[styles.kycBadge, { backgroundColor: kyc.bg, borderColor: kyc.border }]}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={kyc.text} />
                  <Text style={[styles.kycText, { color: kyc.text }]}>
                    KYC · {KYC_LABEL[kycStatus]}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{perfil.saldoFtk.replace('FTK ', '')}</Text>
                    <Text style={styles.statLabel}>Saldo FTK</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>
                      {perfil.statusConta === 'ativo' ? 'Ativo' : 'Restrito'}
                    </Text>
                    <Text style={styles.statLabel}>Conta</Text>
                  </View>
                </View>

                <View style={styles.contactBlock}>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={14} color={adminTheme.textMuted} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {perfil.email}
                    </Text>
                  </View>
                  {perfil.telefone ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color={adminTheme.textMuted} />
                      <Text style={styles.contactText}>{perfil.telefone}</Text>
                    </View>
                  ) : null}
                  {perfil.cpf ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="card-outline" size={14} color={adminTheme.textMuted} />
                      <Text style={styles.contactText}>CPF ·••• {perfil.cpf.slice(-4)}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>

          {orderId ? (
            <View style={styles.chatWrap}>
              <Text style={styles.chatTitle}>Chat do pedido</Text>
              <View style={styles.chatPanelHost}>
                <LotChatPanel orderId={orderId} mode="admin" embedded inModal />
              </View>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const cardShadow = Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadowMd } as object) : {};

const webFlexCol =
  Platform.OS === 'web'
    ? ({
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      } as object)
    : {};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%' as unknown as number,
    backgroundColor: adminTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    padding: 18,
    ...cardShadow,
    ...webFlexCol,
    ...(Platform.OS === 'web'
      ? ({ maxHeight: '92vh', boxSizing: 'border-box' } as object)
      : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexShrink: 0,
  },
  profileScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 130,
  },
  profileScrollContent: {
    flexGrow: 0,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  center: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  profileFallback: { alignItems: 'center', paddingVertical: 12, gap: 6, marginBottom: 8 },
  loadingText: { fontSize: 13, color: adminTheme.textMuted },
  erroText: { fontSize: 12, color: adminTheme.textMuted },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#C4B5FD' },
  profileMeta: { flex: 1, minWidth: 0 },
  handle: { fontSize: 15, fontWeight: '700', color: '#C4B5FD' },
  nome: { fontSize: 13, fontWeight: '600', color: adminTheme.textPrimary, marginTop: 2 },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  kycText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminTheme.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.border,
    paddingVertical: 8,
    marginBottom: 8,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: adminTheme.border },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: adminTheme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 9, fontWeight: '600', color: adminTheme.textMuted, textTransform: 'uppercase' },
  contactBlock: { gap: 8, marginBottom: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { flex: 1, fontSize: 12, color: adminTheme.textSecondary, fontWeight: '500' },
  chatWrap: {
    flexShrink: 0,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: adminTheme.border,
    paddingTop: 10,
  },
  chatPanelHost: {
    width: '100%',
    minHeight: 420,
    ...(Platform.OS === 'web' ? ({ display: 'block', minHeight: 420 } as object) : { minHeight: 420 }),
  },
  chatTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    flexShrink: 0,
  },
});
