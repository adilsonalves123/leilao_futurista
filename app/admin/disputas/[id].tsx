import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { AdminDisputeEvidenceWall } from '../_components/AdminDisputeEvidenceWall';
import { alertarAdmin, confirmarAdmin } from '../_components/adminAlert';
import { adminC, adminStyles } from '../_components/adminStyles';
import { formatBRL } from '@/src/lib/bids';
import {
  adicionarEvidenciaDisputaAdmin,
  atualizarDisputaAdmin,
  obterDisputaAdmin,
  resolverDisputaAdmin,
} from '@/src/services/adminDisputas';
import { enviarEvidenciaDisputa } from '@/src/services/disputeEvidenceUpload';
import type { AdminDisputaDetalhe } from '@/src/types/adminDisputas';
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
} from '@/src/types/adminDisputas';

export default function AdminDisputaDetalheScreen() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [disputa, setDisputa] = useState<AdminDisputaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [parecer, setParecer] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [resolvendo, setResolvendo] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setNaoEncontrado(false);
    try {
      const dados = await obterDisputaAdmin(String(id));
      if (!dados) {
        setNaoEncontrado(true);
        setDisputa(null);
        return;
      }
      setDisputa(dados);
      setNotasAdmin(dados.adminNotes ?? '');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarNotas() {
    if (!disputa) return;
    setSalvando(true);
    try {
      await atualizarDisputaAdmin({
        disputeId: disputa.disputeId,
        adminNotes: notasAdmin,
        status: 'em_analise',
      });
      alertarAdmin('Notas salvas', 'Disputa marcada como em análise.');
      await carregar();
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function anexarMidia(origem: 'foto' | 'video') {
    if (!disputa) return;

    let uri: string | null = null;

    if (origem === 'foto') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        alertarAdmin('Permissão', 'Permita acesso à galeria para anexar fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      uri = result.assets[0].uri;
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      uri = result.assets[0].uri;
    }

    setEnviandoMidia(true);
    try {
      const { url, kind } = await enviarEvidenciaDisputa(disputa.disputeId, 'admin', uri, Date.now());
      await adicionarEvidenciaDisputaAdmin({
        disputeId: disputa.disputeId,
        party: 'admin',
        kind: kind === 'video' ? 'video' : 'nota_admin',
        mediaUrl: url,
        caption: parecer.trim() || 'Evidência anexada pelo mediador',
      });
      alertarAdmin('Anexo enviado', 'Evidência registrada no dossiê da disputa.');
      await carregar();
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Falha no upload.');
    } finally {
      setEnviandoMidia(false);
    }
  }

  async function escolherAnexo() {
    Alert.alert('Anexar evidência', 'O que deseja enviar como mediador?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Foto', onPress: () => void anexarMidia('foto') },
      { text: 'Vídeo', onPress: () => void anexarMidia('video') },
    ]);
  }

  async function executarVeredito(favor: 'comprador' | 'vendedor') {
    if (!disputa) return;
    const ok = await confirmarAdmin(
      favor === 'comprador' ? 'Favor comprador' : 'Favor vendedor',
      favor === 'comprador'
        ? 'Estorna o pedido e libera reembolso ao comprador. Confirma?'
        : 'Finaliza o pedido e libera pagamento ao vendedor. Confirma?',
    );
    if (!ok) return;

    setResolvendo(true);
    try {
      await resolverDisputaAdmin({
        disputeId: disputa.disputeId,
        favor,
        notes: parecer.trim() || undefined,
        debitarGarantiaCents: favor === 'comprador' ? Math.round(disputa.totalCents * 0.1) : undefined,
      });
      alertarAdmin('Disputa encerrada', 'Veredito registrado e pedido atualizado.');
      router.replace('/admin/disputas');
    } catch (e) {
      alertarAdmin('Erro', e instanceof Error ? e.message : 'Falha ao resolver.');
    } finally {
      setResolvendo(false);
    }
  }

  if (!temPermissao('suporte')) {
    return <Redirect href="/admin/equipe" />;
  }

  if (carregando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={adminC.accent} />
      </View>
    );
  }

  if (naoEncontrado || !disputa) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Disputa não encontrada</Text>
        <Pressable style={adminStyles.btnSecondary} onPress={() => router.back()}>
          <Text style={adminStyles.btnSecondaryText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const resolvida = ['resolvida_comprador', 'resolvida_vendedor', 'cancelada'].includes(
    disputa.status,
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color={adminC.accent} />
        <Text style={styles.backText}>Voltar à Sala de Mediação</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Image source={{ uri: disputa.auctionImage }} style={styles.heroImage} />
        <View style={styles.heroBody}>
          <Text style={styles.heroCode}>{disputa.orderCode}</Text>
          <Text style={styles.heroTitle}>{disputa.auctionTitle}</Text>
          <Text style={styles.heroValue}>{formatBRL(disputa.totalCents)} em custódia</Text>
          <View style={styles.heroBadges}>
            <Badge label={DISPUTE_STATUS_LABELS[disputa.status]} tone="status" />
            <Badge label={DISPUTE_CATEGORY_LABELS[disputa.category]} tone="category" />
          </View>
        </View>
      </View>

      <View style={styles.splitRow}>
        <PartyCard
          titulo="Comprador"
          nome={disputa.buyer.nome}
          email={disputa.buyer.email}
          cor="#1D4ED8"
          icone="person-outline"
        />
        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <PartyCard
          titulo="Vendedor"
          nome={disputa.vendor.nome}
          email={disputa.vendor.email}
          cor="#047857"
          icone="storefront-outline"
        />
      </View>

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Relato do comprador</Text>
        <Text style={styles.reasonText}>{disputa.reason}</Text>
        {disputa.trackingCode ? (
          <Pressable
            style={styles.trackRow}
            onPress={() => Linking.openURL(`https://rastreamento.correios.com.br/app/index.php?objeto=${disputa.trackingCode}`)}>
            <Ionicons name="locate-outline" size={14} color={adminC.accent} />
            <Text style={styles.trackText}>Rastreio: {disputa.trackingCode}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={adminStyles.card}>
        <AdminDisputeEvidenceWall
          evidence={disputa.evidence}
          onPressAdd={resolvida ? undefined : () => void escolherAnexo()}
          adding={enviandoMidia}
        />
      </View>

      {!resolvida ? (
        <>
          <View style={adminStyles.card}>
            <Text style={adminStyles.cardTitle}>Notas internas (só admin)</Text>
            <TextInput
              style={styles.textArea}
              value={notasAdmin}
              onChangeText={setNotasAdmin}
              placeholder="Observações para a equipe — não visível às partes"
              placeholderTextColor={adminC.textMuted}
              multiline
            />
            <Pressable
              style={[adminStyles.btnSecondary, salvando && { opacity: 0.6 }]}
              onPress={() => void salvarNotas()}
              disabled={salvando}>
              <Text style={adminStyles.btnSecondaryText}>
                {salvando ? 'Salvando…' : 'Salvar e marcar em análise'}
              </Text>
            </Pressable>
          </View>

          <View style={[adminStyles.card, styles.verdictCard]}>
            <View style={styles.verdictHeader}>
              <Ionicons name="scale-outline" size={22} color={adminC.accent} />
              <Text style={styles.verdictTitle}>Veredito do mediador</Text>
            </View>
            <Text style={styles.verdictSub}>
              Descreva a decisão. Pode anexar foto/vídeo antes de encerrar.
            </Text>
            <TextInput
              style={styles.textArea}
              value={parecer}
              onChangeText={setParecer}
              placeholder="Ex.: Evidências do comprador comprovam dano na lente. Estorno integral."
              placeholderTextColor={adminC.textMuted}
              multiline
            />
            <View style={styles.verdictActions}>
              <Pressable
                style={[styles.btnComprador, resolvendo && styles.btnBusy]}
                onPress={() => void executarVeredito('comprador')}
                disabled={resolvendo}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnVerdictText}>Favor comprador</Text>
              </Pressable>
              <Pressable
                style={[styles.btnVendedor, resolvendo && styles.btnBusy]}
                onPress={() => void executarVeredito('vendedor')}
                disabled={resolvendo}>
                <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnVerdictText}>Favor vendedor</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>Disputa encerrada</Text>
          <Text style={styles.reasonText}>
            {disputa.resolutionNotes ?? 'Veredito registrado.'}
          </Text>
        </View>
      )}

      <Pressable
        style={styles.linkPedido}
        onPress={() => router.push(`/admin/pedidos/${disputa.orderId}`)}>
        <Ionicons name="receipt-outline" size={16} color={adminC.accent} />
        <Text style={styles.linkPedidoText}>Abrir pedido completo (chat, timeline, financeiro)</Text>
      </Pressable>
    </ScrollView>
  );
}

