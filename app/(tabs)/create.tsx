import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConservationStateField } from '@/components/listing/ConservationStateField';
import {
  ListingPickerBackdrop,
  type ListingBackdropIntensity,
} from '@/components/listing/ListingPickerBackdrop';
import { ListingCategoryPicker } from '@/components/listing/ListingCategoryPicker';
import { ElectronicsTypePicker } from '@/components/listing/ElectronicsTypePicker';
import { ListingElectronicsTechSheetForm } from '@/components/listing/ListingElectronicsTechSheetForm';
import { ListingPropertyTechSheetForm } from '@/components/listing/ListingPropertyTechSheetForm';
import { ListingVehicleTechSheetForm } from '@/components/listing/ListingVehicleTechSheetForm';
import {
  buildListingPhotoUrls,
  ListingCoverPhotosSection,
} from '@/components/listing/ListingCoverPhotosSection';
import { ListingOwnershipDeclaration } from '@/components/listing/ListingOwnershipDeclaration';
import { PromotionBoostSection } from '@/components/listing/PromotionBoostSection';
import { PolicySectionsScroll } from '@/components/policies/PolicySectionsScroll';
import { useAppPolicies } from '@/components/policies/useAppPolicy';
import { labelConservationState, type ConservationState } from '@/src/constants/listingForm';
import { NF_ELECTRONICS_HINT } from '@/src/constants/listingForm';
import {
  getElectronicType,
  getIdentificationHint,
  labelElectronicType,
  validateElectronicsIdentification,
  type ElectronicTypeId,
} from '@/src/constants/electronicsCatalog';
import {
  requiresElectronicsTechSheet,
  type ElectronicsTechSheetValues,
} from '@/src/constants/electronicsTechSheet';
import type { PropertyTechSheetValues } from '@/src/constants/propertyTechSheet';
import type { VehicleTechSheetValues } from '@/src/constants/vehicleTechSheet';
import { DEFAULT_PROMOTION_PLANS } from '@/src/constants/promotionPlans';
import {
  getListingPublishBlockReason,
  getListingStep3BlockReason,
  getListingStep4BlockReason,
  isListingPriceInvalid,
  type ListingCategoryId,
  type ListingFormSnapshot,
} from '@/src/lib/listingPublishValidation';
import {
  buildPromotionCheckout,
  formatPromotionPrice,
} from '@/src/lib/promotionFormatters';
import { validateSerialOrImei } from '@/src/lib/serialImeiValidation';
import { publicarNovoLeilao } from '@/src/services/listingPublish';
import { previewGarantiaVendedor } from '@/src/services/vendorCollateral';
import type { VendorCollateralPreview } from '@/src/constants/payments';
import { lightColors } from '@/src/theme/lightTokens';
import type { AuctionDuration } from '@/src/lib/listingCategories';
import type { ListingPromotionSelection } from '@/src/types/promotions';
import { labelListingCategory } from '@/src/constants/listingCategoriesUi';
import { getListingCopyPlaceholders } from '@/src/constants/listingPlaceholders';
import { VENDOR_POLICY_DISPLAY_ORDER } from '@/src/types/appPolicy';
import { KycRequiredGate } from '@/components/kyc/KycRequiredGate';
import { KycRequiredModal } from '@/components/kyc/KycRequiredModal';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { useKyc } from '@/src/store/kycContext';
import type { StatusVerificacao } from '@/src/types/kyc';

type ListingCategory =
  | 'produtos_gerais'
  | 'veiculos'
  | 'imoveis'
  | 'eletronicos'
  | 'colecionaveis'
  | 'outros';

const MAX_PHOTOS = 10;
const DEFAULT_PROFILE_CEP = '01310-100';

const AUCTION_DURATIONS = ['1 hora', '6 horas', '24 horas', '3 dias', '7 dias'];
const TOTAL_STEPS = 5;

function listingBackdropIntensity(step: number): ListingBackdropIntensity {
  if (step === 2) return 'strong';
  if (step === 1 || step === 5) return 'light';
  return 'subtle';
}

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  error: '#EF4444',
  errorSoft: '#FEF2F2',
};

function parsePriceInput(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) ? 0 : val;
}

