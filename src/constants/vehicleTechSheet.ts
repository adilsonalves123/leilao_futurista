import {

  buildTechSheetDisplayRows,

  parseTechSheetValuesFromExtras,

  validateTechSheetFields,

  type TechSheetFieldDef,

  type TechSheetValues,

} from '@/src/constants/listingTechSheetCommon';



export type VehicleTechSheetValues = TechSheetValues;



export const VEHICLE_TECH_SHEET_FIELDS: readonly TechSheetFieldDef[] = [

  {

    key: 'tipo',

    label: 'Tipo',

    kind: 'select',

    required: true,

    allowCustomChip: true,

    customChipLabel: 'Outro...',

    customPlaceholder: 'Ex: Van, Utilitário',

    options: ['Carro', 'Moto', 'Caminhonete / SUV'],

  },

  {

    key: 'marca_modelo',

    label: 'Marca e modelo',

    kind: 'text',

    required: true,

    placeholder: 'Ex: Honda Civic, Toyota Hilux',

  },

  {

    key: 'ano_fabricacao',

    label: 'Ano de fabricação',

    kind: 'number',

    required: true,

    placeholder: 'Ex: 2021',

  },

  {

    key: 'ano_modelo',

    label: 'Ano modelo',

    kind: 'number',

    required: true,

    placeholder: 'Ex: 2022',

  },

  {

    key: 'quilometragem_km',

    label: 'Quilometragem (KM)',

    kind: 'number',

    required: true,

    placeholder: 'Ex: 45000',

  },

  {

    key: 'cambio',

    label: 'Câmbio',

    kind: 'select',

    required: true,

    options: ['Automático', 'Manual'],

  },

  {

    key: 'combustivel',

    label: 'Combustível',

    kind: 'select',

    required: true,

    options: ['Flex', 'Gasolina', 'Diesel', 'Elétrico / Híbrido'],

  },

  {

    key: 'historico_sinistro',

    label: 'Histórico de sinistro / leilão anterior?',

    kind: 'select',

    required: true,

    options: [

      'Não, totalmente limpo',

      'Sim, veículo com passagem por leilão / recuperado',

    ],

  },

  {

    key: 'renavam',

    label: 'RENAVAM',

    kind: 'number',

    required: true,

    placeholder: 'Ex: 00123456789',

    publicDisplay: false,

    sensitiveHint:

      'Não aparece no anúncio para outros usuários. Usado pela plataforma para validar o veículo.',

  },

] as const;



export function maskRenavam(renavam: string): string {
  const digits = renavam.replace(/\D/g, '');
  if (digits.length <= 4) return '••••';
  return `${'•'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function extractRenavamFromListingExtras(
  extras: Record<string, unknown> | null | undefined,
): string | null {
  const values = parseVehicleTechSheetFromExtras(extras);
  const raw = values?.renavam?.trim();
  return raw || null;
}

export function validateRenavam(value: string): string | null {

  const digits = value.replace(/\D/g, '');

  if (digits.length !== 11) {

    return 'Informe o RENAVAM com 11 dígitos.';

  }

  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const sum = weights.reduce((acc, weight, index) => acc + weight * Number(digits[index]), 0);

  const mod = sum % 11;

  const expectedDigit = mod === 0 || mod === 1 ? 0 : 11 - mod;

  if (Number(digits[10]) !== expectedDigit) {

    return 'RENAVAM inválido. Confira os dígitos informados.';

  }

  return null;

}



export function requiresVehicleTechSheet(category: string | null | undefined): boolean {

  return category === 'veiculos';

}



export function validateVehicleTechSheet(values: VehicleTechSheetValues): string | null {

  const base = validateTechSheetFields(VEHICLE_TECH_SHEET_FIELDS, values);

  if (base) return base;

  const renavam = values.renavam?.trim() ?? '';

  if (renavam) {

    return validateRenavam(renavam);

  }

  return null;

}



export function buildVehicleTechSheetDisplayRows(

  values: VehicleTechSheetValues | null | undefined,

): { label: string; value: string }[] {

  if (!values) return [];

  return buildTechSheetDisplayRows(VEHICLE_TECH_SHEET_FIELDS, values);

}



export function parseVehicleTechSheetFromExtras(

  extras: Record<string, unknown> | null | undefined,

): VehicleTechSheetValues | null {

  return parseTechSheetValuesFromExtras(extras, 'vehicle_tech_sheet');

}



/** Compatibilidade com `listing_extras.vehicle` legado. */

export function vehicleExtrasFromTechSheet(values: VehicleTechSheetValues): Record<string, string | null> {

  return {

    tipo: values.tipo?.trim() || null,

    brand_model: values.marca_modelo?.trim() || null,

    year_fabrication: values.ano_fabricacao?.trim() || null,

    year_model: values.ano_modelo?.trim() || null,

    km: values.quilometragem_km?.trim() || null,

    transmission: values.cambio?.trim() || null,

    fuel: values.combustivel?.trim() || null,

    accident_history: values.historico_sinistro?.trim() || null,

  };

}


