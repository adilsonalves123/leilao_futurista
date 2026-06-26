import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AdminVendedorDetalhe } from '@/src/services/adminVendedor';
import {
  KYC_VENDEDOR_LABEL,
  obterPerfilVendedorAdmin,
} from '@/src/services/adminVendedor';
import type { StatusVerificacao } from '@/src/types/database';
import { adminTheme } from './adminTheme';

const KYC_CORES: Record<StatusVerificacao, { bg: string; text: string; border: string }> = {
  aprovado: { bg: 'rgba(5,255,155,0.1)', text: adminTheme.neonDim, border: 'rgba(16,185,129,0.3)' },
  em_analise: { bg: adminTheme.warningSoft, text: adminTheme.gold, border: 'rgba(251,191,36,0.3)' },
  pendente: { bg: 'rgba(107,143,122,0.15)', text: adminTheme.textMuted, border: adminTheme.border },
  rejeitado: { bg: adminTheme.dangerSoft, text: adminTheme.danger, border: 'rgba(248,113,113,0.3)' },
};

type Props = {
  visible: boolean;
  vendorId: string | null;
  onClose: () => void;
};

function Stars({ rating }: { rating: number }) {
  const arredondado = Math.round(rating);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < arredondado ? 'star' : 'star-outline'}
          size={14}
          color={i < arredondado ? adminTheme.gold : adminTheme.textMuted}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function AdminVendorPreviewModal({ visible, vendorId, onClose }: Props) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<AdminVendedorDetalhe | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!vendorId) return;
    setCarregando(true);
    setErro(false);
    try {
      const dados = await obterPerfilVendedorAdmin(vendorId);
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
  }, [vendorId]);

  useEffect(() => {
    if (visible && vendorId) {
      carregar();
    } else if (!visible) {
      setPerfil(null);
      setErro(false);
    }
  }, [visible, vendorId, carregar]);

  function abrirPerfilCompleto() {
    if (!vendorId) return;
    onClose();
    router.push(`/admin/vendedores/${encodeURIComponent(vendorId)}` as never);
  }

  const kyc = perfil ? KYC_CORES[perfil.statusKyc] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vendedor</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={adminTheme.textMuted} />
            </Pressable>
          </View>

          {carregando ? (
            <View style={styles.center}>
              <ActivityIndicator color={adminTheme.neonDim} />
              <Text style={styles.loadingText}>Carregando…</Text>
            </View>
          ) : erro || !perfil ? (
            <View style={styles.center}>
              <Ionicons name="person-outline" size={32} color={adminTheme.textMuted} />
              <Text style={styles.erroText}>Perfil não encontrado</Text>
            </View>
          ) : (
            <>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(perfil.nomeExibicao || perfil.handle).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileMeta}>
                  <Text style={styles.handle}>{perfil.handle}</Text>
                  <Text style={styles.nome}>{perfil.nomeExibicao}</Text>
                  {perfil.nomeCompleto ? (
                    <Text style={styles.nomeCompleto}>{perfil.nomeCompleto}</Text>
                  ) : null}
                </View>
              </View>

              {kyc ? (
                <View style={[styles.kycBadge, { backgroundColor: kyc.bg, borderColor: kyc.border }]}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={kyc.text} />
                  <Text style={[styles.kycText, { color: kyc.text }]}>
                    KYC · {KYC_VENDEDOR_LABEL[perfil.statusKyc]}
                  </Text>
                </View>
              ) : null}

              <Stars rating={perfil.mediaEstrelas} />
              <Text style={styles.avaliacoesHint}>
                {perfil.totalAvaliacoes} avaliação{perfil.totalAvaliacoes === 1 ? '' : 'ões'}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{perfil.leiloesConcluidos}</Text>
                  <Text style={styles.statLabel}>Concluídos</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, perfil.desistencias > 0 && styles.statAlert]}>
                    {perfil.desistencias}
                  </Text>
                  <Text style={styles.statLabel}>Desistências</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, perfil.multasAplicadas > 0 && styles.statAlert]}>
                    {perfil.multasAplicadas}
                  </Text>
                  <Text style={styles.statLabel}>Multas</Text>
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
              </View>

              <Pressable style={styles.fullProfileBtn} onPress={abrirPerfilCompleto}>
                <Text style={styles.fullProfileText}>Ver perfil completo</Text>
                <Ionicons name="arrow-forward" size={14} color={adminTheme.neonDim} />
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cardShadow = Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadowMd } as object) : {};

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
    maxWidth: 340,
    backgroundColor: adminTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    padding: 18,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: adminTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  center: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { fontSize: 13, color: adminTheme.textMuted },
  erroText: { fontSize: 13, color: adminTheme.textMuted },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: adminTheme.neonDim },
  profileMeta: { flex: 1, minWidth: 0 },
  handle: { fontSize: 15, fontWeight: '700', color: adminTheme.neonDim },
  nome: { fontSize: 13, fontWeight: '600', color: adminTheme.textPrimary, marginTop: 2 },
  nomeCompleto: { fontSize: 11, color: adminTheme.textMuted, marginTop: 2 },
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
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: adminTheme.textSecondary,
    marginLeft: 6,
  },
  avaliacoesHint: { fontSize: 11, color: adminTheme.textMuted, marginTop: 4, marginBottom: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminTheme.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.border,
    paddingVertical: 12,
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: adminTheme.border },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: adminTheme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statAlert: { color: adminTheme.danger },
  statLabel: { fontSize: 9, fontWeight: '600', color: adminTheme.textMuted, textTransform: 'uppercase' },
  contactBlock: { gap: 8, marginBottom: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { flex: 1, fontSize: 12, color: adminTheme.textSecondary, fontWeight: '500' },
  fullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminTheme.borderStrong,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  fullProfileText: { fontSize: 13, fontWeight: '700', color: adminTheme.neonDim },
});
