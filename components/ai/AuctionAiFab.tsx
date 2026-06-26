import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JarvisRobotIcon } from '@/components/ai/JarvisRobotIcon';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';

const FAB_SIZE = 58;
const FAB_MARGIN = 12;
const STORAGE_KEY = '@levou/jarvis_fab_position';
const DRAG_SLOP = 10;

type Props = {
  onPress: () => void;
  bottomOffset?: number;
};

type Position = { x: number; y: number };

export function AuctionAiFab({ onPress, bottomOffset = 24 }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const pan = useRef(new Animated.ValueXY()).current;
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const didDragRef = useRef(false);
  const onPressRef = useRef(onPress);
  const [ready, setReady] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.35)).current;
  const corePulse = useRef(new Animated.Value(0.85)).current;

  onPressRef.current = onPress;

  const bounds = useMemo(
    () => ({
      minX: FAB_MARGIN,
      minY: insets.top + FAB_MARGIN,
      maxX: Math.max(FAB_MARGIN, screenW - FAB_SIZE - FAB_MARGIN),
      maxY: Math.max(
        insets.top + FAB_MARGIN,
        screenH - FAB_SIZE - Math.max(insets.bottom, FAB_MARGIN),
      ),
    }),
    [screenW, screenH, insets],
  );

  const clamp = useCallback(
    (x: number, y: number): Position => ({
      x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
    }),
    [bounds],
  );

  const defaultPosition = useCallback(
    (): Position => clamp(screenW - FAB_SIZE - 16, screenH - FAB_SIZE - bottomOffset),
    [screenW, screenH, bottomOffset, clamp],
  );

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;

        let pos = defaultPosition();
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Position;
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
              pos = clamp(parsed.x, parsed.y);
            }
          } catch {
            /* posição inválida — usa padrão */
          }
        }

        positionRef.current = pos;
        pan.setValue(pos);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        const pos = defaultPosition();
        positionRef.current = pos;
        pan.setValue(pos);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clamp, defaultPosition, pan]);

  useEffect(() => {
    if (!ready) return;
    const pos = clamp(positionRef.current.x, positionRef.current.y);
    positionRef.current = pos;
    pan.setValue(pos);
  }, [bounds, clamp, pan, ready]);

  const persistPosition = useCallback((pos: Position) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pos)).catch(() => undefined);
  }, []);

  const handleOpen = useCallback(() => {
    onPressRef.current();
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > DRAG_SLOP || Math.abs(gesture.dy) > DRAG_SLOP,
        onPanResponderGrant: () => {
          dragging.current = false;
          setPressed(true);
          dragStart.current = { ...positionRef.current };
        },
        onPanResponderMove: (_, gesture) => {
          const distance = Math.hypot(gesture.dx, gesture.dy);
          if (distance < DRAG_SLOP) return;

          dragging.current = true;
          setIsDragging(true);
          const next = clamp(
            dragStart.current.x + gesture.dx,
            dragStart.current.y + gesture.dy,
          );
          pan.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          setPressed(false);
          const distance = Math.hypot(gesture.dx, gesture.dy);

          if (!dragging.current && distance < DRAG_SLOP) {
            didDragRef.current = false;
            if (Platform.OS !== 'web') {
              handleOpen();
            }
            return;
          }

          const next = clamp(
            dragStart.current.x + gesture.dx,
            dragStart.current.y + gesture.dy,
          );
          positionRef.current = next;
          pan.setValue(next);
          persistPosition(next);
          didDragRef.current = true;
          dragging.current = false;
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          setPressed(false);
          setIsDragging(false);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [clamp, handleOpen, pan, persistPosition],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1.28,
              duration: 2000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0.05,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1,
              duration: 2000,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0.38,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.timing(corePulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(corePulse, { toValue: 0.82, duration: 1400, useNativeDriver: true }),
        ]),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [corePulse, ringOpacity, ringScale]);

  if (!ready) return null;

  return (
    <Animated.View
      style={[styles.wrap, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
      {...(Platform.OS === 'web'
        ? {
            onClick: () => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              handleOpen();
            },
          }
        : {})}
      accessibilityRole="button"
      accessibilityLabel="Abrir Jarvis — assistente. Arraste para mover.">
      <Animated.View
        style={[
          styles.pulseRing,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
        pointerEvents="none"
      />
      <View style={[styles.fab, pressed && styles.fabPressed, isDragging && styles.fabDragging]}>
        <Animated.View style={{ opacity: corePulse }} pointerEvents="none">
          <JarvisRobotIcon size={34} active={!isDragging} tone="light" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 9999,
    elevation: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: 'rgba(130, 10, 209, 0.22)',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.purple,
    shadowColor: m.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: m.purpleDeep,
  },
  fabDragging: {
    opacity: 0.92,
    backgroundColor: m.purpleBrand,
  },
});
