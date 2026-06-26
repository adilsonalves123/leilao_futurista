import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedToast } from '@/src/components/ui/AnimatedToast';
import { ListingPhotoGrid } from '@/src/components/listings/ListingPhotoGrid';
import {
  AUCTION_DURATIONS,
  centavosParaInput,
  labelCategoria,
  LISTING_CATEGORIES,
  parsePriceInput,
  reaisParaCentavos,
  type AuctionDuration,
  type ListingCategory,
} from '@/src/lib/listingCategories';
import {
  atualizarAnuncio,
  excluirAnuncio,
  obterGestaoAnuncio,
  pausarLeilao,
  prazoParaEndsAt,
  retomarLeilao,
  type GestaoAnuncioDetalhe,
} from '@/src/services/vendorListings';
import { lightColors } from '@/src/theme/lightTokens';

const LIGHT = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  lockedBg: '#F9FAFB',
  lockedBorder: '#E5E7EB',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
};

const DARK = {
  accent: '#A78BFA',
  bg: '#12101A',
  white: '#1E1B2E',
  textPrimary: '#F4F2FF',
  textMuted: '#8F8AA3',
  textSecondary: '#B8B3CC',
  border: '#2D2840',
  accentSoft: 'rgba(124, 58, 237, 0.18)',
  accentBorder: 'rgba(167, 139, 250, 0.35)',
  lockedBg: '#181524',
  lockedBorder: '#3D3658',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.35)',
  warningText: '#FCD34D',
};

