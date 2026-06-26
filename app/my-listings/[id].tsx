import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { jaAvaliouComprador } from '@/src/services/buyerReviews';
import { useAuctionRealtime } from '@/src/hooks/useAuctionRealtime';
import { labelCategoria } from '@/src/lib/listingCategories';
import {
  adicionarImagemAnuncio,
  excluirAnuncio,
  obterGestaoAnuncio,
  pausarLeilao,
  retomarLeilao,
  type GestaoAnuncioDetalhe,
} from '@/src/services/vendorListings';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  purpleSoft: '#F4F0FF',
};

export default function ListingGestaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [detalhe, setDetalhe] = useState<GestaoAnuncioDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [jaAvaliou, setJaAvaliou] = useState(false);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    const data = await obterGestaoAnuncio(String(id));
    setDetalhe(data);
    if (data?.arrematante?.orderId) {
      const avaliou = await jaAvaliouComprador(data.arrematante.orderId);
      setJaAvaliou(avaliou);
    }
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      if (!carregando) carregar();
    }, [carregar, carregando]),
  );

  useAuctionRealtime(id, carregar);

  const onRefresh = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const handleCopy = useCallback(async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado!', `${label} copiado para a área de transferência.`);
  }, []);

  const handleWhatsApp = useCallback((telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${digits}`);
  }, []);

  const handleAddPhoto = useCallback(async () => {
    if (!detalhe?.canEditMedia || !id) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setEnviandoFoto(true);
    try {
      const urls = await adicionarImagemAnuncio(String(id), result.assets[0].uri);
      setDetalhe((prev) => (prev ? { ...prev, imageUrls: urls } : prev));
      Alert.alert('Foto adicionada', 'A galeria do anúncio foi atualizada.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível adicionar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }, [detalhe?.canEditMedia, id]);

  const handleAvaliarComprador = useCallback(() => {
    if (!detalhe?.arrematante) return;
    const { orderId, buyerId, buyerName } = detalhe.arrematante;
    router.push({
      pathname: '/reviews/rate-buyer',
      params: {
        orderId,
        auctionId: detalhe.id,
        buyerId,
        vendorId: MOCK_VENDOR_ID,
        titulo: detalhe.title,
        buyerName,
      },
    });
  }, [detalhe, router]);

  const mostrarAcoesLeilao =
    detalhe &&
    detalhe.gestaoStatus !== 'finalizado' &&
    detalhe.gestaoStatus !== 'cancelado' &&
    (detalhe.canPause || detalhe.canResume || detalhe.canDelete);

  const confirmarPausarOuRetomar = useCallback(() => {
    if (!detalhe || !id) return;

    if (detalhe.canResume) {
      Alert.alert('Retomar leilão', 'O anúncio voltará a aparecer nas buscas para os compradores.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retomar',
          onPress: async () => {
            setAcaoEmAndamento(true);
            try {
              const atualizado = await retomarLeilao(String(id));
              setDetalhe(atualizado);
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível retomar.');
            } finally {
              setAcaoEmAndamento(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(
      'Pausar leilão',
      'O anúncio será ocultado das buscas. Os lances já registrados serão mantidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pausar',
          onPress: async () => {
            setAcaoEmAndamento(true);
            try {
              const atualizado = await pausarLeilao(String(id));
              setDetalhe(atualizado);
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível pausar.');
            } finally {
              setAcaoEmAndamento(false);
            }
          },
        },
      ],
    );
  }, [detalhe, id]);

  const executarExclusao = useCallback(async () => {
    if (!id) return;
    setAcaoEmAndamento(true);
    try {
      const resultado = await excluirAnuncio(String(id));
      if (resultado.penalidadeAplicada) {
        Alert.alert(
          'Anúncio excluído',
          `Sua reputação foi ajustada para ${resultado.reputacaoEstrelas?.toFixed(1) ?? '—'} estrelas.`,
          [{ text: 'OK', onPress: () => router.replace('/my-listings') }],
        );
      } else {
        router.replace('/my-listings');
      }
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setAcaoEmAndamento(false);
    }
  }, [id, router]);

  const confirmarExcluir = useCallback(() => {
    if (!detalhe) return;
    const temLances = detalhe.bidCount > 0;

    if (temLances) {
      Alert.alert(
        'Excluir anúncio com lances',
        'Este anúncio possui lances. A exclusão reduzirá sua reputação em 1 estrela automaticamente.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir mesmo assim',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmar exclusão',
                'Esta ação é irreversível. Deseja excluir o anúncio e aplicar a penalidade de reputação?',
                [
                  { text: 'Voltar', style: 'cancel' },
                  { text: 'Confirmar exclusão', style: 'destructive', onPress: executarExclusao },
                ],
              );
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Excluir anúncio',
      'O anúncio será removido permanentemente. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: executarExclusao },
      ],
    );
  }, [detalhe, executarExclusao]);

  if (carregando) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Carregando gestão do anúncio…</Text>
      </View>
    );
  }

  if (!detalhe) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
        <Text style={styles.emptyTitle}>Anúncio não encontrado</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const podeAvaliar = detalhe.arrematante?.pagamentoConfirmado && !jaAvaliou;
  const showArrematante =
    detalhe.gestaoStatus === 'finalizado' || detalhe.gestaoStatus === 'aguardando_pagamento';

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Gestão do Anúncio</Text>
        </View>
        {detalhe.gestaoStatus === 'em_andamento' || detalhe.gestaoStatus === 'pausado' ? (
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push(`/my-listings/edit/${detalhe.id}`)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Editar anúncio">
            <Ionicons name="create-outline" size={18} color={C.accent} />
            <Text style={styles.editBtnText}>Editar</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* 1 — Título */}
        <View style={styles.section}>
          <View style={[styles.statusRow, { borderColor: `${detalhe.statusColor}35` }]}>
            <View style={[styles.statusDot, { backgroundColor: detalhe.statusColor }]} />
            <Text style={[styles.statusLabel, { color: detalhe.statusColor }]}>
              {detalhe.gestaoStatusLabel}
            </Text>
          </View>
          <Text style={styles.listingTitle}>{detalhe.title}</Text>
          {detalhe.category ? (
            <Text style={styles.listingMeta}>{labelCategoria(detalhe.category)}</Text>
          ) : null}
          <Text style={styles.listingPrice}>
            Maior lance: <Text style={styles.priceHighlight}>{detalhe.currentPriceLabel}</Text>
          </Text>
        </View>

        {/* 2 — Fotos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            {detalhe.canEditMedia ? (
              <Pressable
                style={[styles.addPhotoBtn, enviandoFoto && styles.addPhotoBtnDisabled]}
                onPress={handleAddPhoto}
                disabled={enviandoFoto}>
                {enviandoFoto ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={16} color={C.accent} />
                    <Text style={styles.addPhotoText}>Adicionar</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
          {detalhe.canEditMedia ? (
            <Text style={styles.sectionHint}>
              Sem lances ainda — você pode incluir novas fotos antes do leilão começar a receber ofertas.
            </Text>
          ) : (
            <Text style={styles.sectionHint}>
              Edição bloqueada após o primeiro lance recebido.
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {detalhe.imageUrls.length > 0 ? (
              detalhe.imageUrls.map((uri, index) => (
                <Image key={`${uri}-${index}`} source={{ uri }} style={styles.galleryImage} />
              ))
            ) : (
              <View style={styles.galleryEmpty}>
                <Ionicons name="image-outline" size={24} color={C.textMuted} />
                <Text style={styles.galleryEmptyText}>Nenhuma foto cadastrada</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 3 — Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>
            {detalhe.description?.trim()
              ? detalhe.description
              : 'Nenhuma descrição informada para este anúncio.'}
          </Text>
        </View>

        {/* 4 — Lances */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lances</Text>
            <Text style={styles.bidsCount}>
              {detalhe.bidCount} registro{detalhe.bidCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {detalhe.bids.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="hammer-outline" size={28} color={C.textMuted} />
              <Text style={styles.emptyBoxText}>Nenhum lance registrado ainda.</Text>
            </View>
          ) : (
            <View style={styles.bidsList}>
              {detalhe.bids.map((lance, index) => (
                <View
                  key={lance.id}
                  style={[styles.bidRow, index === 0 && styles.bidRowHighlight]}>
                  <View style={styles.bidRank}>
                    {lance.isHighest ? (
                      <Ionicons name="trophy" size={16} color={C.accent} />
                    ) : (
                      <Text style={styles.bidRankNum}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.bidInfo}>
                    <Text style={styles.bidderName}>{lance.bidderName}</Text>
                    <Text style={styles.bidTime}>{lance.createdAtLabel}</Text>
                  </View>
                  <Text style={styles.bidAmount}>{lance.amountLabel}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {mostrarAcoesLeilao ? (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsSectionTitle}>Ações do leilão</Text>

            {detalhe.canPause || detalhe.canResume ? (
              <Pressable
                style={[
                  styles.btnPausar,
                  acaoEmAndamento && styles.actionBtnDisabled,
                ]}
                onPress={confirmarPausarOuRetomar}
                disabled={acaoEmAndamento}>
                <Ionicons
                  name={detalhe.canResume ? 'play-outline' : 'pause-outline'}
                  size={18}
                  color="#B45309"
                />
                <Text style={styles.btnPausarText}>
                  {detalhe.canResume ? 'Retomar Leilão' : 'Pausar Leilão'}
                </Text>
              </Pressable>
            ) : null}

            {detalhe.canDelete ? (
              <Pressable
                style={[styles.btnExcluir, acaoEmAndamento && styles.actionBtnDisabled]}
                onPress={confirmarExcluir}
                disabled={acaoEmAndamento}>
                {acaoEmAndamento ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    <Text style={styles.btnExcluirText}>Excluir Anúncio</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Informações do arrematante */}
        {showArrematante && detalhe.arrematante ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações do arrematante</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="person-outline" size={18} color={C.accent} />
                <View style={styles.contactBody}>
                  <Text style={styles.contactLabel}>Comprador</Text>
                  <Text style={styles.contactValue}>{detalhe.arrematante.buyerName}</Text>
                </View>
              </View>

              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={18} color={C.accent} />
                <View style={styles.contactBody}>
                  <Text style={styles.contactLabel}>E-mail</Text>
                  <Pressable onPress={() => handleCopy(detalhe.arrematante!.email, 'E-mail')}>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                      {detalhe.arrematante.email}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {detalhe.arrematante.telefone ? (
                <View style={styles.contactRow}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <View style={styles.contactBody}>
                    <Text style={styles.contactLabel}>WhatsApp</Text>
                    <Pressable onPress={() => handleWhatsApp(detalhe.arrematante!.telefone!)}>
                      <Text style={[styles.contactValue, styles.contactLink]}>
                        {detalhe.arrematante.telefone}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.paymentRow}>
                <View>
                  <Text style={styles.contactLabel}>Status do pagamento</Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      {
                        backgroundColor: detalhe.arrematante.pagamentoConfirmado
                          ? '#D1FAE5'
                          : '#FEF3C7',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.paymentBadgeText,
                        {
                          color: detalhe.arrematante.pagamentoConfirmado ? '#047857' : '#B45309',
                        },
                      ]}>
                      {detalhe.arrematante.paymentStatusLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.contactLabel}>Valor arrematado</Text>
                  <Text style={styles.priceHighlight}>{detalhe.arrematante.itemLabel}</Text>
                  {detalhe.arrematante.paymentMethodLabel ? (
                    <Text style={styles.paymentMethod}>
                      via {detalhe.arrematante.paymentMethodLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.orderCode}>Pedido {detalhe.arrematante.orderCode}</Text>
            </View>
          </View>
        ) : null}

        {/* Reputação — avaliar comprador */}
        {showArrematante && detalhe.arrematante ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reputação</Text>
            <View style={styles.reputationCard}>
              <Ionicons name="star-half-outline" size={32} color={C.accent} />
              <Text style={styles.reputationTitle}>Avalie a experiência com o comprador</Text>
              <Text style={styles.reputationHint}>
                {jaAvaliou
                  ? 'Você já enviou sua avaliação para este arremate.'
                  : podeAvaliar
                    ? 'O pagamento foi confirmado. Sua avaliação ajuda outros vendedores.'
                    : 'Disponível após a confirmação do pagamento pelo comprador.'}
              </Text>
              <Pressable
                style={[
                  styles.actionBtn,
                  (!podeAvaliar || jaAvaliou) && styles.actionBtnDisabled,
                ]}
                onPress={handleAvaliarComprador}
                disabled={!podeAvaliar || jaAvaliou}>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>
                  {jaAvaliou ? 'Avaliação enviada' : 'Avaliar Comprador'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: C.textMuted },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14, fontWeight: '700', color: C.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.purpleSoft,
    borderWidth: 1,
    borderColor: `${C.accent}30`,
  },
  editBtnText: { fontSize: 12, fontWeight: '800', color: C.accent },
  content: { padding: 16, gap: 14 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '800' },
  listingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  listingMeta: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginTop: 4 },
  listingPrice: { fontSize: 14, color: C.textSecondary, marginTop: 10 },
  priceHighlight: { fontWeight: '800', color: C.accent },
  section: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  sectionHint: { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.purpleSoft,
  },
  addPhotoBtnDisabled: { opacity: 0.6 },
  addPhotoText: { fontSize: 12, fontWeight: '700', color: C.accent },
  galleryRow: { gap: 10, paddingVertical: 4 },
  galleryImage: {
    width: 140,
    height: 105,
    borderRadius: 14,
    backgroundColor: C.border,
  },
  galleryEmpty: {
    width: '100%',
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.bg,
  },
  galleryEmptyText: { fontSize: 12, color: C.textMuted },
  bidsCount: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  bidsList: { gap: 8 },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.bg,
  },
  bidRowHighlight: {
    backgroundColor: C.purpleSoft,
    borderWidth: 1,
    borderColor: `${C.accent}25`,
  },
  bidRank: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidRankNum: { fontSize: 13, fontWeight: '700', color: C.textMuted },
  bidInfo: { flex: 1, gap: 2 },
  bidderName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  bidTime: { fontSize: 11, color: C.textMuted },
  bidAmount: { fontSize: 14, fontWeight: '800', color: C.accent },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyBoxText: { fontSize: 13, color: C.textMuted },
  contactCard: { gap: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  contactBody: { flex: 1, gap: 2 },
  contactLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  contactLink: { color: C.accent },
  divider: { height: 1, backgroundColor: C.border },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  paymentRight: { alignItems: 'flex-end', gap: 2 },
  paymentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: '700' },
  paymentMethod: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  orderCode: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  reputationCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  reputationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  reputationHint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginTop: 4,
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  description: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
    marginTop: 2,
  },
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  actionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  btnPausar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  btnPausarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
  },
  btnExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnExcluirText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
});