function PartyCard({
  titulo,
  nome,
  email,
  cor,
  icone,
}: {
  titulo: string;
  nome: string;
  email: string;
  cor: string;
  icone: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.partyCard, { borderColor: `${cor}33` }]}>
      <View style={[styles.partyIcon, { backgroundColor: `${cor}15` }]}>
        <Ionicons name={icone} size={18} color={cor} />
      </View>
      <Text style={[styles.partyRole, { color: cor }]}>{titulo}</Text>
      <Text style={styles.partyNome} numberOfLines={1}>
        {nome}
      </Text>
      <Text style={styles.partyEmail} numberOfLines={1}>
        {email}
      </Text>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'status' | 'category' }) {
  const bg = tone === 'status' ? '#450A0A' : '#312E81';
  const color = tone === 'status' ? '#FCA5A5' : '#C4B5FD';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingBottom: 40, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: adminC.textPrimary },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backText: { color: adminC.accent, fontWeight: '600', fontSize: 13 },
  heroCard: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminC.border,
    backgroundColor: adminC.surface,
  },
  heroImage: {
    width: Platform.OS === 'web' ? 120 : '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1F2937',
  },
  heroBody: { flex: 1, gap: 6 },
  heroCode: { fontSize: 12, fontWeight: '800', color: adminC.accent },
  heroTitle: { fontSize: 18, fontWeight: '800', color: adminC.textPrimary },
  heroValue: { fontSize: 14, color: '#F59E0B', fontWeight: '700' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    backgroundColor: adminC.surface,
  },
  partyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  partyRole: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  partyNome: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  partyEmail: { fontSize: 11, color: adminC.textMuted },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(5, 255, 155, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { fontSize: 11, fontWeight: '900', color: adminC.accent },
  reasonText: { fontSize: 14, color: adminC.textSecondary, lineHeight: 21 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  trackText: { fontSize: 12, color: adminC.accent, fontWeight: '600' },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: adminC.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: adminC.textPrimary,
    textAlignVertical: 'top',
    backgroundColor: adminC.bg,
    marginBottom: 10,
  },
  verdictCard: {
    borderColor: adminC.accent,
    backgroundColor: 'rgba(5, 255, 155, 0.04)',
  },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  verdictTitle: { fontSize: 16, fontWeight: '800', color: adminC.textPrimary },
  verdictSub: { fontSize: 12, color: adminC.textMuted, marginBottom: 10, lineHeight: 17 },
  verdictActions: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 10 },
  btnComprador: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnVendedor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnVerdictText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnBusy: { opacity: 0.6 },
  linkPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  linkPedidoText: { color: adminC.accent, fontWeight: '600', fontSize: 13 },
});