function formatarDataTermino(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EditarAnuncioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const C = scheme === 'dark' ? DARK : LIGHT;
  const styles = makeStyles(C);

  const [detalhe, setDetalhe] = useState<GestaoAnuncioDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Alterações salvas com sucesso!');
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('produtos_gerais');
  const [startPrice, setStartPrice] = useState('');
  const [auctionDuration, setAuctionDuration] = useState<AuctionDuration>('24 horas');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    const data = await obterGestaoAnuncio(String(id));
    setDetalhe(data);
    if (data) {
      setTitle(data.title);
      setDescription(data.description ?? '');
      setCategory(data.category ?? 'produtos_gerais');
      setStartPrice(centavosParaInput(data.startingPriceCents));
      setAuctionDuration(data.auctionDuration);
      setPhotos([...data.imageUrls]);
    }
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  const bloqueadoPreco = detalhe ? detalhe.bidCount > 0 : true;
  const bloqueadoPrazo = detalhe ? !detalhe.canEditPriceAndEndDate : true;
  const bloqueadoMidia = detalhe ? !detalhe.canEditMedia : true;
  const formularioBloqueado =
    detalhe?.auctionStatus === 'cancelled' || detalhe?.gestaoStatus === 'finalizado';

  async function handleSalvar() {
    if (!detalhe || !id) return;

    if (!title.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título do anúncio.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a descrição do anúncio.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Fotos obrigatórias', 'Mantenha pelo menos uma foto no anúncio.');
      return;
    }

    const startingPriceCents = reaisParaCentavos(parsePriceInput(startPrice));
    if (!bloqueadoPreco && startingPriceCents <= 0) {
      Alert.alert('Preço inválido', 'Informe um preço inicial válido.');
      return;
    }

    setSalvando(true);
    try {
      await atualizarAnuncio(String(id), {
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrls: photos,
        startingPriceCents: bloqueadoPreco ? undefined : startingPriceCents,
        endsAt: bloqueadoPrazo
          ? undefined
          : prazoParaEndsAt(auctionDuration, detalhe.startsAt),
      });

      setToastMessage('Alterações salvas com sucesso!');
      setToastVisible(true);
      setTimeout(() => {
        router.replace(`/my-listings/${id}`);
      }, 1200);
    } catch (e) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function confirmarPausar() {
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
              await pausarLeilao(String(id));
              setToastMessage('Leilão pausado com sucesso.');
              setToastVisible(true);
              await carregar();
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível pausar.');
            } finally {
              setAcaoEmAndamento(false);
            }
          },
        },
      ],
    );
  }

  function confirmarRetomar() {
    Alert.alert('Retomar leilão', 'O anúncio voltará a aparecer nas buscas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Retomar',
        onPress: async () => {
          setAcaoEmAndamento(true);
          try {
            await retomarLeilao(String(id));
            setToastMessage('Leilão retomado com sucesso.');
            setToastVisible(true);
            await carregar();
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível retomar.');
          } finally {
            setAcaoEmAndamento(false);
          }
        },
      },
    ]);
  }

  function confirmarExcluir() {
    const temLances = (detalhe?.bidCount ?? 0) > 0;

    const executar = () => {
      Alert.alert(
        temLances ? 'Confirmar exclusão' : 'Excluir anúncio',
        temLances
          ? 'Esta ação é irreversível. Excluir um leilão com lances pode prejudicar sua reputação como vendedor na plataforma.'
          : 'O anúncio será removido permanentemente. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
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
            },
          },
        ],
      );
    };

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
                  { text: 'Confirmar exclusão', style: 'destructive', onPress: executar },
                ],
              );
            },
          },
        ],
      );
      return;
    }

    executar();
  }

  if (carregando) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Carregando formulário…</Text>
      </View>
    );
  }

  if (!detalhe) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.emptyTitle}>Anúncio não encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.linkText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <AnimatedToast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Editar Anúncio</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {detalhe.title}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}>
        {detalhe.auctionStatus === 'paused' ? (
          <View style={styles.alertBox}>
            <Ionicons name="pause-circle-outline" size={20} color={C.warningText} />
            <Text style={styles.alertText}>
              Leilão pausado — oculto das buscas. Os lances existentes foram preservados.
            </Text>
          </View>
        ) : null}

        {bloqueadoPrazo && detalhe.bidCount > 0 ? (
          <View style={styles.alertBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.warningText} />
            <Text style={styles.alertText}>
              Este lote já recebeu lances. A data de término está bloqueada para proteger os
              licitantes.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mídia do anúncio</Text>
          <Text style={styles.cardHint}>
            {bloqueadoMidia
              ? 'Remoção e envio de fotos bloqueados após o primeiro lance.'
              : 'Exclua fotos antigas e envie novas imagens reais do item.'}
          </Text>
          <ListingPhotoGrid
            photos={photos}
            onPhotosChange={setPhotos}
            disabled={bloqueadoMidia}
          />
        </View>

        <View style={styles.card}>
          <FormField label="Título" styles={styles}>
            <TextInput
              style={styles.input}
              placeholder="Título do leilão"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </FormField>

          <FormField label="Descrição" styles={styles}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição detalhada do item"
              placeholderTextColor={C.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </FormField>

          <FormField label="Categoria" styles={styles}>
            <Pressable
              style={styles.selectBtn}
              onPress={() => setShowCategoryPicker((v) => !v)}>
              <Text style={styles.selectBtnText}>{labelCategoria(category)}</Text>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={C.textMuted}
              />
            </Pressable>
            {showCategoryPicker ? (
              <View style={styles.categoryList}>
                {LISTING_CATEGORIES.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.categoryOption, active && styles.categoryOptionActive]}
                      onPress={() => {
                        setCategory(cat.id);
                        setShowCategoryPicker(false);
                      }}>
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryOptionText,
                          active && styles.categoryOptionTextActive,
                        ]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </FormField>

          <FormField label="Valor Inicial" styles={styles}>
            {bloqueadoPreco ? (
              <>
                <LockedField
                  value={centavosParaInput(detalhe.startingPriceCents)}
                  prefix="R$"
                  styles={styles}
                />
                <Text style={styles.priceLockHint}>
                  Não é possível alterar o valor após o primeiro lance.
                </Text>
              </>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                value={startPrice}
                onChangeText={setStartPrice}
                editable={!formularioBloqueado}
              />
            )}
          </FormField>

          <FormField label="Prazo do leilão" styles={styles}>
            {bloqueadoPrazo ? (
              <LockedField
                value={formatarDataTermino(detalhe.endsAt)}
                hint={`Duração original: ${detalhe.auctionDuration}`}
                styles={styles}
              />
            ) : (
              <>
                <View style={styles.chipRow}>
                  {AUCTION_DURATIONS.map((duration) => {
                    const active = auctionDuration === duration;
                    return (
                      <Pressable
                        key={duration}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setAuctionDuration(duration)}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {duration}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.endsPreview}>
                  Término previsto: {formatarDataTermino(prazoParaEndsAt(auctionDuration, detalhe.startsAt))}
                </Text>
              </>
            )}
          </FormField>
        </View>

        {!formularioBloqueado && (detalhe.canPause || detalhe.canResume || detalhe.canDelete) ? (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Opções do leilão</Text>
            <Text style={styles.actionsHint}>
              Ações administrativas — use com cautela quando houver lances.
            </Text>

            {detalhe.canPause ? (
              <Pressable
                style={[styles.actionBtnOutline, acaoEmAndamento && styles.actionBtnDisabled]}
                onPress={confirmarPausar}
                disabled={acaoEmAndamento || salvando}>
                <Ionicons name="pause-outline" size={18} color={C.textSecondary} />
                <Text style={styles.actionBtnOutlineText}>Pausar Leilão</Text>
              </Pressable>
            ) : null}

            {detalhe.canResume ? (
              <Pressable
                style={[styles.actionBtnOutline, acaoEmAndamento && styles.actionBtnDisabled]}
                onPress={confirmarRetomar}
                disabled={acaoEmAndamento || salvando}>
                <Ionicons name="play-outline" size={18} color={C.accent} />
                <Text style={[styles.actionBtnOutlineText, { color: C.accent }]}>
                  Retomar Leilão
                </Text>
              </Pressable>
            ) : null}

            {detalhe.canDelete ? (
              <Pressable
                style={[styles.actionBtnDanger, acaoEmAndamento && styles.actionBtnDisabled]}
                onPress={confirmarExcluir}
                disabled={acaoEmAndamento || salvando}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text style={styles.actionBtnDangerText}>Excluir Anúncio</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.saveBtn, (salvando || formularioBloqueado) && styles.saveBtnDisabled]}
          onPress={handleSalvar}
          disabled={salvando || formularioBloqueado || acaoEmAndamento}>
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Salvar Alterações</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LockedField({
  value,
  prefix,
  hint,
  styles,
}: {
  value: string;
  prefix?: string;
  hint?: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.lockedWrap}>
      <View style={styles.lockedRow}>
        {prefix ? <Text style={styles.lockedPrefix}>{prefix}</Text> : null}
        <Text style={styles.lockedValue}>{value}</Text>
        <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
      </View>
      {hint ? <Text style={styles.lockedHint}>{hint}</Text> : null}
    </View>
  );
}

function makeStyles(C: typeof LIGHT) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    loadingText: { fontSize: 14, color: C.textMuted },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
    linkText: { fontSize: 14, fontWeight: '700', color: C.accent },
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
    headerSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    content: { padding: 16, gap: 14 },
    alertBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: C.warningSoft,
      borderWidth: 1,
      borderColor: C.warningBorder,
    },
    alertText: { flex: 1, fontSize: 12, lineHeight: 18, color: C.warningText, fontWeight: '600' },
    card: {
      backgroundColor: C.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 18,
      gap: 4,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
    cardHint: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 12 },
    field: { marginTop: 16, gap: 8 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: C.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: C.textPrimary,
    },
    textArea: { minHeight: 120, paddingTop: 14 },
    selectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    selectBtnText: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
    categoryList: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      backgroundColor: C.bg,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    categoryOptionActive: { backgroundColor: C.accentSoft },
    categoryEmoji: { fontSize: 18 },
    categoryOptionText: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
    categoryOptionTextActive: { color: C.accent },
    lockedWrap: {
      backgroundColor: C.lockedBg,
      borderWidth: 1,
      borderColor: C.lockedBorder,
      borderRadius: 14,
      padding: 14,
      gap: 6,
    },
    lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lockedPrefix: { fontSize: 14, fontWeight: '700', color: C.textMuted },
    lockedValue: { flex: 1, fontSize: 15, fontWeight: '700', color: C.textSecondary },
    lockedHint: { fontSize: 11, color: C.textMuted },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bg,
    },
    chipActive: {
      backgroundColor: C.accentSoft,
      borderColor: C.accentBorder,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: C.accent, fontWeight: '800' },
    endsPreview: { fontSize: 11, color: C.textMuted, marginTop: 8 },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: C.white,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.accent,
      paddingVertical: 16,
      borderRadius: 16,
    },
    saveBtnDisabled: { opacity: 0.65 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    priceLockHint: {
      fontSize: 12,
      color: C.warningText,
      fontWeight: '600',
      lineHeight: 18,
      marginTop: 6,
    },
    actionsCard: {
      backgroundColor: C.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 18,
      gap: 10,
    },
    actionsTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
    actionsHint: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 4 },
    actionBtnOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bg,
    },
    actionBtnOutlineText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
    actionBtnDanger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#FECACA',
      backgroundColor: '#FEF2F2',
    },
    actionBtnDangerText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
    actionBtnDisabled: { opacity: 0.5 },
  });
}
