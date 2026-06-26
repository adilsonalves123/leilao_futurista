import { StyleSheet, Text, View } from 'react-native';

import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  rowAlt: '#F9FAFB',
  headerBg: '#FAF5FF',
};

type Row = { label: string; value: string };

type Props = {
  title?: string;
  rows: Row[];
};

export function ListingTechnicalSheetTable({
  title = 'Ficha técnica',
  rows,
}: Props) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.table}>
        {rows.map((row, index) => (
          <View
            key={`${row.label}-${index}`}
            style={[styles.row, index % 2 === 1 && styles.rowAlt, index === rows.length - 1 && styles.rowLast]}>
            <Text style={styles.cellLabel}>{row.label}</Text>
            <Text style={styles.cellValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, marginBottom: 4 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  rowAlt: { backgroundColor: C.rowAlt },
  rowLast: { borderBottomWidth: 0 },
  cellLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
  },
  cellValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'right',
  },
});
