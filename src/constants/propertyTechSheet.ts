import {

  buildTechSheetDisplayRows,

  parseTechSheetValuesFromExtras,

  validateTechSheetFields,

  type TechSheetFieldDef,

  type TechSheetValues,

} from '@/src/constants/listingTechSheetCommon';



export type PropertyTechSheetValues = TechSheetValues;



export const PROPERTY_TECH_SHEET_FIELDS: readonly TechSheetFieldDef[] = [

  {

    key: 'tipo',

    label: 'Tipo',

    kind: 'select',

    required: true,

    options: ['Casa', 'Apartamento', 'Terreno', 'Comercial'],

  },

  {

    key: 'area_util_m2',

    label: 'Área útil (m²)',

    kind: 'number',

    required: true,

    placeholder: 'Ex: 75',

  },

  {

    key: 'quartos',

    label: 'Quantidade de quartos',

    kind: 'select',

    required: true,

    options: ['0 / Studio', '1', '2', '3', '4 ou mais'],

  },

  {

    key: 'vagas_garagem',

    label: 'Vagas de garagem',

    kind: 'select',

    required: true,

    options: ['Não possui', '1 vaga', '2 vagas', '3 ou mais'],

  },

  {

    key: 'status_ocupacao',

    label: 'Status de ocupação',

    kind: 'select',

    required: true,

    options: ['Desocupado (Pronto para morar)', 'Ocupado por inquilino'],

  },

  {

    key: 'situacao_documentacao',

    label: 'Situação da documentação',

    kind: 'select',

    required: true,

    options: [

      'Escriturado e Registrado',

      'Alienado / Financiado',

      'Possui pendências judiciais/IPTU',

    ],

  },

] as const;



export function requiresPropertyTechSheet(category: string | null | undefined): boolean {

  return category === 'imoveis';

}



export function validatePropertyTechSheet(values: PropertyTechSheetValues): string | null {

  return validateTechSheetFields(PROPERTY_TECH_SHEET_FIELDS, values);

}



export function buildPropertyTechSheetDisplayRows(

  values: PropertyTechSheetValues | null | undefined,

): { label: string; value: string }[] {

  if (!values) return [];

  return buildTechSheetDisplayRows(PROPERTY_TECH_SHEET_FIELDS, values);

}



export function parsePropertyTechSheetFromExtras(

  extras: Record<string, unknown> | null | undefined,

): PropertyTechSheetValues | null {

  return parseTechSheetValuesFromExtras(extras, 'property_tech_sheet');

}



export function propertyExtrasFromTechSheet(

  values: PropertyTechSheetValues,

): Record<string, string | null> {

  const tipo = values.tipo?.trim() || null;

  const typeSlug =

    tipo === 'Casa'

      ? 'casa'

      : tipo === 'Apartamento'

        ? 'apartamento'

        : tipo === 'Terreno'

          ? 'terreno'

          : tipo === 'Comercial'

            ? 'comercial'

            : null;

  return {

    tipo,

    type: typeSlug,

    area: values.area_util_m2?.trim() || null,

    bedrooms: values.quartos?.trim() || null,

    parking: values.vagas_garagem?.trim() || null,

    occupancy: values.status_ocupacao?.trim() || null,

    documentation: values.situacao_documentacao?.trim() || null,

  };

}


