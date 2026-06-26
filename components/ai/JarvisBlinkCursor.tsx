import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

export function JarvisBlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 530, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 530, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.Text pointerEvents="none" style={[styles.cursor, { opacity }]}>▌</Animated.Text>
  );
}

const styles = StyleSheet.create({
  cursor: {
    fontSize: 14,
    color: jarvis.cyan,
    lineHeight: 22,
    fontFamily: jarvisMono,
  },
});
