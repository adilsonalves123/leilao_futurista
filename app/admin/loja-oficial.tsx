import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link, Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SellerBadgeChip } from '@/components/seller/SellerBadgeChip';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import { CONSERVATION_OPTIONS } from '@/src/constants/listingForm';
import {
  AUCTION_DURATIONS,
  LISTING_CATEGORIES,
  type AuctionDuration,
  type ListingCategory,
} from '@/src/lib/listingCategories';
import {
  LOJA_OFICIAL_ADMIN_HINT,
  obterStatusLojaOficialAdmin,
  publicarLeilaoLojaOficialAdmin,
  type LojaOficialStatus,
} from '@/src/services/adminLojaOficial';
import { AdminPageHeader } from './_components/AdminPageHeader';
import { alertarAdmin } from './_components/adminAlert';
import { adminC, adminStyles } from './_components/adminStyles';

export default function AdminLojaOficialPage() {
  const { temPermissao } = useAdminSession();
  const router = useRouter();
  const [status, setStatus] = useState<LojaOficialStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('produtos_gerais');
  const [startPrice, setStartPrice] = useState('');
  const [estimatedMarket, setEstimatedMarket] = useState('');
  const [duration, setDuration] = useState<AuctionDuration>('24 horas');
  const [conservation, setConservation] = useState<(typeof CONSERVATION_OPTIONS)[number]['id']>('novo');
  const [originCep, setOriginCep] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [wantFeatured, setWantFeatured] = useState(false);
  const [wantFeaturedPlus, setWantFeaturedPlus] = useState(true);
  const [publicarAoVivo, setPublicarAoVivo] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setStatus(await obterStatusLojaOficialAdmin());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao('leiloes')) {
    return <Redirect href="/admin/equipe" />;
  }

  async function escolherFotos() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      await alertarAdmin('Permissão', 'Autorize o acesso à galeria para enviar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    });
    if (!result.canceled && result.assets.length) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 6));
    }
  }

  async function publicar() {
    if (!title.trim()) {
      await alertarAdmin('Campos obrigatórios', 'Informe o título do leilão.');
      return;
    }
    if (!startPrice.trim() || !estimatedMarket.trim()) {
      await alertarAdmin('Preços', 'Informe lance inicial e valor de mercado.');
      return;
    }
    if (originCep.replace(/\D/g, '').length !== 8) {
      await alertarAdmin('CEP', 'Informe o CEP de origem com 8 dígitos.');
      return;
    }

    setSalvando(true);
    try {
      const resultado = await publicarLeilaoLojaOficialAdmin({
        title,
        description,
        category,
        startPrice,
        estimatedMarketValue: estimatedMarket,
        auctionDuration: duration,
        conservationState: conservation,
        originCep,
        photos,
        wantFeatured,
        wantFeaturedPlus,
        publicarAoVivo,
      });

      if (!resultado.ok) {
        await alertarAdmin('Erro', resultado.erro ?? 'Não foi possível publicar.');
        return;
      }

      const msg = resultado.erro
        ? resultado.erro
        : publicarAoVivo
          ? 'Leilão publicado e já está ao vivo na Loja Oficial.'
          : 'Leilão enviado para análise (rascunho).';

      await alertarAdmin('Sucesso', msg);
      setTitle('');
      setDescription('');
      setPhotos([]);
      await carregar();

      if (resultado.auctionId) {
        router.push(`/auction/${resultado.auctionId}` as never);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <AdminPageHeader
        title="Loja Oficial Levou"
        subtitle="Publique leilões direto pelo admin, sem garantia de vendedor."
      />

      {carregando ? (
        <ActivityIndicator color={adminC.accent} style={{ marginVertical: 24 }} />
      ) : status?.ready ? (
        <View style={[adminStyles.card, styles.statusCard]}>
          <View style={styles.statusHead}>
            <View style={styles.statusIcon}>
              <Ionicons name="storefront" size={24} color={adminC.accentBright} />
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.statusNome}>{status.displayName ?? 'Levou Oficial'}</Text>
              <Text style={styles.statusEmail}>{status.email}</Text>
              <SellerBadgeChip badge="loja_oficial" />
            </View>
          </View>
          <View style={styles.statusStats}>
            <Text style={styles.statText}>{status.leiloesAoVivo ?? 0} ao vivo</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>{status.leiloesEmAnalise ?? 0} em análise</Text>
          </View>
          {status.vendorId ? (
            <Link href={`/vendor/${encodeURIComponent(status.vendorId)}`} style={styles.perfilLink}>
              Ver perfil público
            </Link>
          ) : null}
        </View>
      ) : (
        <View style={[adminStyles.card, styles.warnCard]}>
          <Ionicons name="warning-outline" size={22} color="#FCD34D" />
          <Text style={styles.warnTitle}>Conta ainda não pronta</Text>
          <Text style={styles.warnText}>
            {status?.message ??
              `Execute a migration 077 ou crie o usuário ${LOJA_OFICIAL_ADMIN_HINT.email} no Supabase Auth.`}
          </Text>
          <Text style={styles.warnHint}>
            Senha inicial (seed): {LOJA_OFICIAL_ADMIN_HINT.senhaInicial} — redefina no painel Auth.
          </Text>
        </View>
      )}

      <View style={adminStyles.card}>
        <Text style={adminStyles.cardTitle}>Novo leilão da loja</Text>
        <Text style={styles.formHint}>
          Sem cobrança de garantia nem taxa de destaque. Por padrão já entra ao vivo.
        </Text>

        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: iPhone 16 Pro Max — Lote Oficial"
          placeholderTextColor={adminC.textMuted}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detalhes do produto, condição, o que inclui…"
          placeholderTextColor={adminC.textMuted}
          multiline
        />

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chipRow}>
          {LISTING_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.chip, category === cat.id && styles.chipAtivo]}
              onPress={() => setCategory(cat.id)}>
              <Text style={[styles.chipText, category === cat.id && styles.chipTextAtivo]}>
                {cat.emoji} {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.label}>Lance inicial (R$)</Text>
            <TextInput
              style={styles.input}
              value={startPrice}
              onChangeText={setStartPrice}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={adminC.textMuted}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Valor de mercado (R$)</Text>
            <TextInput
              style={styles.input}
              value={estimatedMarket}
              onChangeText={setEstimatedMarket}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={adminC.textMuted}
            />
          </View>
        </View>

        <Text style={styles.label}>Duração</Text>
        <View style={styles.chipRow}>
          {AUCTION_DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={[styles.chip, duration === d && styles.chipAtivo]}
              onPress={() => setDuration(d)}>
              <Text style={[styles.chipText, duration === d && styles.chipTextAtivo]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Conservação</Text>
        <View style={styles.chipRow}>
          {CONSERVATION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.chip, conservation === opt.id && styles.chipAtivo]}
              onPress={() => setConservation(opt.id)}>
              <Text style={[styles.chipText, conservation === opt.id && styles.chipTextAtivo]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>CEP de origem</Text>
        <TextInput
          style={styles.input}
          value={originCep}
          onChangeText={setOriginCep}
          keyboardType="number-pad"
          placeholder="00000-000"
          placeholderTextColor={adminC.textMuted}
        />

        <Text style={styles.label}>Fotos ({photos.length}/6)</Text>
        <Pressable style={styles.photoBtn} onPress={escolherFotos}>
          <Ionicons name="images-outline" size={18} color="#C4B5FD" />
          <Text style={styles.photoBtnText}>Adicionar da galeria</Text>
        </Pressable>
        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Publicar ao vivo agora</Text>
          <Switch value={publicarAoVivo} onValueChange={setPublicarAoVivo} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Destaque Plus (Home)</Text>
          <Switch value={wantFeaturedPlus} onValueChange={setWantFeaturedPlus} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Destaque na aba Leilões</Text>
          <Switch value={wantFeatured} onValueChange={setWantFeatured} />
        </View>

        <Pressable
          style={[styles.publishBtn, (salvando || !status?.ready) && styles.publishBtnDisabled]}
          disabled={salvando || !status?.ready}
          onPress={publicar}>
          {salvando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color="#FFF" />
              <Text style={styles.publishBtnText}>Publicar na Loja Oficial</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingBottom: 48 },
  statusCard: { marginBottom: 16 },
  statusHead: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMeta: { flex: 1, gap: 6 },
  statusNome: { fontSize: 18, fontWeight: '800', color: adminC.textPrimary },
  statusEmail: { fontSize: 12, color: adminC.textMuted },
  statusStats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statText: { fontSize: 13, color: adminC.textSecondary, fontWeight: '600' },
  statDot: { color: adminC.textMuted },
  perfilLink: { marginTop: 12, color: '#C4B5FD', fontWeight: '700', fontSize: 13 },
  warnCard: { gap: 8, marginBottom: 16, borderColor: 'rgba(251, 191, 36, 0.35)' },
  warnTitle: { fontSize: 15, fontWeight: '800', color: '#FCD34D' },
  warnText: { fontSize: 13, color: adminC.textSecondary, lineHeight: 19 },
  warnHint: { fontSize: 11, color: adminC.textMuted, marginTop: 4 },
  formHint: { fontSize: 12, color: adminC.textMuted, marginBottom: 14, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    color: adminC.textPrimary,
    backgroundColor: 'rgba(17,24,39,0.45)',
    fontSize: 14,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
  },
  chipAtivo: { backgroundColor: adminC.accent, borderColor: adminC.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: adminC.textMuted },
  chipTextAtivo: { color: '#FFF' },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    alignSelf: 'flex-start',
  },
  photoBtnText: { color: '#C4B5FD', fontWeight: '700', fontSize: 13 },
  photoRow: { marginTop: 10 },
  photoThumb: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  switchLabel: { fontSize: 13, color: adminC.textSecondary, fontWeight: '600', flex: 1 },
  publishBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: adminC.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
