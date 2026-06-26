import type { ElectronicTypeId } from '@/src/constants/electronicsCatalog';

import { normalizeElectronicTypeId } from '@/src/constants/electronicsCatalog';

import {

  getVisibleTechSheetFields as getVisibleFields,

  validateTechSheetFields,

  type TechSheetFieldDef,

  type TechSheetValues,

} from '@/src/constants/listingTechSheetCommon';



export type ElectronicsTechSheetValues = TechSheetValues;



export type ElectronicsTechSheetPayload = {

  type_id: ElectronicTypeId;

  values: ElectronicsTechSheetValues;

};



export type { TechSheetFieldDef };



const YES_NO = ['Sim', 'Não'] as const;



export const TECH_SHEET_TYPES: ElectronicTypeId[] = [
  'celular',
  'computador',
  'videogames',
  'smart_tv',
];



export function requiresElectronicsTechSheet(

  typeId: ElectronicTypeId | string | null | undefined,

): boolean {

  const normalized = normalizeElectronicTypeId(

    typeof typeId === 'string' ? typeId : typeId ?? null,

  );

  return normalized != null && TECH_SHEET_TYPES.includes(normalized);

}



function isAppleBrand(marca: string): boolean {

  const m = marca.trim().toLowerCase();

  return m === 'apple' || m.includes('iphone');

}



export function getTechSheetFields(typeId: ElectronicTypeId): TechSheetFieldDef[] {

  switch (typeId) {

    case 'celular':

      return [

        {

          key: 'marca',

          label: 'Marca',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: Nothing, Realme, Google Pixel',

          options: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG'],

        },

        {

          key: 'modelo',

          label: 'Modelo',

          kind: 'text',

          required: true,

          placeholder: 'Ex: iPhone 15 Pro, Galaxy S24 Ultra',

        },

        {

          key: 'armazenamento_gb',

          label: 'Armazenamento',

          kind: 'select',

          required: true,

          options: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'],

        },

        {

          key: 'saude_bateria',

          label: 'Saúde da bateria (iPhone)',

          kind: 'select',

          required: true,

          options: ['100%', '90–99%', '80–89%', '70–79%', 'Abaixo de 70%'],

          showWhen: (v) => isAppleBrand(v.marca ?? ''),

        },

        {

          key: 'estado_tela',

          label: 'Estado da tela',

          kind: 'select',

          required: true,

          options: ['Perfeita', 'Leves riscos', 'Riscos visíveis', 'Trincada', 'Quebrada'],

        },

        {

          key: 'pecas_originais',

          label: 'Peças originais',

          kind: 'select',

          required: true,

          options: YES_NO,

        },

      ];

    case 'computador':

      return [

        {

          key: 'marca',

          label: 'Marca',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: Microsoft Surface, Positivo, Multilaser',

          options: ['Apple', 'Dell', 'Lenovo', 'Asus', 'Acer', 'HP', 'Samsung'],

        },

        {

          key: 'processador',

          label: 'Processador',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: Intel Core Ultra 7, Apple M3 Pro',

          options: [

            'Apple M1',

            'Apple M2',

            'Apple M3',

            'Apple M4',

            'Intel i3',

            'Intel i5',

            'Intel i7',

            'Intel i9',

            'Ryzen 5',

            'Ryzen 7',

            'Ryzen 9',

          ],

        },

        {

          key: 'memoria_ram',

          label: 'Memória RAM',

          kind: 'select',

          required: true,

          options: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB ou mais'],

        },

        {

          key: 'armazenamento',

          label: 'Armazenamento',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: 240 GB SSD, 4 TB HDD',

          options: ['128 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB ou mais', 'HDD + SSD'],

        },

        {

          key: 'carregador_original',

          label: 'Carregador original',

          kind: 'select',

          required: true,

          options: YES_NO,

        },

      ];

    case 'videogames':

      return [

        {

          key: 'console',

          label: 'Console',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: Steam Deck, Retro handheld',

          options: [

            'PlayStation 5',

            'PlayStation 4',

            'Xbox Series X|S',

            'Xbox One',

            'Nintendo Switch',

            'Nintendo Switch OLED',

          ],

        },

        {

          key: 'armazenamento',

          label: 'Armazenamento',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: 2 TB com SSD expandido',

          options: ['256 GB', '512 GB', '825 GB', '1 TB', 'Expansível'],

        },

        {

          key: 'qtd_controles',

          label: 'Controles inclusos',

          kind: 'select',

          required: true,

          options: ['Nenhum', '1', '2', '3 ou mais'],

        },

        {

          key: 'jogos_inclusos',

          label: 'Jogos inclusos',

          kind: 'select',

          required: true,

          options: YES_NO,

        },

        {

          key: 'original_bloqueado',

          label: 'Situação do aparelho',

          kind: 'select',

          required: true,

          options: ['Original de fábrica', 'Desbloqueado', 'Bloqueado / com restrição'],

        },

      ];

    case 'smart_tv':

      return [

        {

          key: 'marca',

          label: 'Marca',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: Toshiba, AOC, Britânia',

          options: ['Samsung', 'LG', 'Sony', 'Philips', 'TCL', 'Hisense', 'Panasonic'],

        },

        {

          key: 'modelo',

          label: 'Modelo',

          kind: 'text',

          required: true,

          placeholder: 'Ex: Crystal UHD 55", Bravia XR 65"',

        },

        {

          key: 'polegadas',

          label: 'Polegadas',

          kind: 'select',

          required: true,

          allowCustomChip: true,

          customChipLabel: 'Outro...',

          customPlaceholder: 'Ex: 58, 86 polegadas',

          options: [

            '32"',

            '40"',

            '43"',

            '50"',

            '55"',

            '58"',

            '65"',

            '70"',

            '75"',

            '85"',

          ],

        },

      ];

    default:

      return [];

  }

}



