import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ListingTechSheetSelectField } from '@/components/listing/ListingTechSheetSelectField';
import {
  getVisibleTechSheetFields,
  type TechSheetFieldDef,
  type TechSheetValues,
} from '@/src/constants/listingTechSheetCommon';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#ECEEF2',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  error: '#EF4444',
  white: '#FFFFFF',
};

type Props = {
  fields: readonly TechSheetFieldDef[];
  values: TechSheetValues;
  onChange: (next: TechSheetValues) => void;
  showErrors?: boolean;
  intro?: string;
};

function FieldBlock({
  field,
  value,
  onChange,
  showError,
}: {
  field: TechSheetFieldDef;
  value: string;
  onChange: (v: string) => void;
  showError: boolean;
}) {
  const missing = showError && field.required && !value.trim();

  if (field.kind === 'select' || field.kind === 'chips') {
    return (
      <ListingTechSheetSelectField
        field={{ ...field, kind: 'select' }}
        value={value}
        onChange={onChange}
        showError={showError}
      />
    );
  }

  if (field.kind === 'text' || field.kind === 'number') {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {field.label} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, missing && styles.inputError]}
          placeholder={field.placeholder ?? ''}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={field.kind === 'number' ? 'number-pad' : 'default'}
        />
        {missing ? <Text style={styles.errorText}>Campo obrigatório.</Text> : null}
        {field.sensitiveHint ? (
          <Text style={styles.sensitiveHint}>{field.sensitiveHint}</Text>
        ) : null}
      </View>
    );
  }

  return null;
}

export function ListingTechSheetForm({
  fields,
  values,
  onChange,
  showErrors = false,
  intro,
}: Props) {
  const visible = useMemo(() => getVisibleTechSheetFields(fields, values), [fields, values]);

  function setField(key: string, val: string) {
    onChange({ ...values, [key]: val });
  }

  return (
    <View style={styles.wrap}>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
      {visible.map((field) => (
        <FieldBlock
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          onChange={(v) => setField(field.key, v)}
          showError={showErrors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  intro: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 8 },
  required: { color: C.error },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
  },
  inputError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 11, color: C.error, marginTop: 6, fontWeight: '500' },
  sensitiveHint: { fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 16 },
});
