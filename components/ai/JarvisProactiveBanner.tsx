import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';
import { dispensarAlertaJarvis } from '@/src/lib/jarvisAlertDismiss';
import type { BuyerJarvisAlert } from '@/src/types/buyerJarvis';

type Props = {
  alertas: BuyerJarvisAlert[];
  onOpenJarvis: () => void;
  onDismiss: () => void;
  bottomOffset: number;
  visible?: boolean;
};

function severityColor(severity: BuyerJarvisAlert['severity']) {
  if (severity === 'critical') return '#FCA5A5';
  if (severity === 'warning') return '#FCD34D';
  return jarvis.cyan;
}

export function JarvisProactiveBanner({
  alertas,
  onOpenJarvis,
  onDismiss,
  bottomOffset,
  visible = true,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!visible || !alertas.length) return null;

  const alerta = alertas[0];

  function handlePress() {
    if (alerta.action_url) {
      try {
        router.push(alerta.action_url as never);
      } catch {
        onOpenJarvis();
      }
    } else {
      onOpenJarvis();
    }
  }

  async function handleDismiss(e?: { stopPropagation?: () => void }) {
    e?.stopPropagation?.();
    await dispensarAlertaJarvis(alerta);
    onDismiss();
  }

  return (
    <View style={[styles.wrap, { bottom: bottomOffset + insets.bottom }]}>
      <Pressable
        style={styles.tapArea}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Alerta Jarvis: ${alerta.title}`}>
        <View style={styles.scanBar}>
          <Text style={styles.scanText}>JARVIS_SIGNAL</Text>
          <View style={styles.liveDot} />
        </View>
        <View style={styles.body}>
          <Ionicons name="radio-outline" size={14} color={severityColor(alerta.severity)} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: severityColor(alerta.severity) }]} numberOfLines={1}>
              {alerta.title}
            </Text>
            <Text style={styles.detail} numberOfLines={1}>
              {alerta.detail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={jarvis.textMuted} />
        </View>
        {alertas.length > 1 ? (
          <Text style={styles.more}>+{alertas.length - 1} alerta(s) · toque para abrir</Text>
        ) : null}
      </Pressable>
      <Pressable
        style={styles.closeBtn}
        onPress={() => handleDismiss()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dispensar alerta por 24 horas">
        <Ionicons name="close" size={14} color={jarvis.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 20,
    borderRadius: 4,
    backgroundColor: jarvis.slate950,
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
    overflow: 'hidden',
  },
  tapArea: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    paddingRight: 30,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6,182,212,0.15)',
  },
  scanText: {
    fontSize: 6,
    fontWeight: '800',
    color: jarvis.textMuted,
    letterSpacing: 1.2,
    fontFamily: jarvisMono,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: jarvis.emerald,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 11, fontWeight: '800' },
  detail: { fontSize: 10, lineHeight: 14, color: jarvis.textSecondary },
  more: {
    fontSize: 8,
    color: jarvis.cyan,
    fontFamily: jarvisMono,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
});
