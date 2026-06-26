import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import {
  SELLER_BADGE_ADMIN_OPTIONS,
  SELLER_BADGE_DEFAULT,
  sellerBadgeLabel,
  type SellerBadge,
} from '@/src/constants/sellerBadge';
import type { AdminVendedorDetalhe } from '@/src/services/adminVendedor';
import {
  definirEtiquetaVendedorAdmin,
  KYC_VENDEDOR_LABEL,
  obterPerfilVendedorAdmin,
} from '@/src/services/adminVendedor';
import { ReviewPhotosModeration } from '../_components/ReviewPhotosModeration';
import { adminC, adminStyles } from '../_components/adminStyles';

const KYC_CORES = {
  aprovado: { bg: '#064E3B', text: '#6EE7B7' },
  em_analise: { bg: '#422006', text: '#FCD34D' },
  pendente: { bg: '#374151', text: '#D1D5DB' },
  rejeitado: { bg: '#450A0A', text: '#FCA5A5' },
};

function Stars({ rating }: { rating: number }) {
  const arredondado = Math.round(rating);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < arredondado ? 'star' : 'star-outline'}
          size={18}
          color={i < arredondado ? '#FBBF24' : adminC.textMuted}
        />
      ))}
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  alerta,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  alerta?: boolean;
}) {
  return (
    <View style={[styles.metricCard, alerta && styles.metricCardAlerta]}>
      <Ionicons name={icon} size={18} color={alerta ? '#FCA5A5' : adminC.accentBright} />
      <Text style={[styles.metricValue, alerta && styles.metricValueAlerta]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function whatsappUrl(telefone: string | null): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const numero = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${numero}`;
}

export default function AdminVendedorPerfilScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [perfil, setPerfil] = useState<AdminVendedorDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [etiquetaEdit, setEtiquetaEdit] = useState<SellerBadge>(SELLER_BADGE_DEFAULT);
  const [salvandoEtiqueta, setSalvandoEtiqueta] = useState(false);

  const podeVer =
    temPermissao('financeiro') || temPermissao('leiloes') || temPermissao('suporte');

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setNaoEncontrado(false);
    try {
      const dados = await obterPerfilVendedorAdmin(String(id));
      if (!dados) {
        setNaoEncontrado(true);
        setPerfil(null);
      } else {
        setPerfil(dados);
        setEtiquetaEdit(dados.sellerBadge ?? SELLER_BADGE_DEFAULT);
      }
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarEtiqueta() {
    if (!perfil) return;
    const atual = perfil.sellerBadge ?? SELLER_BADGE_DEFAULT;
    if (etiquetaEdit === atual) return;

    const confirmar =
      Platform.OS === 'web'
        ? window.confirm(
            `Alterar etiqueta para "${sellerBadgeLabel(etiquetaEdit)}"?`,
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Alterar etiqueta',
              `Definir como "${sellerBadgeLabel(etiquetaEdit)}"?`,
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Salvar', onPress: () => resolve(true) },
              ],
            );
          });
    if (!confirmar) return;

    setSalvandoEtiqueta(true);
    try {
      await definirEtiquetaVendedorAdmin(perfil.id, etiquetaEdit);
      setPerfil((p) => (p ? { ...p, sellerBadge: etiquetaEdit } : p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível salvar a etiqueta.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erro', msg);
    } finally {
      setSalvandoEtiqueta(false);
    }
  }

  if (!podeVer) {
    return <Redirect href="/admin/equipe" />;
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adminC.accent} />
        <Text style={styles.loadingText}>Carregando perfil do vendedor…</Text>
      </View>
    );
  }

  if (naoEncontrado || !perfil) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={adminC.textMuted} />
        <Text style={styles.notFoundTitle}>Vendedor não encontrado</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const kyc = KYC_CORES[perfil.statusKyc];
  const wa = whatsappUrl(perfil.telefone);
  const confiavel =
    perfil.statusKyc === 'aprovado' &&
    perfil.mediaEstrelas >= 4 &&
    perfil.multasAplicadas === 0 &&
    perfil.desistencias <= 1;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Pressable style={styles.backLink} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#C4B5FD" />
        <Text style={styles.backLinkText}>Voltar</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="storefront" size={28} color={adminC.accentBright} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.handle}>{perfil.handle}</Text>
          <Text style={adminStyles.pageTitle}>{perfil.nomeExibicao}</Text>
          <View style={[styles.trustBadge, confiavel ? styles.trustOk : styles.trustWarn]}>
            <Ionicons
              name={confiavel ? 'shield-checkmark' : 'alert-circle-outline'}
              size={14}
              color={confiavel ? '#6EE7B7' : '#FCD34D'}
            />
            <Text style={[styles.trustText, confiavel ? styles.trustTextOk : styles.trustTextWarn]}>
              {confiavel ? 'Perfil confiável' : 'Requer atenção'}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          adminStyles.card,
          Platform.OS === 'web'
            ? ({
                backgroundImage:
                  'linear-gradient(145deg, rgba(49,46,129,0.35) 0%, rgba(17,24,39,0.95) 100%)',
              } as object)
            : null,
        ]}>
        <Text style={adminStyles.cardTitle}>Resumo de reputação</Text>
        <View style={styles.reputationRow}>
          <Text style={styles.score}>
            {perfil.mediaEstrelas > 0
              ? perfil.mediaEstrelas.toFixed(1).replace('.', ',')
              : '—'}
          </Text>
          <View>
            <Stars rating={perfil.mediaEstrelas} />
            <Text style={styles.reviewCount}>
              {perfil.totalAvaliacoes} avaliação(ões) recebida(s)
            </Text>
          </View>
        </View>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Performance operacional</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Leilões concluídos"
            value={perfil.leiloesConcluidos}
            icon="trophy-outline"
          />
          <MetricCard
            label="Desistências / pendências"
            value={perfil.desistencias}
            icon="time-outline"
            alerta={perfil.desistencias > 0}
          />
          <MetricCard
            label="Multas aplicadas"
            value={perfil.multasAplicadas}
            icon="warning-outline"
            alerta={perfil.multasAplicadas > 0}
          />
        </View>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Etiqueta de vendedor</Text>
        <Text style={styles.etiquetaHint}>
          Exibida no perfil público do vendedor no app.
        </Text>
        <View style={styles.etiquetaAtualRow}>
          <Text style={styles.etiquetaLabel}>Atual:</Text>
          {perfil.sellerBadge ? (
            <SellerBadgeChip badge={perfil.sellerBadge} />
          ) : (
            <Text style={styles.semEtiqueta}>Não definida</Text>
          )}
        </View>
        <View style={styles.etiquetaOptions}>
          {SELLER_BADGE_ADMIN_OPTIONS.map((opt) => {
            const ativo = etiquetaEdit === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.etiquetaOption, ativo && styles.etiquetaOptionAtivo]}
                onPress={() => setEtiquetaEdit(opt.id)}>
                <Text style={[styles.etiquetaOptionText, ativo && styles.etiquetaOptionTextAtivo]}>
                  {opt.label}
                </Text>
                <Text style={styles.etiquetaOptionHint}>{opt.hint}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[
            styles.salvarEtiquetaBtn,
            (salvandoEtiqueta ||
              etiquetaEdit === (perfil.sellerBadge ?? SELLER_BADGE_DEFAULT)) &&
              styles.salvarEtiquetaBtnDisabled,
          ]}
          disabled={
            salvandoEtiqueta ||
            etiquetaEdit === (perfil.sellerBadge ?? SELLER_BADGE_DEFAULT)
          }
          onPress={salvarEtiqueta}>
          {salvandoEtiqueta ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="pricetag-outline" size={16} color="#FFF" />
              <Text style={styles.salvarEtiquetaBtnText}>Salvar etiqueta</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Verificação KYC</Text>
        <View style={styles.kycRow}>
          <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
            <Text style={[styles.kycBadgeText, { color: kyc.text }]}>
              {KYC_VENDEDOR_LABEL[perfil.statusKyc]}
            </Text>
          </View>
          <View style={styles.kycInfo}>
            <Text style={styles.kycLabel}>Nome no documento</Text>
            <Text style={styles.kycValue}>{perfil.nomeCompleto ?? 'Não informado'}</Text>
            <Text style={[styles.kycLabel, { marginTop: 8 }]}>E-mail</Text>
            <Text style={styles.kycValue}>{perfil.email}</Text>
          </View>
        </View>
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Contato para intervenção</Text>
        <Text style={styles.contactHint}>
          Use em casos de pedido travado, disputa ou atraso de postagem.
        </Text>
        {perfil.telefone ? (
          <Pressable
            style={styles.waBtn}
            onPress={() => wa && Linking.openURL(wa).catch(() => undefined)}>
            <Ionicons name="logo-whatsapp" size={20} color="#6EE7B7" />
            <View style={styles.waTextWrap}>
              <Text style={styles.waLabel}>WhatsApp do vendedor</Text>
              <Text style={styles.waNumber}>{perfil.telefone}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color="#6EE7B7" />
          </Pressable>
        ) : (
          <Text style={styles.semTelefone}>Telefone não cadastrado no perfil.</Text>
        )}
        <Pressable
          style={styles.emailBtn}
          onPress={() => Linking.openURL(`mailto:${perfil.email}`).catch(() => undefined)}>
          <Ionicons name="mail-outline" size={18} color="#93C5FD" />
          <Text style={styles.emailBtnText}>{perfil.email}</Text>
        </Pressable>
      </View>

      <ReviewPhotosModeration
        reviews={perfil.reviews}
        titulo="Galeria de prova real"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { color: adminC.textMuted, fontSize: 14 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: adminC.textPrimary },
  backBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: adminC.accent,
  },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backLinkText: { color: '#C4B5FD', fontWeight: '700', fontSize: 14 },
  hero: { flexDirection: 'row', gap: 16, marginBottom: 20, alignItems: 'flex-start' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 4 },
  handle: { fontSize: 13, fontWeight: '700', color: '#93C5FD', fontFamily: 'monospace' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  trustOk: { backgroundColor: 'rgba(6, 78, 59, 0.45)' },
  trustWarn: { backgroundColor: 'rgba(66, 32, 6, 0.55)' },
  trustText: { fontSize: 11, fontWeight: '800' },
  trustTextOk: { color: '#6EE7B7' },
  trustTextWarn: { color: '#FCD34D' },
  reputationRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 8 },
  score: { fontSize: 48, fontWeight: '800', color: '#FBBF24' },
  starsRow: { flexDirection: 'row', gap: 3 },
  reviewCount: { fontSize: 12, color: adminC.textMuted, marginTop: 6, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(17,24,39,0.55)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 6,
  },
  metricCardAlerta: { borderColor: 'rgba(239, 68, 68, 0.35)' },
  metricValue: { fontSize: 22, fontWeight: '800', color: adminC.textPrimary },
  metricValueAlerta: { color: '#FCA5A5' },
  metricLabel: { fontSize: 11, color: adminC.textMuted, fontWeight: '600' },
  etiquetaHint: { fontSize: 12, color: adminC.textMuted, marginBottom: 12, lineHeight: 18 },
  etiquetaAtualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  etiquetaLabel: { fontSize: 12, color: adminC.textMuted, fontWeight: '600' },
  semEtiqueta: { fontSize: 13, color: adminC.textMuted, fontStyle: 'italic' },
  etiquetaOptions: { gap: 8, marginBottom: 14 },
  etiquetaOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    backgroundColor: 'rgba(17,24,39,0.55)',
  },
  etiquetaOptionAtivo: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  etiquetaOptionText: { fontSize: 13, fontWeight: '700', color: adminC.textSecondary },
  etiquetaOptionTextAtivo: { color: adminC.accentBright },
  etiquetaOptionHint: { fontSize: 11, color: adminC.textMuted, marginTop: 4, lineHeight: 15 },
  salvarEtiquetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: adminC.accent,
  },
  salvarEtiquetaBtnDisabled: { opacity: 0.45 },
  salvarEtiquetaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  kycRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginTop: 8 },
  kycBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  kycBadgeText: { fontSize: 12, fontWeight: '800' },
  kycInfo: { flex: 1 },
  kycLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kycValue: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary, marginTop: 2 },
  contactHint: { fontSize: 12, color: adminC.textMuted, marginBottom: 12, lineHeight: 18 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 10,
  },
  waTextWrap: { flex: 1 },
  waLabel: { fontSize: 11, color: '#6EE7B7', fontWeight: '700' },
  waNumber: { fontSize: 14, color: '#A7F3D0', fontWeight: '800', marginTop: 2 },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 58, 95, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  emailBtnText: { color: '#93C5FD', fontWeight: '700', fontSize: 13 },
  semTelefone: { fontSize: 13, color: adminC.textMuted, fontStyle: 'italic', marginBottom: 10 },
});
