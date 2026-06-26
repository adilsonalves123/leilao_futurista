import { StyleSheet, Text, View } from 'react-native';
import type { AdminLeilaoPendencia } from '@/src/lib/adminLeilaoFluxo';
import { responsavelLabel } from '@/src/lib/adminLeilaoFluxo';
import { adminC } from './adminStyles';

const CORES: Record<
  AdminLeilaoPendencia['severidade'],
  { bg: string; text: string; border: string }
> = {
  ok: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  aviso: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  critico: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
};

type Props = {
  pendencia: AdminLeilaoPendencia;
  compact?: boolean;
};

export function AdminLeilaoPendenciaBadge({ pendencia, compact }: Props) {
  const cores = CORES[pendencia.severidade];

  return (
    <View style={[styles.wrap, { backgroundColor: cores.bg, borderColor: cores.border }]}>
      <Text style={[styles.label, { color: cores.text }]} numberOfLines={compact ? 1 : 2}>
        {pendencia.label}
      </Text>
      {!compact && pendencia.responsavel !== 'nenhum' ? (
        <Text style={[styles.resp, { color: cores.text }]}>
          → {responsavelLabel(pendencia.responsavel)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 200,
    gap: 2,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  resp: { fontSize: 9, fontWeight: '600', opacity: 0.85 },
});