export function getVisibleTechSheetFields(

  typeId: ElectronicTypeId,

  values: ElectronicsTechSheetValues,

): TechSheetFieldDef[] {

  return getVisibleFields(getTechSheetFields(typeId), values);

}



export function validateElectronicsTechSheet(

  typeId: ElectronicTypeId | string | null | undefined,

  values: ElectronicsTechSheetValues,

): string | null {

  const normalized = normalizeElectronicTypeId(

    typeof typeId === 'string' ? typeId : typeId ?? null,

  );

  if (!normalized || !requiresElectronicsTechSheet(normalized)) return null;

  return validateTechSheetFields(getVisibleTechSheetFields(normalized, values), values);

}



export function buildTechSheetDisplayRows(

  payload: ElectronicsTechSheetPayload | null | undefined,

): { label: string; value: string }[] {

  if (!payload?.type_id || !payload.values) return [];

  const typeId = normalizeElectronicTypeId(payload.type_id);

  if (!typeId) return [];

  return getVisibleTechSheetFields(typeId, payload.values)

    .map((field) => ({

      label: field.label,

      value: (payload.values[field.key] ?? '').trim(),

    }))

    .filter((row) => row.value.length > 0);

}



export function parseElectronicsTechSheetFromExtras(

  extras: Record<string, unknown> | null | undefined,

): ElectronicsTechSheetPayload | null {

  if (!extras) return null;

  const raw = extras.electronics_tech_sheet;

  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as { type_id?: string; values?: Record<string, unknown> };

  const typeId = normalizeElectronicTypeId(obj.type_id);

  if (!typeId) return null;

  const values: ElectronicsTechSheetValues = {};

  if (obj.values && typeof obj.values === 'object') {

    for (const [k, v] of Object.entries(obj.values)) {

      if (typeof v === 'string') values[k] = v;

    }

  }

  return { type_id: typeId, values };

}