function isShippingRequired(category: ListingCategory): boolean {
  return category !== 'veiculos' && category !== 'imoveis';
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function CadastrarLeilaoScreen() {
  const insets = useSafeAreaInsets();
  const { podePublicarAnuncio, perfil, carregando: carregandoKyc, atualizar: atualizarKyc } = useKyc();

  const [userId, setUserId] = useState<string | null>(null);
  const [checandoSessao, setChecandoSessao] = useState(true);
  const [kycModalVisible, setKycModalVisible] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMarketValue, setEstimatedMarketValue] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('24 horas');
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [nfAccessKey, setNfAccessKey] = useState('');
  const [nfPdfUri, setNfPdfUri] = useState<string | null>(null);

  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [originCep, setOriginCep] = useState(DEFAULT_PROFILE_CEP);

  const [vehicleTechSheet, setVehicleTechSheet] = useState<VehicleTechSheetValues>({});
  const [propertyTechSheet, setPropertyTechSheet] = useState<PropertyTechSheetValues>({});

  const [conservationState, setConservationState] = useState<ConservationState | null>(null);
  const [serialImei, setSerialImei] = useState('');
  const [optionalSerial, setOptionalSerial] = useState('');
  const [ownershipDeclarationAccepted, setOwnershipDeclarationAccepted] = useState(false);
  const [showValidationHints, setShowValidationHints] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const [promotionSelection, setPromotionSelection] = useState<ListingPromotionSelection>({
    featured: false,
    featuredPlus: false,
  });
  const [electronicTypeId, setElectronicTypeId] = useState<ElectronicTypeId | null>(null);
  const [electronicsTechSheet, setElectronicsTechSheet] = useState<ElectronicsTechSheetValues>({});
  const [showElectronicsPicker, setShowElectronicsPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        setChecandoSessao(true);
        await atualizarKyc();
        const id = await obterIdUsuarioAtual();
        if (ativo) {
          setUserId(id);
          setChecandoSessao(false);
        }
      })();
      return () => {
        ativo = false;
      };
    }, [atualizarKyc]),
  );

  const statusKyc: StatusVerificacao = perfil?.statusVerificacao ?? 'pendente';
  const bloqueadoPorKyc = Boolean(userId && !podePublicarAnuncio);

  function handleCategorySelect(category: ListingCategory) {
    if (category === 'eletronicos') {
      setShowElectronicsPicker(true);
      return;
    }
    setElectronicTypeId(null);
    setElectronicsTechSheet({});
    setVehicleTechSheet({});
    setPropertyTechSheet({});
    setSelectedCategory(category);
    setSerialImei('');
    setOptionalSerial('');
    setCurrentStep(3);
  }

  function handleElectronicTypeSelect(typeId: ElectronicTypeId) {
    setElectronicTypeId(typeId);
    setElectronicsTechSheet({});
    setSelectedCategory('eletronicos');
    setSerialImei('');
    setShowElectronicsPicker(false);
    setCurrentStep(3);
  }

  function handleBack() {
    if (currentStep === 2 && showElectronicsPicker) {
      setShowElectronicsPicker(false);
      return;
    }
    if (currentStep === 3 && selectedCategory === 'eletronicos') {
      setCurrentStep(2);
      setShowElectronicsPicker(true);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }

  function buildFormSnapshot(): ListingFormSnapshot | null {
    if (!selectedCategory) return null;
    return {
      category: selectedCategory as ListingCategoryId,
      title,
      description,
      photosCount: coverPhoto ? 1 : 0,
      estimatedMarketValue,
      startPrice,
      conservationState,
      originCep,
      serialImei,
      electronicTypeId,
      electronicsTechSheet,
      vehicleTechSheet,
      propertyTechSheet,
      optionalSerial,
      ownershipDeclarationAccepted,
      showShipping: isShippingRequired(selectedCategory),
      weightKg,
      heightCm,
      widthCm,
      lengthCm,
    };
  }

  function tryAdvanceFromStep3() {
    const snap = buildFormSnapshot();
    if (!snap) return;
    const reason = getListingStep3BlockReason(snap);
    if (reason) {
      setShowValidationHints(true);
      Alert.alert('Complete o item', reason);
      return;
    }
    setShowValidationHints(false);
    setCurrentStep(4);
  }

  function tryAdvanceFromStep4() {
    const snap = buildFormSnapshot();
    if (!snap) return;
    const reason = getListingStep4BlockReason(snap);
    if (reason) {
      setShowValidationHints(true);
      Alert.alert('Complete valores e frete', reason);
      return;
    }
    setShowValidationHints(false);
    setCurrentStep(5);
  }

  async function handlePublish() {
    if (!selectedCategory || publicando) return;

    if (!userId) {
      Alert.alert('Login necessário', 'Entre na sua conta para publicar um leilão.');
      return;
    }
    if (!podePublicarAnuncio) {
      setKycModalVisible(true);
      return;
    }

    setShowValidationHints(true);

    const blockReason = getListingPublishBlockReason({
      category: selectedCategory as ListingCategoryId,
      title,
      description,
      photosCount: coverPhoto ? 1 : 0,
      estimatedMarketValue,
      startPrice,
      conservationState,
      originCep,
      serialImei,
      electronicTypeId,
      electronicsTechSheet,
      vehicleTechSheet,
      propertyTechSheet,
      optionalSerial,
      ownershipDeclarationAccepted,
      showShipping: isShippingRequired(selectedCategory),
      weightKg,
      heightCm,
      widthCm,
      lengthCm,
    });

    if (blockReason) {
      Alert.alert('Não foi possível publicar', blockReason);
      return;
    }

    const serialCheck =
      selectedCategory === 'eletronicos'
        ? validateElectronicsIdentification(electronicTypeId, serialImei)
        : validateSerialOrImei(serialImei);

    setPublicando(true);
    const resultado = await publicarNovoLeilao({
      category: selectedCategory,
      title,
      description,
      photos: buildListingPhotoUrls(coverPhoto, galleryPhotos),
      estimatedMarketValue,
      startPrice,
      auctionDuration: auctionDuration as AuctionDuration,
      conservationState: conservationState!,
      originCep,
      serialImei,
      serialImeiKind: selectedCategory === 'eletronicos' ? serialCheck.kind : null,
      electronicTypeId: selectedCategory === 'eletronicos' ? electronicTypeId : null,
      electronicTypeLabel: labelElectronicType(electronicTypeId),
      electronicsTechSheet,
      vehicleTechSheet,
      propertyTechSheet,
      optionalSerial,
      nfAccessKey,
      nfPdfAttached: !!nfPdfUri,
      ownershipDeclarationAccepted,
      promotionSelection,
      weightKg,
      heightCm,
      widthCm,
      lengthCm,
    });
    setPublicando(false);

    if (!resultado.ok) {
      Alert.alert('Não foi possível publicar', resultado.erro ?? 'Erro desconhecido.');
      return;
    }

    const checkout = buildPromotionCheckout(DEFAULT_PROMOTION_PLANS, promotionSelection);
    const extrasCents = checkout.totalCents;

    const conservLabel = labelConservationState(conservationState);

    Alert.alert(
      'Anúncio enviado!',
      `Rascunho #${resultado.auctionId?.slice(0, 8)} salvo. Passará por análise antes de ir ao ar.\n\nConservação: ${conservLabel}\nCEP origem: ${originCep}${
        extrasCents > 0
          ? `\n\nDebitado da carteira: ${formatPromotionPrice(resultado.totalChargedCents ?? extrasCents)}`
          : ''
      }${resultado.fonte === 'mock' ? '\n\n(Modo demonstração — conecte o Supabase para gravar na nuvem.)' : ''}`,
    );
  }

  const baseCategoryLabel = labelListingCategory(selectedCategory);
  const electronicLabel = labelElectronicType(electronicTypeId);
  const categoryLabel =
    selectedCategory === 'eletronicos' && electronicLabel
      ? `Eletrônicos · ${electronicLabel}`
      : baseCategoryLabel;

  const backdropIntensity = listingBackdropIntensity(currentStep);
  const usePickerGlassScroll = currentStep === 2;
  const glassSurface = currentStep !== 2;

  if (checandoSessao || carregandoKyc) {
    return (
      <View style={[styles.root, styles.gateRoot, { paddingTop: insets.top + 12 }]}>
        <KycRequiredGate carregando />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.root, styles.gateRoot, { paddingTop: insets.top + 12 }]}>
        <KycRequiredGate motivo="login" />
      </View>
    );
  }

  if (bloqueadoPorKyc) {
    return (
      <View style={[styles.root, styles.gateRoot, { paddingTop: insets.top + 12 }]}>
        <KycRequiredGate motivo="publicar" status={statusKyc} />
        <KycRequiredModal
          visible={kycModalVisible}
          onClose={() => setKycModalVisible(false)}
          status={statusKyc}
          motivo="publicar"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.rootInner, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.topBar, styles.topBarOnBackdrop]}>
          {currentStep > 1 ? (
            <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={C.textPrimary} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
          <View style={styles.stepIndicator}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  step === currentStep && styles.stepDotActive,
                  step < currentStep && styles.stepDotDone,
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>Etapa {currentStep}/{TOTAL_STEPS}</Text>
        </View>

        <View style={styles.contentArea}>
          <ListingPickerBackdrop intensity={backdropIntensity} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollOnBackdrop}
            contentContainerStyle={[
              styles.scrollContent,
              usePickerGlassScroll && styles.scrollContentGlass,
              { paddingBottom: insets.bottom + 48 },
            ]}>
          {currentStep === 1 ? (
            <StepWelcome
              glassSurface={glassSurface}
              termsAccepted={termsAccepted}
              onToggleTerms={() => setTermsAccepted((v) => !v)}
              onAdvance={() => setCurrentStep(2)}
            />
          ) : null}

          {currentStep === 2 && showElectronicsPicker ? (
            <ElectronicsTypePicker
              onSelect={handleElectronicTypeSelect}
              onBack={() => setShowElectronicsPicker(false)}
            />
          ) : null}

          {currentStep === 2 && !showElectronicsPicker ? (
            <View style={styles.stepContainer}>
              <ListingCategoryPicker onSelect={handleCategorySelect} />
            </View>
          ) : null}

          {currentStep === 3 && selectedCategory ? (
            <StepFormItem
              glassSurface={glassSurface}
              category={selectedCategory}
              categoryLabel={categoryLabel}
              electronicTypeId={electronicTypeId}
              electronicsTechSheet={electronicsTechSheet}
              onElectronicsTechSheetChange={setElectronicsTechSheet}
              vehicleTechSheet={vehicleTechSheet}
              onVehicleTechSheetChange={setVehicleTechSheet}
              propertyTechSheet={propertyTechSheet}
              onPropertyTechSheetChange={setPropertyTechSheet}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              coverPhoto={coverPhoto}
              onCoverPhotoChange={setCoverPhoto}
              galleryPhotos={galleryPhotos}
              onGalleryPhotosChange={setGalleryPhotos}
              conservationState={conservationState}
              onConservationStateChange={setConservationState}
              showValidationHints={showValidationHints}
              onContinue={tryAdvanceFromStep3}
            />
          ) : null}

          {currentStep === 4 && selectedCategory ? (
            <StepFormValues
              glassSurface={glassSurface}
              category={selectedCategory}
              categoryLabel={categoryLabel}
              electronicTypeId={electronicTypeId}
              estimatedMarketValue={estimatedMarketValue}
              onEstimatedMarketValueChange={setEstimatedMarketValue}
              startPrice={startPrice}
              onStartPriceChange={setStartPrice}
              serialImei={serialImei}
              onSerialImeiChange={setSerialImei}
              optionalSerial={optionalSerial}
              onOptionalSerialChange={setOptionalSerial}
              nfAccessKey={nfAccessKey}
              onNfAccessKeyChange={setNfAccessKey}
              nfPdfUri={nfPdfUri}
              onNfPdfUriChange={setNfPdfUri}
              originCep={originCep}
              onOriginCepChange={setOriginCep}
              weightKg={weightKg}
              onWeightKgChange={setWeightKg}
              heightCm={heightCm}
              onHeightCmChange={setHeightCm}
              widthCm={widthCm}
              onWidthCmChange={setWidthCm}
              lengthCm={lengthCm}
              onLengthCmChange={setLengthCm}
              showValidationHints={showValidationHints}
              onContinue={tryAdvanceFromStep4}
            />
          ) : null}

          {currentStep === 5 && selectedCategory ? (
            <StepFormFinalize
              glassSurface={glassSurface}
              categoryLabel={categoryLabel}
              estimatedMarketValue={estimatedMarketValue}
              auctionDuration={auctionDuration}
              onAuctionDurationChange={setAuctionDuration}
              promotionSelection={promotionSelection}
              onPromotionSelectionChange={setPromotionSelection}
              ownershipDeclarationAccepted={ownershipDeclarationAccepted}
              onOwnershipDeclarationAcceptedChange={setOwnershipDeclarationAccepted}
              showValidationHints={showValidationHints}
              onPublish={handlePublish}
              publicando={publicando}
              publishBlockReason={
                buildFormSnapshot()
                  ? getListingPublishBlockReason(buildFormSnapshot()!)
                  : 'Dados incompletos.'
              }
            />
          ) : null}
          </ScrollView>
        </View>
      </View>

      <KycRequiredModal
        visible={kycModalVisible}
        onClose={() => setKycModalVisible(false)}
        status={statusKyc}
        motivo="publicar"
      />
    </KeyboardAvoidingView>
  );
}

