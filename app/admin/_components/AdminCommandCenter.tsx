import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminOpsCounts } from '@/src/services/adminOpsCounts';
import { adminTheme } from './adminStyles';

type Tile = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  countKey: keyof AdminOpsCounts;
  tone: 'danger' | 'warning' | 'info' | 'neutral';
};

const TILES: Tile[] = [
  {
    id: 'kyc',
    label: 'KYC',
    hint: 'Verificações pendentes',
    href: '/admin/kyc',
    icon: 'id-card-outline',
    countKey: 'kycPendentes',
    tone: 'warning',
  },
  {
    id: 'leiloes',
    label: 'Leilões',
    hint: 'Aguardando aprovação',
    href: '/admin/leiloes',
    icon: 'hammer-outline',
    countKey: 'leiloesEmAnalise',
    tone: 'info',
  },
  {
    id: 'pedidos',
    label: 'Pagamentos',
    hint: 'Pedidos sem pagar',
    href: '/admin/pedidos',
    icon: 'card-outline',
    countKey: 'pedidosPagamentoPendente',
    tone: 'warning',
  },
  {
    id: 'disputas',
    label: 'Disputas',
    hint: 'Sala de mediação',
    href: '/admin/disputas',
    icon: 'scale-outline',
    countKey: 'disputasAbertas',
    tone: 'danger',
  },
  {
    id: 'suporte',
    label: 'Suporte',
    hint: 'Chats aguardando humano',
    href: '/admin/suporte',
    icon: 'headset-outline',
    countKey: 'suporteAguardando',
    tone: 'info',
  },
  {
    id: 'push',
    label: 'Push',
    hint: 'Notificações na fila',
    href: '/admin/notificacoes',
    icon: 'notifications-outline',
    countKey: 'pushNaFila',
    tone: 'neutral',
  },
];

const TONE_BORDER: Record<Tile['tone'], string> = {
  danger: 'rgba(248, 113, 113, 0.35)',
  warning: 'rgba(251, 191, 36, 0.35)',
  info: 'rgba(5, 255, 155, 0.25)',
  neutral: adminTheme.border,
};

type Props = {
  counts: AdminOpsCounts;
};

export function AdminCommandCenter({ counts }: Props) {
  const router = useRouter();
  const totalPendencias =
    counts.kycPendentes +
    counts.leiloesEmAnalise +
    counts.disputasAbertas +
    counts.pedidosPagamentoPendente +
    counts.suporteAguardando;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>Centro de controle</Text>
          <Text style={styles.sub}>
            {totalPendencias > 0
              ? `${totalPendencias} item${totalPendencias === 1 ? '' : 's'} exigem ação agora`
              : 'Nenhuma pendência crítica no momento'}
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Ao vivo</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {TILES.map((tile) => {
          const value = Number(counts[tile.countKey]) || 0;
          const urgente = value > 0 && (tile.tone === 'danger' || tile.tone === 'warning');

          return (
            <Pressable
              key={tile.id}
              style={[
                styles.tile,
                { borderColor: TONE_BORDER[tile.tone] },
                urgente && styles.tileUrgente,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {},
              ]}
              onPress={() => router.push(tile.href as never)}>
              <View style={styles.tileTop}>
                <Ionicons name={tile.icon} size={20} color={adminTheme.neon} />
                <Text style={[styles.count, value === 0 && styles.countZero]}>{value}</Text>
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={styles.tileHint}>{tile.hint}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
    ...(Platform.OS === 'web' ? ({ boxShadow: adminTheme.shadow } as object) : {}),
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  title: { fontSize: 16, fontWeight: '800', color: adminTheme.textPrimary },
  sub: { fontSize: 12, color: adminTheme.textMuted, marginTop: 4 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(5, 255, 155, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(5, 255, 155, 0.25)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminTheme.neon,
  },
  liveText: { fontSize: 11, fontWeight: '700', color: adminTheme.neon },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: Platform.OS === 'web' ? '31%' : '47%',
    minWidth: 140,
    flexGrow: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: adminTheme.bg,
  },
  tileUrgente: {
    backgroundColor: 'rgba(248, 113, 113, 0.04)',
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  count: {
    fontSize: 24,
    fontWeight: '800',
    color: adminTheme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  countZero: { color: adminTheme.textMuted, opacity: 0.5 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: adminTheme.textPrimary },
  tileHint: { fontSize: 11, color: adminTheme.textMuted, marginTop: 2 },
});
