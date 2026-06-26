import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { AdminPedidoEtapa } from '@/src/admin/types';
import { adminC } from './adminStyles';

type Props = {
  etapas: AdminPedidoEtapa[];
  compact?: boolean;
};

export function OrderTimelineVisual({ etapas, compact }: Props) {
  return (
    <View style={styles.wrap}>
      {etapas.map((etapa, index) => {
        const isLast = index === etapas.length - 1;
        const done = etapa.concluida;
        const current = etapa.atual;

        return (
          <View key={etapa.id} style={[styles.row, compact && styles.rowCompact]}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                  !done && !current && styles.dotMuted,
                ]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : current ? (
                  <View style={styles.dotInner} />
                ) : null}
              </View>
              {!isLast ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.title,
                  current && styles.titleCurrent,
                  !done && !current && styles.titleMuted,
                ]}>
                {etapa.titulo}
              </Text>
              {!compact ? (
                <Text style={styles.desc}>{etapa.descricao}</Text>
              ) : null}
              {etapa.data ? (
                <Text style={styles.date}>{etapa.data}</Text>
              ) : (
                <Text style={styles.datePending}>Pendente</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: 14, minHeight: 72 },
  rowCompact: { minHeight: 56 },
  rail: { alignItems: 'center', width: 26 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: adminC.borderStrong,
    backgroundColor: adminC.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: adminC.success, borderColor: adminC.success },
  dotCurrent: { borderColor: adminC.accent, backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  dotMuted: { opacity: 0.55 },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminC.accentBright,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  lineDone: { backgroundColor: 'rgba(16, 185, 129, 0.35)' },
  content: { flex: 1, paddingBottom: 14 },
  title: { fontSize: 14, fontWeight: '700', color: adminC.textPrimary },
  titleCurrent: { color: '#C4B5FD' },
  titleMuted: { color: adminC.textMuted },
  desc: { fontSize: 12, color: adminC.textSecondary, marginTop: 3, lineHeight: 17 },
  date: { fontSize: 11, color: adminC.textMuted, marginTop: 5, fontWeight: '600' },
  datePending: { fontSize: 11, color: '#92400E', marginTop: 5, fontWeight: '600' },
});
