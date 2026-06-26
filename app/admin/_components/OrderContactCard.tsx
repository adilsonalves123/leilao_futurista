import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminPedidoParte } from '@/src/admin/types';
import { formatarCpfExibicao } from '@/src/services/adminKyc';
import { adminC } from './adminStyles';

type Props = {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  parte: AdminPedidoParte;
  mostrarCpf?: boolean;
};

function formatarTelefoneExibicao(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return telefone;
}

function whatsappUrl(telefone: string | null): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const numero = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${numero}`;
}

function abrirWhatsApp(telefone: string | null) {
  const url = whatsappUrl(telefone);
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function abrirEmail(email: string) {
  Linking.openURL(`mailto:${email}`).catch(() => {});
}

export function OrderContactCard({ titulo, icone, parte, mostrarCpf }: Props) {
  const wa = whatsappUrl(parte.telefone);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icone} size={16} color={adminC.accentBright} />
        </View>
        <Text style={styles.title}>{titulo}</Text>
      </View>

      <Text style={styles.nome}>{parte.nome}</Text>

      {mostrarCpf && parte.cpf ? (
        <View style={styles.row}>
          <Ionicons name="card-outline" size={14} color={adminC.textMuted} />
          <Text style={styles.rowText}>{formatarCpfExibicao(parte.cpf)}</Text>
        </View>
      ) : null}

      <Pressable style={styles.row} onPress={() => abrirEmail(parte.email)}>
        <Ionicons name="mail-outline" size={14} color={adminC.accentBright} />
        <Text style={[styles.rowText, styles.link]}>{parte.email}</Text>
      </Pressable>

      {parte.telefone ? (
        <Pressable style={styles.waBtn} onPress={() => abrirWhatsApp(parte.telefone)}>
          <Ionicons name="logo-whatsapp" size={16} color="#34D399" />
          <Text style={styles.waText}>{formatarTelefoneExibicao(parte.telefone)}</Text>
          {wa ? <Ionicons name="open-outline" size={14} color="#6EE7B7" /> : null}
        </Pressable>
      ) : (
        <Text style={styles.semContato}>Telefone não cadastrado</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(17,24,39,0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: adminC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nome: { fontSize: 16, fontWeight: '800', color: adminC.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 13, color: adminC.textSecondary, fontWeight: '600' },
  link: { color: '#93C5FD' },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  waText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#6EE7B7' },
  semContato: { fontSize: 12, color: adminC.textMuted, fontStyle: 'italic' },
});
