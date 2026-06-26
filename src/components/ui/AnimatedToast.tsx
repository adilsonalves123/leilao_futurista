import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastVariant = 'success' | 'error';

type AnimatedToastProps = {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  onHide?: () => void;
  durationMs?: number;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
  success: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: 'checkmark-circle',
    iconColor: '#059669',
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: 'alert-circle',
    iconColor: '#DC2626',
  },
};

export function AnimatedToast({
  visible,
  message,
  variant = 'success',
  onHide,
  durationMs = 2800,
}: AnimatedToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 9,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onHide?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, durationMs, onHide, opacity, translateY]);

  if (!visible) return null;

  const theme = VARIANT_STYLES[variant];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          top: insets.top + 12,
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Ionicons name={theme.icon} size={22} color={theme.iconColor} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1625',
  },
});
