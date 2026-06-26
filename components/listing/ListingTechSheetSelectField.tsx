import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { presetFieldOptions, type TechSheetFieldDef } from '@/src/constants/listingTechSheetCommon';
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
  overlay: 'rgba(15, 12, 30, 0.45)',
};

function isCustomSelectValue(field: TechSheetFieldDef, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !presetFieldOptions(field).includes(trimmed);
}

type Props = {
  field: TechSheetFieldDef;
  value: string;
  onChange: (v: string) => void;
  showError: boolean;
};

export function ListingTechSheetSelectField({ field, value, onChange, showError }: Props) {
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);

  const presetOptions = useMemo(() => presetFieldOptions(field), [field]);
  const allowCustom = field.allowCustomChip === true;
  const otherLabel = field.customChipLabel ?? 'Outro...';

  const customActive = allowCustom && isCustomSelectValue(field, value);
  const [otherOpen, setOtherOpen] = useState(customActive);

  useEffect(() => {
    if (customActive) setOtherOpen(true);
  }, [customActive]);

  const otherMode = allowCustom && (otherOpen || customActive);
  const missing = showError && field.required && !value.trim();

  const triggerText = useMemo(() => {
    if (value.trim()) return value;
    if (otherMode && !value.trim()) return '';
    return '';
  }, [value, otherMode]);

  const placeholder =
    field.placeholder ?? `Selecione ${field.label.toLowerCase()}`;

  function selectOption(opt: string) {
    setOtherOpen(false);
    onChange(opt);
    setPickerOpen(false);
  }

  function selectOther() {
    setOtherOpen(true);
    if (presetOptions.includes(value)) {
      onChange('');
    }
    setPickerOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {field.label} <Text style={styles.required}>*</Text>
      </Text>

      <Pressable
        style={[styles.selectTrigger, missing && styles.selectTriggerError]}
        onPress={() => setPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${field.label}, ${triggerText || placeholder}`}>
        <Text
          style={[styles.selectTriggerText, !triggerText && styles.selectTriggerPlaceholder]}
          numberOfLines={1}>
          {triggerText || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </Pressable>

      {allowCustom && otherMode ? (
        <TextInput
          style={[styles.input, styles.inputOther, missing && styles.inputError]}
          placeholder={field.customPlaceholder ?? 'Digite manualmente'}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChange}
          autoCapitalize="words"
          autoCorrect={false}
        />
      ) : null}

      {missing ? (
        <Text style={styles.errorText}>
          {otherMode && !value.trim()
            ? `Informe ${field.label.toLowerCase()} no campo acima.`
            : `Selecione ${field.label.toLowerCase()}.`}
        </Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{field.label}</Text>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {presetOptions.map((opt) => {
                const selected = !otherMode && value === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.sheetOption, selected && styles.sheetOptionActive]}
                    onPress={() => selectOption(opt)}>
                    <Text
                      style={[styles.sheetOptionText, selected && styles.sheetOptionTextActive]}>
                      {opt}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color={C.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
              {allowCustom ? (
                <Pressable
                  style={[styles.sheetOption, otherMode && styles.sheetOptionActive]}
                  onPress={selectOther}>
                  <View style={styles.sheetOtherRow}>
                    <Ionicons name="add-circle-outline" size={18} color={C.textMuted} />
                    <Text
                      style={[
                        styles.sheetOptionText,
                        otherMode && styles.sheetOptionTextActive,
                      ]}>
                      {otherLabel}
                    </Text>
                  </View>
                  {otherMode ? <Ionicons name="checkmark" size={20} color={C.accent} /> : null}
                </Pressable>
              ) : null}
            </ScrollView>
            <Pressable style={styles.sheetCloseBtn} onPress={() => setPickerOpen(false)}>
              <Text style={styles.sheetCloseText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 8 },
  required: { color: C.error },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  selectTriggerError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  selectTriggerText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  selectTriggerPlaceholder: { color: C.textMuted, fontWeight: '400' },
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
  inputOther: { marginTop: 10 },
  inputError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 11, color: C.error, marginTop: 6, fontWeight: '500' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: C.overlay,
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
  },
  sheetScroll: { maxHeight: 360 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  sheetOptionActive: { backgroundColor: C.accentSoft, borderRadius: 10, marginHorizontal: -4, paddingHorizontal: 8 },
  sheetOptionText: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  sheetOptionTextActive: { color: C.accent, fontWeight: '600' },
  sheetOtherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetCloseBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: C.accentSoft,
  },
  sheetCloseText: { fontSize: 14, fontWeight: '700', color: C.accent },
});
