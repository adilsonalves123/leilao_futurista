import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { JarvisAiAvatar } from '@/components/ai/JarvisAiAvatar';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type UiVariant = 'modern' | 'terminal';

type Props = {
  label?: string;
  compact?: boolean;
  variant?: UiVariant;
};

function TypingDots() {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 360, useNativeDriver: true }),
        ]),
      );

    const l1 = pulse(a, 0);
    const l2 = pulse(b, 120);
    const l3 = pulse(c, 240);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a, b, c]);

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

export function JarvisScanIndicator({
  label = 'Jarvis está pensando…',
  compact = false,
  variant = 'modern',
}: Props) {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === 'modern') return;
    const loop = Animated.loop(
      Animated.timing(scan, { toValue: 1, duration: 1800, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [scan, variant]);

  const translateX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  if (variant === 'modern') {
    return (
      <View style={[styles.modernRow, compact && styles.modernRowCompact]}>
        <JarvisAiAvatar size={compact ? 28 : 32} />
        <View style={[styles.modernBubble, compact && styles.modernBubbleCompact]}>
          <TypingDots />
          <Text style={[styles.modernText, compact && styles.modernTextCompact]}>{label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.avatar} />
      <View style={[styles.bubble, compact && styles.bubbleCompact]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
        </View>
        <Text style={[styles.text, compact && styles.textCompact]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modernRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginVertical: 6, paddingHorizontal: 4 },
  modernRowCompact: { marginVertical: 4 },
  modernBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    backgroundColor: m.botBubble,
    borderWidth: 1,
    borderColor: m.border,
    gap: 6,
    minWidth: 160,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  modernBubbleCompact: { paddingVertical: 10, minWidth: 140 },
  modernText: { fontSize: 14, color: m.textSecondary, fontWeight: '500' },
  modernTextCompact: { fontSize: 13 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: m.purple },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginVertical: 4 },
  rowCompact: { marginVertical: 2 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 3,
    backgroundColor: jarvis.glassBg,
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
    gap: 6,
    minWidth: 180,
    overflow: 'hidden',
  },
  bubbleCompact: { paddingVertical: 8, minWidth: 150 },
  track: {
    height: 2,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  fill: { width: 50, height: 2, backgroundColor: jarvis.cyan, borderRadius: 1 },
  text: { fontSize: 10, color: jarvis.cyan, fontWeight: '700', fontFamily: jarvisMono, letterSpacing: 0.5 },
  textCompact: { fontSize: 9 },
});