function StepWelcome({
  glassSurface,
  termsAccepted,
  onToggleTerms,
  onAdvance,
}: {
  glassSurface?: boolean;
  termsAccepted: boolean;
  onToggleTerms: () => void;
  onAdvance: () => void;
}) {
  const { policies, carregando, erro } = useAppPolicies(VENDOR_POLICY_DISPLAY_ORDER);
  const policiesProntas = policies.length > 0 && !carregando;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.welcomeEmoji}>👋</Text>
      <Text style={styles.welcomeTitle}>Bem-vindo ao cadastro!</Text>
      <Text style={styles.welcomeSubtitle}>
        Antes de anunciar seu item, leia atentamente as regras e políticas da plataforma.
      </Text>

      <PolicySectionsScroll
        policies={policies}
        carregando={carregando}
        erro={erro}
        maxHeight={280}
        accentColor={C.accent}
        cardStyle={glassSurface ? styles.surfaceGlass : undefined}
      />

      <Pressable
        style={[styles.termsRow, glassSurface && styles.termsRowGlass]}
        onPress={onToggleTerms}
        disabled={!policiesProntas}>
        <Ionicons
          name={termsAccepted ? 'checkbox' : 'square-outline'}
          size={22}
          color={termsAccepted ? C.accent : C.textMuted}
        />
        <Text style={styles.termsText}>Li e aceito os termos</Text>
      </Pressable>

      <Pressable
        style={[styles.primaryBtn, (!termsAccepted || !policiesProntas) && styles.primaryBtnDisabled]}
        onPress={onAdvance}
        disabled={!termsAccepted || !policiesProntas}>
        <Text style={styles.primaryBtnText}>Avançar</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

