import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CONSERVATION_OPTIONS,
  type ConservationState,
} from '@/src/constants/listingForm';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  error: '#EF4444',
};

type Props = {
  value: ConservationState | null;
  onChange: (v: ConservationState) => void;
  showError?: boolean;
};

export function ConservationStateField({ value, onChange, showError }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Estado de conservação *</Text>
      <View style={styles.chipRow}>
        {CONSERVATION_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {showError && !value ? (
        <Text style={styles.errorText}>Selecione uma opção para continuar.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFF',
  },
  chipActive: { backgroundColor: C.accentSoft, borderColor: C.accentBorder },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: C.accent },
  errorText: { fontSize: 11, color: C.error, marginTop: 6, fontWeight: '500' },
});
