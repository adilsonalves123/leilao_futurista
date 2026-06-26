import { Ionicons } from '@expo/vector-icons';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminDisputaEvidence } from '@/src/types/adminDisputas';
import { DISPUTE_PARTY_LABELS } from '@/src/types/adminDisputas';
import { adminTheme } from './adminTheme';

type Props = {
  evidence: AdminDisputaEvidence[];
  onPressAdd?: () => void;
  adding?: boolean;
};

const PARTY_CORES: Record<string, { bg: string; border: string; text: string }> = {
  comprador: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  vendedor: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
};

function abrirMidia(url: string) {
  Linking.openURL(url).catch(() => {});
}

export function AdminDisputeEvidenceWall({ evidence, onPressAdd, adding }: Props) {
  const comprador = evidence.filter((e) => e.party === 'comprador');
  const vendedor = evidence.filter((e) => e.party === 'vendedor');
  const admin = evidence.filter((e) => e.party === 'admin');

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mural de evidências</Text>
          <Text style={styles.sub}>
            Fotos, vídeos e documentos enviados pelas partes e pelo mediador.
          </Text>
        </View>
        {onPressAdd ? (
          <Pressable
            style={[styles.addBtn, adding && styles.addBtnBusy]}
            onPress={onPressAdd}
            disabled={adding}>
            <Ionicons name="cloud-upload-outline" size={16} color="#042015" />
            <Text style={styles.addBtnText}>{adding ? 'Enviando…' : 'Anexar'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.columns}>
        <EvidenceColumn title="Acusação — comprador" items={comprador} party="comprador" />
        <EvidenceColumn title="Defesa — vendedor" items={vendedor} party="vendedor" />
        <EvidenceColumn title="Mediador Levou" items={admin} party="admin" />
      </View>

      {evidence.length === 0 ? (
        <Text style={styles.empty}>Nenhuma evidência anexada ainda.</Text>
      ) : null}
    </View>
  );
}

function EvidenceColumn({
  title,
  items,
  party,
}: {
  title: string;
  items: AdminDisputaEvidence[];
  party: string;
}) {
  const cores = PARTY_CORES[party] ?? PARTY_CORES.admin;

  return (
    <View style={[styles.column, { borderColor: cores.border, backgroundColor: cores.bg }]}>
      <Text style={[styles.columnTitle, { color: cores.text }]}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.columnEmpty}>Sem anexos</Text>
      ) : (
        items.map((item) => <EvidenceTile key={item.id} item={item} cores={cores} />)
      )}
    </View>
  );
}

function EvidenceTile({
  item,
  cores,
}: {
  item: AdminDisputaEvidence;
  cores: { bg: string; border: string; text: string };
}) {
  const isVideo = item.kind === 'video';

  return (
    <Pressable style={styles.tile} onPress={() => abrirMidia(item.mediaUrl)}>
      {isVideo ? (
        <View style={styles.videoThumb}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.videoLabel}>Vídeo</Text>
        </View>
      ) : (
        <Image source={{ uri: item.mediaUrl }} style={styles.photo} />
      )}
      <View style={styles.tileMeta}>
        <Text style={[styles.partyBadge, { color: cores.text }]}>
          {DISPUTE_PARTY_LABELS[item.party]} · {item.kind}
        </Text>
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: { fontSize: 16, fontWeight: '800', color: adminTheme.textPrimary },
  sub: { fontSize: 12, color: adminTheme.textSecondary, marginTop: 4, maxWidth: 520 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: adminTheme.neon,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnBusy: { opacity: 0.6 },
  addBtnText: { color: '#042015', fontWeight: '800', fontSize: 13 },
  columns: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    flexWrap: 'wrap',
  },
  column: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 220 : undefined,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  columnTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  columnEmpty: { fontSize: 12, color: adminTheme.textMuted, fontStyle: 'italic' },
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  photo: { width: '100%', height: 120, backgroundColor: '#E5E7EB' },
  videoThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  tileMeta: { padding: 10, gap: 4 },
  partyBadge: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  caption: { fontSize: 12, color: adminTheme.textSecondary, lineHeight: 16 },
  empty: {
    textAlign: 'center',
    color: adminTheme.textMuted,
    fontSize: 13,
    paddingVertical: 20,
  },
});
