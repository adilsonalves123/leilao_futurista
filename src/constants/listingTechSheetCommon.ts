export type TechSheetValues = Record<string, string>;

export type TechSheetFieldKind = 'chips' | 'text' | 'number' | 'select';

export type TechSheetFieldDef = {
  key: string;
  label: string;
  kind: TechSheetFieldKind;
  options?: readonly string[];
  required: boolean;
  placeholder?: string;
  /** Quando false, o valor não entra na ficha exibida ao comprador (dado sensível). */
  publicDisplay?: boolean;
  /** Texto de apoio no formulário do vendedor (ex.: dado que não aparece no anúncio). */
  sensitiveHint?: string;
  /** Select/chips: última opção "Outro..." abre TextInput para valor livre. */
  allowCustomChip?: boolean;
  customChipLabel?: string;
  customPlaceholder?: string;
  showWhen?: (values: TechSheetValues) => boolean;
};

/** Opções fixas (sem legado "Outra"/"Outro"). */
export function presetFieldOptions(field: TechSheetFieldDef): string[] {
  return (field.options ?? []).filter(
    (o) => o !== 'Outra' && o !== 'Outro' && o !== 'Outra...' && o !== 'Outro...',
  );
}

/** @deprecated Use presetFieldOptions */
export const presetChipOptions = presetFieldOptions;

export function getVisibleTechSheetFields(
  fields: readonly TechSheetFieldDef[],
  values: TechSheetValues,
): TechSheetFieldDef[] {
  return fields.filter((f) => !f.showWhen || f.showWhen(values));
}

export function validateTechSheetFields(
  fields: readonly TechSheetFieldDef[],
  values: TechSheetValues,
): string | null {
  const visible = getVisibleTechSheetFields(fields, values);
  for (const field of visible) {
    if (!field.required) continue;
    const val = (values[field.key] ?? '').trim();
    if (!val) return `Preencha o campo "${field.label}" na ficha técnica.`;
    if (field.kind === 'number' && !/^\d+([.,]\d+)?$/.test(val.replace(/\s/g, ''))) {
      return `Informe um valor numérico válido em "${field.label}".`;
    }
  }
  return null;
}

export function buildTechSheetDisplayRows(
  fields: readonly TechSheetFieldDef[],
  values: TechSheetValues,
): { label: string; value: string }[] {
  const visible = getVisibleTechSheetFields(fields, values);
  return visible
    .filter((field) => field.publicDisplay !== false)
    .map((field) => ({
      label: field.label,
      value: (values[field.key] ?? '').trim(),
    }))
    .filter((row) => row.value.length > 0);
}

export function parseTechSheetValuesFromExtras(
  extras: Record<string, unknown> | null | undefined,
  extraKey: string,
): TechSheetValues | null {
  if (!extras) return null;
  const raw = extras[extraKey];
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { values?: Record<string, unknown> };
  if (!obj.values || typeof obj.values !== 'object') return null;
  const values: TechSheetValues = {};
  for (const [k, v] of Object.entries(obj.values)) {
    if (typeof v === 'string') values[k] = v;
  }
  return Object.keys(values).length > 0 ? values : null;
}
