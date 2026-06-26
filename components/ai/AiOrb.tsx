import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

export type AiOrbSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';
export type AiOrbVariant = 'admin' | 'buyer';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  size?: AiOrbSize;
  variant?: AiOrbVariant;
  animate?: boolean;
  style?: ViewStyle;
};

const SIZE_MAP: Record<AiOrbSize, { outer: number; inner: number; icon: number; ring: number }> = {
  xs: { outer: 30, inner: 30, icon: 13, ring: 38 },
  sm: { outer: 36, inner: 36, icon: 14, ring: 44 },
  md: { outer: 40, inner: 40, icon: 16, ring: 50 },
  lg: { outer: 52, inner: 52, icon: 18, ring: 64 },
  hero: { outer: 72, inner: 52, icon: 28, ring: 88 },
};

const VARIANT = {
  admin: {
    color: '#05FF9B',
    glow: 'rgba(5, 255, 155, 0.12)',
    ring: 'rgba(5, 255, 155, 0.35)',
    border: 'rgba(5, 255, 155, 0.25)',
    innerBg: 'rgba(5, 255, 155, 0.12)',
  },
  buyer: {
    color: '#7C3AED',
    glow: 'rgba(124, 58, 237, 0.15)',
    ring: 'rgba(124, 58, 237, 0.35)',
    border: 'rgba(124, 58, 237, 0.2)',
    innerBg: 'rgba(124, 58, 237, 0.1)',
  },
} as const;

export function AiOrb({
  icon = 'sparkles',
  size = 'sm',
  variant = 'admin',
  animate = true,
  style,
}: Props) {
  const dims = SIZE_MAP[size];
  const theme = VARIANT[variant];
  const isHero = size === 'hero';
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    ringLoop.start();

    return () => {
      pulseLoop.stop();
      ringLoop.stop();
    };
  }, [animate, pulse, ring]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  const outerSize = dims.outer;
  const innerSize = isHero ? dims.inner : dims.outer;

  return (
    <View style={[styles.wrap, { width: dims.ring, height: dims.ring }, style]}>
      {animate ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: dims.ring,
              height: dims.ring,
              borderRadius: dims.ring / 2,
              borderColor: theme.ring,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.outer,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            backgroundColor: theme.glow,
            borderColor: theme.border,
            transform: animate ? [{ scale }] : undefined,
          },
        ]}>
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: isHero ? theme.innerBg : 'transparent',
            },
          ]}>
          <Ionicons name={icon} size={dims.icon} color={theme.color} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#05FF9B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
