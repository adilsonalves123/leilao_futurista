import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type Props = {
  onPress: () => void;
};

/** Convite neutro ao Jarvis — sem veredito de mercado na tela pública do lote. */
export function AuctionAiInlineCard({ onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Consultar Jarvis sobre este leilão">
      <View style={styles.cornerTL} />
      <View style={styles.cornerBR} />

      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name="hardware-chip-outline" size={20} color={jarvis.cyan} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>JARVIS · LEVou</Text>
          <Text style={styles.title}>Dúvidas sobre este lote?</Text>
          <Text style={styles.subtitle}>
            Pergunte ao assistente antes de dar lance — análise sob demanda, só para você.
          </Text>
        </View>
      </View>

      <View style={styles.cta}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={jarvis.emerald} />
        <Text style={styles.ctaText}>Perguntar</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 4,
    backgroundColor: jarvis.slate950,
    borderWidth: 1,
    borderColor: jarvis.borderEmerald,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  cardPressed: {
    borderColor: 'rgba(6, 182, 212, 0.55)',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 8,
    height: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  eyebrow: {
    fontSize: 8,
    fontWeight: '800',
    color: jarvis.cyan,
    letterSpacing: 1.2,
    fontFamily: jarvisMono,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: jarvis.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: jarvis.textMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: jarvis.borderEmerald,
    flexShrink: 0,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: jarvis.emerald,
    fontFamily: jarvisMono,
  },
});
