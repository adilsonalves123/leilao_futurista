import type { ConservationState } from '@/src/constants/listingForm';
import {
  validateElectronicsIdentification,
  type ElectronicTypeId,
} from '@/src/constants/electronicsCatalog';
import {
  validateElectronicsTechSheet,
  type ElectronicsTechSheetValues,
} from '@/src/constants/electronicsTechSheet';
import {
  validatePropertyTechSheet,
  type PropertyTechSheetValues,
} from '@/src/constants/propertyTechSheet';
import {
  validateVehicleTechSheet,
  type VehicleTechSheetValues,
} from '@/src/constants/vehicleTechSheet';
import { validateSerialOrImei } from '@/src/lib/serialImeiValidation';

export type ListingCategoryId =
  | 'produtos_gerais'
  | 'veiculos'
  | 'imoveis'
  | 'eletronicos'
  | 'colecionaveis'
  | 'outros';

export type ListingFormSnapshot = {
  category: ListingCategoryId;
  title: string;
  description: string;
  photosCount: number;
  estimatedMarketValue: string;
  startPrice: string;
  conservationState: ConservationState | null;
  originCep: string;
  serialImei: string;
  electronicTypeId: ElectronicTypeId | null;
  electronicsTechSheet: ElectronicsTechSheetValues;
  vehicleTechSheet: VehicleTechSheetValues;
  propertyTechSheet: PropertyTechSheetValues;
  optionalSerial: string;
  ownershipDeclarationAccepted: boolean;
  showShipping: boolean;
  weightKg: string;
  heightCm: string;
  widthCm: string;
  lengthCm: string;
};

function parsePriceInput(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) ? 0 : val;
}

/** Primeira razão que impede publicar; null = pode publicar (exceto preço inválido em tempo real). */
export function getListingPublishBlockReason(
  form: ListingFormSnapshot,
): string | null {
  if (!form.title.trim()) return 'Informe o título do leilão.';
  if (!form.description.trim()) return 'Informe a descrição detalhada do item.';
  if (form.photosCount === 0) return 'Adicione pelo menos uma foto (foto de capa).';
  if (!form.conservationState) return 'Selecione o estado de conservação do item.';

  const estimated = parsePriceInput(form.estimatedMarketValue);
  const initial = parsePriceInput(form.startPrice);
  if (estimated <= 0 || initial <= 0) return 'Preencha o valor estimado e o preço inicial.';
  if (initial >= estimated) return 'O preço inicial deve ser menor que o valor estimado.';

  if (form.originCep.replace(/\D/g, '').length !== 8) {
    return 'Informe o CEP de origem válido (8 dígitos) para cálculo do frete.';
  }

  if (form.category === 'eletronicos') {
    const techErr = validateElectronicsTechSheet(form.electronicTypeId, form.electronicsTechSheet);
    if (techErr) return techErr;
    const idCheck = validateElectronicsIdentification(form.electronicTypeId, form.serialImei);
    if (!idCheck.valid) return idCheck.message ?? 'Identificação do eletrônico inválida.';
  } else if (form.category === 'veiculos') {
    const techErr = validateVehicleTechSheet(form.vehicleTechSheet);
    if (techErr) return techErr;
  } else if (form.category === 'imoveis') {
    const techErr = validatePropertyTechSheet(form.propertyTechSheet);
    if (techErr) return techErr;
  } else if (form.optionalSerial.trim()) {
    const optionalCheck = validateSerialOrImei(form.optionalSerial);
    if (!optionalCheck.valid) {
      return 'Número de série opcional em formato inválido.';
    }
  }

  if (form.showShipping) {
    if (!form.weightKg.trim() || !form.heightCm.trim() || !form.widthCm.trim() || !form.lengthCm.trim()) {
      return 'Preencha peso e dimensões do pacote para cálculo do frete.';
    }
  }

  if (!form.ownershipDeclarationAccepted) {
    return 'Aceite o termo jurídico de origem lícita, conformidade fiscal e isenção da plataforma.';
  }

  return null;
}

export function getListingStep3BlockReason(
  form: Pick<
    ListingFormSnapshot,
    | 'category'
    | 'title'
    | 'description'
    | 'photosCount'
    | 'conservationState'
    | 'electronicTypeId'
    | 'electronicsTechSheet'
    | 'vehicleTechSheet'
    | 'propertyTechSheet'
  >,
): string | null {
  if (form.photosCount === 0) return 'Adicione pelo menos uma foto de capa.';
  if (!form.title.trim()) return 'Informe o título do leilão.';
  if (!form.description.trim()) return 'Informe a descrição detalhada do item.';
  if (!form.conservationState) return 'Selecione o estado de conservação.';
  if (form.category === 'eletronicos') {
    const techErr = validateElectronicsTechSheet(form.electronicTypeId, form.electronicsTechSheet);
    if (techErr) return techErr;
  }
  if (form.category === 'veiculos') {
    const techErr = validateVehicleTechSheet(form.vehicleTechSheet);
    if (techErr) return techErr;
  }
  if (form.category === 'imoveis') {
    const techErr = validatePropertyTechSheet(form.propertyTechSheet);
    if (techErr) return techErr;
  }
  return null;
}

export function getListingStep4BlockReason(form: ListingFormSnapshot): string | null {
  const estimated = parsePriceInput(form.estimatedMarketValue);
  const initial = parsePriceInput(form.startPrice);
  if (estimated <= 0 || initial <= 0) return 'Preencha o valor estimado e o preço inicial.';
  if (initial >= estimated) return 'O preço inicial deve ser menor que o valor estimado.';

  if (form.originCep.replace(/\D/g, '').length !== 8) {
    return 'Informe o CEP de origem válido (8 dígitos).';
  }

  if (form.category === 'eletronicos') {
    const idCheck = validateElectronicsIdentification(form.electronicTypeId, form.serialImei);
    if (!idCheck.valid) return idCheck.message ?? 'Identificação do eletrônico inválida.';
  } else if (form.optionalSerial.trim()) {
    const optionalCheck = validateSerialOrImei(form.optionalSerial);
    if (!optionalCheck.valid) return 'Número de série opcional em formato inválido.';
  }

  if (form.showShipping) {
    if (!form.weightKg.trim() || !form.heightCm.trim() || !form.widthCm.trim() || !form.lengthCm.trim()) {
      return 'Preencha peso e dimensões do pacote para cálculo do frete.';
    }
  }

  return null;
}

export function isListingPriceInvalid(estimatedStr: string, startStr: string): boolean {
  const estimated = parsePriceInput(estimatedStr);
  const initial = parsePriceInput(startStr);
  return estimated > 0 && initial > 0 && initial >= estimated;
}
