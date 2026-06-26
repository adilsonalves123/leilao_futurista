import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { AdminPedidoEvento } from '@/src/admin/types';
import { adminC } from './adminStyles';

type Props = {
  eventos: AdminPedidoEvento[];
};

function iconeEvento(tipo: string): keyof typeof Ionicons.glyphMap {
  if (tipo.includes('pagamento')) return 'card-outline';
  if (tipo.includes('envio') || tipo.includes('postado')) return 'cube-outline';
  if (tipo.includes('disputa')) return 'alert-circle-outline';
  if (tipo.includes('finalizado')) return 'checkmark-done-outline';
  return 'time-outline';
}

export function OrderEventLog({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nenhum evento registrado ainda.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {eventos.map((evt, index) => (
        <View key={evt.id} style={[styles.row, index < eventos.length - 1 && styles.rowBorder]}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconeEvento(evt.tipo)} size={15} color={adminC.accentBright} />
          </View>
          <View style={styles.content}>
            <Text style={styles.message}>{evt.mensagem}</Text>
            <Text style={styles.time}>{evt.criadoEm}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(17,24,39,0.4)',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  message: { fontSize: 13, color: adminC.textPrimary, lineHeight: 19, fontWeight: '600' },
  time: { fontSize: 11, color: adminC.textMuted, marginTop: 4, fontWeight: '600' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, color: adminC.textMuted },
});