function FormStepHeader({
  title,
  subtitle,
  categoryLabel,
}: {
  title: string;
  subtitle: string;
  categoryLabel: string;
}) {
  return (
    <View style={styles.formHeader}>
      <View style={styles.formHeaderText}>
        <Text style={styles.formTitle}>{title}</Text>
        <Text style={styles.formSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
      </View>
    </View>
  );
}

function FormCard({
  title,
  children,
  glass,
}: {
  title: string;
  children: ReactNode;
  glass?: boolean;
}) {
  return (
    <View style={[styles.formCard, glass && styles.surfaceGlass]}>
      <Text style={styles.formCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StepFormItem({
  glassSurface,
  category,
  categoryLabel,
  electronicTypeId,
  electronicsTechSheet,
  onElectronicsTechSheetChange,
  vehicleTechSheet,
  onVehicleTechSheetChange,
  propertyTechSheet,
  onPropertyTechSheetChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  coverPhoto,
  onCoverPhotoChange,
  galleryPhotos,
  onGalleryPhotosChange,
  conservationState,
  onConservationStateChange,
  showValidationHints,
  onContinue,
}: {
  category: ListingCategory;
  categoryLabel: string;
  electronicTypeId: ElectronicTypeId | null;
  electronicsTechSheet: ElectronicsTechSheetValues;
  onElectronicsTechSheetChange: (v: ElectronicsTechSheetValues) => void;
  vehicleTechSheet: VehicleTechSheetValues;
  onVehicleTechSheetChange: (v: VehicleTechSheetValues) => void;
  propertyTechSheet: PropertyTechSheetValues;
  onPropertyTechSheetChange: (v: PropertyTechSheetValues) => void;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  coverPhoto: string | null;
  onCoverPhotoChange: (uri: string | null) => void;
  galleryPhotos: string[];
  onGalleryPhotosChange: (uris: string[]) => void;
  conservationState: ConservationState | null;
  onConservationStateChange: (v: ConservationState) => void;
  showValidationHints: boolean;
  onContinue: () => void;
  glassSurface?: boolean;
}) {
  const copyPlaceholders = getListingCopyPlaceholders(category);

  return (
    <View style={styles.stepContainer}>
      <FormStepHeader
        title="Sobre o item"
        subtitle="Fotos, descrição e estado de conservação"
        categoryLabel={categoryLabel}
      />

      <ListingCoverPhotosSection
        coverPhoto={coverPhoto}
        onCoverPhotoChange={onCoverPhotoChange}
        galleryPhotos={galleryPhotos}
        onGalleryPhotosChange={onGalleryPhotosChange}
        maxPhotos={MAX_PHOTOS}
        listingCategory={category}
      />

      <FormCard glass={glassSurface} title="Informações do anúncio">
        <FormField label="Título do leilão">
          <TextInput
            style={[styles.input, glassSurface && styles.inputGlass]}
            placeholder={copyPlaceholders.title}
            placeholderTextColor={C.textMuted}
            value={title}
            onChangeText={onTitleChange}
          />
        </FormField>

        <FormField label="Descrição detalhada">
          <TextInput
            style={[styles.input, styles.textArea, glassSurface && styles.inputGlass]}
            placeholder={copyPlaceholders.description}
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </FormField>

        <ConservationStateField
          value={conservationState}
          onChange={onConservationStateChange}
          showError={showValidationHints}
        />
      </FormCard>

      {electronicTypeId && requiresElectronicsTechSheet(electronicTypeId) ? (
        <FormCard glass={glassSurface} title="Ficha técnica — Eletrônicos">
          <ListingElectronicsTechSheetForm
            typeId={electronicTypeId}
            values={electronicsTechSheet}
            onChange={onElectronicsTechSheetChange}
            showErrors={showValidationHints}
          />
        </FormCard>
      ) : null}

      {category === 'veiculos' ? (
        <FormCard glass={glassSurface} title="Ficha técnica — Veículo">
          <ListingVehicleTechSheetForm
            values={vehicleTechSheet}
            onChange={onVehicleTechSheetChange}
            showErrors={showValidationHints}
          />
        </FormCard>
      ) : null}

      {category === 'imoveis' ? (
        <FormCard glass={glassSurface} title="Ficha técnica — Imóvel">
          <ListingPropertyTechSheetForm
            values={propertyTechSheet}
            onChange={onPropertyTechSheetChange}
            showErrors={showValidationHints}
          />
        </FormCard>
      ) : null}

      <Pressable style={styles.primaryBtn} onPress={onContinue}>
        <Text style={styles.primaryBtnText}>Continuar</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

function StepFormValues({
  glassSurface,
  category,
  categoryLabel,
  electronicTypeId,
  estimatedMarketValue,
  onEstimatedMarketValueChange,
  startPrice,
  onStartPriceChange,
  serialImei,
  onSerialImeiChange,
  optionalSerial,
  onOptionalSerialChange,
  nfAccessKey,
  onNfAccessKeyChange,
  nfPdfUri,
  onNfPdfUriChange,
  originCep,
  onOriginCepChange,
  weightKg,
  onWeightKgChange,
  heightCm,
  onHeightCmChange,
  widthCm,
  onWidthCmChange,
  lengthCm,
  onLengthCmChange,
  showValidationHints,
  onContinue,
}: {
  category: ListingCategory;
  categoryLabel: string;
  electronicTypeId: ElectronicTypeId | null;
  estimatedMarketValue: string;
  onEstimatedMarketValueChange: (v: string) => void;
  startPrice: string;
  onStartPriceChange: (v: string) => void;
  serialImei: string;
  onSerialImeiChange: (v: string) => void;
  optionalSerial: string;
  onOptionalSerialChange: (v: string) => void;
  nfAccessKey: string;
  onNfAccessKeyChange: (v: string) => void;
  nfPdfUri: string | null;
  onNfPdfUriChange: (v: string | null) => void;
  originCep: string;
  onOriginCepChange: (v: string) => void;
  weightKg: string;
  onWeightKgChange: (v: string) => void;
  heightCm: string;
  onHeightCmChange: (v: string) => void;
  widthCm: string;
  onWidthCmChange: (v: string) => void;
  lengthCm: string;
  onLengthCmChange: (v: string) => void;
  showValidationHints: boolean;
  onContinue: () => void;
  glassSurface?: boolean;
}) {
  const showOptionalSerial =
    category === 'produtos_gerais' || category === 'colecionaveis';
  const showShipping = isShippingRequired(category);
  const isElectronics = category === 'eletronicos';
  const electronicType = getElectronicType(electronicTypeId);
  const priceInvalid = isListingPriceInvalid(estimatedMarketValue, startPrice);
  const nfKeyValid = nfAccessKey.replace(/\D/g, '').length === 44;
  const serialCheck = isElectronics
    ? validateElectronicsIdentification(electronicTypeId, serialImei)
    : validateSerialOrImei(serialImei);
  const requiresImei = electronicType?.identification === 'imei_required';
  const idFieldLabel = requiresImei ? 'IMEI (obrigatório)' : 'Número de série (obrigatório)';
  const idPlaceholder = requiresImei
    ? '15 dígitos do IMEI'
    : 'Série na etiqueta ou nota fiscal';
  const cepValid = originCep.replace(/\D/g, '').length === 8;

  async function attachNfPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onNfPdfUriChange(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.stepContainer}>
      <FormStepHeader
        title="Valores e frete"
        subtitle="Preços, documentação e logística de envio"
        categoryLabel={categoryLabel}
      />

      <FormCard glass={glassSurface} title="Valores do leilão">
        <FormField label="Valor estimado de mercado">
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            value={estimatedMarketValue}
            onChangeText={onEstimatedMarketValueChange}
          />
        </FormField>

        <FormField label="Preço inicial do leilão">
          <TextInput
            style={[styles.input, priceInvalid && styles.inputError]}
            placeholder="0,00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            value={startPrice}
            onChangeText={onStartPriceChange}
          />
          {priceInvalid ? (
            <Text style={styles.errorText}>
              O preço inicial deve ser menor que o valor estimado (não pode ser igual).
            </Text>
          ) : null}
        </FormField>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={18} color={C.accent} />
          <Text style={styles.warningText}>
            Atenção: Você assume o risco. Se o leilão atingir um valor abaixo do estimado, o item
            será vendido pelo maior lance gerado.
          </Text>
        </View>
      </FormCard>

      {isElectronics && electronicType ? (
        <FormCard glass={glassSurface} title={`Identificação — ${electronicType.label}`}>
          <Text style={styles.hintText}>
            {getIdentificationHint(electronicType.identification)}
          </Text>
          <FormField label={idFieldLabel}>
            <TextInput
              style={[
                styles.input,
                serialImei.length > 0 && !serialCheck.valid && styles.inputError,
              ]}
              placeholder={idPlaceholder}
              placeholderTextColor={C.textMuted}
              value={serialImei}
              onChangeText={onSerialImeiChange}
              autoCapitalize="characters"
              keyboardType={requiresImei ? 'number-pad' : 'default'}
            />
            {serialImei.length > 0 && !serialCheck.valid ? (
              <Text style={styles.errorText}>{serialCheck.message}</Text>
            ) : serialCheck.valid ? (
              <Text style={styles.hintText}>
                {serialCheck.kind === 'imei' ? 'IMEI válido (Luhn).' : 'Número de série aceito.'}
              </Text>
            ) : showValidationHints ? (
              <Text style={styles.errorText}>Campo obrigatório.</Text>
            ) : null}
          </FormField>
        </FormCard>
      ) : null}

      {showOptionalSerial ? (
        <FormCard glass={glassSurface} title="Identificação opcional">
          <FormField label="Número de série (opcional)">
            <TextInput
              style={styles.input}
              placeholder="Identificação do item, se houver"
              placeholderTextColor={C.textMuted}
              value={optionalSerial}
              onChangeText={onOptionalSerialChange}
              autoCapitalize="characters"
            />
          </FormField>
        </FormCard>
      ) : null}

      <FormCard glass={glassSurface} title="Nota fiscal de compra (opcional)">
        {isElectronics ? (
          <Text style={styles.nfElectronicsHint}>{NF_ELECTRONICS_HINT}</Text>
        ) : null}
        <FormField label="Chave de Acesso NF-e (44 dígitos)">
          <TextInput
            style={[styles.input, nfAccessKey.length > 0 && !nfKeyValid && styles.inputError]}
            placeholder="35260123456789012345678901234567890123456"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            maxLength={44}
            value={nfAccessKey}
            onChangeText={onNfAccessKeyChange}
          />
          {nfAccessKey.length > 0 && !nfKeyValid ? (
            <Text style={styles.errorText}>A chave deve conter exatamente 44 dígitos.</Text>
          ) : null}
        </FormField>
        <Text style={styles.orDivider}>— ou —</Text>
        <Pressable style={styles.secondaryBtn} onPress={attachNfPdf}>
          <Ionicons name="document-attach-outline" size={18} color={C.accent} />
          <Text style={styles.secondaryBtnText}>
            {nfPdfUri ? 'PDF da NF-e anexado ✓' : 'Anexar PDF da NF-e'}
          </Text>
        </Pressable>
        <Text style={styles.hintText}>
          Responsabilidade de emissão da NF do produto é do vendedor. O Levou emite NFS-e apenas
          sobre taxas da plataforma.
        </Text>
      </FormCard>

      <FormCard glass={glassSurface} title="Logística de frete">
        <FormField label="CEP de origem (obrigatório)">
          <TextInput
            style={[styles.input, showValidationHints && !cepValid && styles.inputError]}
            placeholder="00000-000"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            maxLength={9}
            value={originCep}
            onChangeText={(text) => onOriginCepChange(formatCep(text))}
          />
          {showValidationHints && !cepValid ? (
            <Text style={styles.errorText}>Informe um CEP válido com 8 dígitos.</Text>
          ) : (
            <Text style={styles.hintText}>
              Usado no cálculo logístico do envio para todas as categorias.
            </Text>
          )}
        </FormField>

        {showShipping ? (
          <>
          <FormField label="Peso (kg)">
            <TextInput
              style={styles.input}
              placeholder="Ex: 1,5"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={onWeightKgChange}
            />
          </FormField>
          <Text style={styles.dimGroupLabel}>Dimensões do Pacote (cm)</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputThird}>
              <FormField label="Altura">
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  value={heightCm}
                  onChangeText={onHeightCmChange}
                />
              </FormField>
            </View>
            <View style={styles.inputThird}>
              <FormField label="Largura">
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  value={widthCm}
                  onChangeText={onWidthCmChange}
                />
              </FormField>
            </View>
            <View style={styles.inputThird}>
              <FormField label="Comprimento">
                <TextInput
                  style={styles.input}
                  placeholder="40"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  value={lengthCm}
                  onChangeText={onLengthCmChange}
                />
              </FormField>
            </View>
          </View>
          </>
        ) : (
          <Text style={styles.hintText}>
            Categoria sem cubagem de pacote — apenas o CEP de origem é necessário.
          </Text>
        )}
      </FormCard>

      <Pressable style={styles.primaryBtn} onPress={onContinue}>
        <Text style={styles.primaryBtnText}>Continuar</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

function StepFormFinalize({
  glassSurface,
  categoryLabel,
  estimatedMarketValue,
  auctionDuration,
  onAuctionDurationChange,
  promotionSelection,
  onPromotionSelectionChange,
  ownershipDeclarationAccepted,
  onOwnershipDeclarationAcceptedChange,
  showValidationHints,
  onPublish,
  publicando,
  publishBlockReason,
}: {
  categoryLabel: string;
  estimatedMarketValue: string;
  auctionDuration: string;
  onAuctionDurationChange: (v: string) => void;
  promotionSelection: ListingPromotionSelection;
  onPromotionSelectionChange: (v: ListingPromotionSelection) => void;
  ownershipDeclarationAccepted: boolean;
  onOwnershipDeclarationAcceptedChange: (v: boolean) => void;
  showValidationHints: boolean;
  onPublish: () => void;
  publicando: boolean;
  publishBlockReason: string | null;
  glassSurface?: boolean;
}) {
  const checkout = buildPromotionCheckout(DEFAULT_PROMOTION_PLANS, promotionSelection);
  const totalCents = checkout.totalCents;
  const publishDisabled = publishBlockReason != null || publicando;
  const [collateralPreview, setCollateralPreview] = useState<VendorCollateralPreview | null>(null);

  useEffect(() => {
    const estimatedCents = Math.round(parsePriceInput(estimatedMarketValue) * 100);
    if (estimatedCents <= 0) {
      setCollateralPreview(null);
      return;
    }

    let cancelled = false;
    void previewGarantiaVendedor(estimatedCents).then((preview) => {
      if (!cancelled) setCollateralPreview(preview);
    });

    return () => {
      cancelled = true;
    };
  }, [estimatedMarketValue]);

  return (
    <View style={styles.stepContainer}>
      <FormStepHeader
        title="Revisão e publicação"
        subtitle="Duração, destaques e aceite do termo jurídico"
        categoryLabel={categoryLabel}
      />

      <FormCard glass={glassSurface} title="Tempo de leilão">
        <View style={styles.chipRow}>
          {AUCTION_DURATIONS.map((duration) => {
            const active = auctionDuration === duration;
            return (
              <Pressable
                key={duration}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onAuctionDurationChange(duration)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{duration}</Text>
              </Pressable>
            );
          })}
        </View>
      </FormCard>

      <PromotionBoostSection
        selection={promotionSelection}
        onSelectionChange={onPromotionSelectionChange}
        glassSurface={glassSurface}
      />

      <View style={[styles.publishTotalCard, glassSurface && styles.publishTotalCardGlass]}>
        <Text style={styles.publishTotalLabel}>Total estimado ao publicar</Text>
        <Text style={styles.publishTotalValue}>{formatPromotionPrice(totalCents)}</Text>
        <Text style={styles.publishTotalHint}>
          Inclui impulsionamentos selecionados. Débito na carteira.
        </Text>
      </View>

      {collateralPreview ? (
        <View style={[styles.publishTotalCard, glassSurface && styles.publishTotalCardGlass]}>
          <Text style={styles.publishTotalLabel}>Garantia do vendedor (retida)</Text>
          <Text style={styles.publishTotalValue}>
            {formatPromotionPrice(collateralPreview.holdCents)}
          </Text>
          <Text style={styles.publishTotalHint}>
            {collateralPreview.newVendorMultiplier > 1
              ? 'Vendedor novo: +50% de garantia. '
              : ''}
            Saldo disponível: {formatPromotionPrice(collateralPreview.availableBalanceCents)}.
            {' '}
            {collateralPreview.sufficient
              ? 'Fica em garantia até o comprador confirmar ou a disputa encerrar. Não reduz seu saldo total — só o saque e novos anúncios usam o que está livre.'
              : 'Saldo livre insuficiente — recarregue a carteira antes de publicar.'}
          </Text>
        </View>
      ) : null}

      <ListingOwnershipDeclaration
        checked={ownershipDeclarationAccepted}
        onToggle={() => onOwnershipDeclarationAcceptedChange(!ownershipDeclarationAccepted)}
        showError={showValidationHints}
      />

      <Pressable
        style={[styles.primaryBtn, publishDisabled && styles.primaryBtnDisabled]}
        onPress={() => {
          if (publishDisabled) {
            if (publishBlockReason) {
              Alert.alert('Revise o cadastro', publishBlockReason);
            }
            return;
          }
          void onPublish();
        }}>
        {publicando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Text style={styles.primaryBtnText}>Publicar leilão</Text>
            <Ionicons name="rocket-outline" size={18} color="#FFF" />
          </>
        )}
      </Pressable>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  gateRoot: { justifyContent: 'center' },
  rootInner: { flex: 1 },
  contentArea: { flex: 1, position: 'relative' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 2,
    backgroundColor: C.bg,
  },
  topBarOnBackdrop: {
    backgroundColor: 'rgba(250, 250, 254, 0.9)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
    minWidth: 80,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  backBtnPlaceholder: { minWidth: 80 },
  stepIndicator: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: { width: 22, backgroundColor: C.accent },
  stepDotDone: { backgroundColor: C.accent, opacity: 0.45 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, minWidth: 64, textAlign: 'right' },
  scrollContent: { paddingHorizontal: 20, flexGrow: 1 },
  scrollOnBackdrop: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
  scrollContentGlass: { flexGrow: 1 },
  surfaceGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(124, 58, 237, 0.16)',
  },
  termsRowGlass: {
    backgroundColor: 'rgba(244, 240, 255, 0.82)',
  },
  inputGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },

  stepContainer: { paddingTop: 8 },

  welcomeEmoji: { fontSize: 40, marginBottom: 8 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  welcomeSubtitle: { fontSize: 14, color: C.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  policyCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    height: 280,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  policyScroll: { padding: 18 },
  policySection: { marginBottom: 18 },
  policyTitle: { fontSize: 14, fontWeight: '700', color: C.accent, marginBottom: 6 },
  policyBody: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    padding: 14,
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  termsText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.textPrimary },

  categoryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  categorySubtitle: { fontSize: 14, color: C.textSecondary, lineHeight: 21, marginBottom: 24 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '47%',
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryCardPressed: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    transform: [{ scale: 0.98 }],
  },
  categoryEmoji: { fontSize: 32 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  formHeaderText: { flex: 1, gap: 4 },
  formTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  formSubtitle: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginTop: 4 },
  formCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formCardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  publishTotalCardGlass: {
    backgroundColor: 'rgba(244, 240, 255, 0.78)',
  },
  publishTotalCard: {
    backgroundColor: C.accentSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 4,
  },
  publishTotalLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  publishTotalValue: { fontSize: 26, fontWeight: '800', color: C.accent, letterSpacing: -0.5 },
  publishTotalHint: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: C.accent },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
  },
  inputError: { borderColor: C.error, backgroundColor: C.errorSoft },
  textArea: { minHeight: 120, paddingTop: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  inputThird: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTextActive: { color: '#FFF' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoThumbWrap: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%', backgroundColor: '#F3F4F6' },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800', lineHeight: 13 },
  photoEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFE',
  },
  photoEmptyText: { fontSize: 12, color: C.textMuted },
  photoBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderRadius: 14,
    paddingVertical: 13,
  },
  photoActionBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },
  photoCountText: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 2 },
  photoLimitText: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 8 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 14,
    marginBottom: 16,
  },
  warningText: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  errorText: { fontSize: 11, color: C.error, marginTop: 6, fontWeight: '500' },
  hintText: { fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 16 },
  orDivider: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textMuted,
    marginVertical: 10,
    fontWeight: '500',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: C.accentSoft,
  },
  secondaryBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  dimGroupLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },

  dynamicSection: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  dynamicSectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  nfElectronicsHint: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 18,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
