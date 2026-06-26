import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { lightColors } from '@/src/theme/lightTokens';

const { width: W, height: H } = Dimensions.get('window');

export function FluidLightBackground() {
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);

  useEffect(() => {
    drift1.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-12, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    drift2.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 6200, easing: Easing.inOut(Easing.ease) }),
        withTiming(14, { duration: 6200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [drift1, drift2]);

  const sphere1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift1.value * 0.6 }],
  }));

  const sphere2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift2.value * -0.5 }],
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.sphere, styles.sphere1, sphere1Style]} />
      <Animated.View style={[styles.sphere, styles.sphere2, sphere2Style]} />
      <Animated.View style={[styles.sphere, styles.sphere3, sphere1Style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: lightColors.background,
    overflow: 'hidden',
  },
  sphere: {
    position: 'absolute',
    borderRadius: 999,
  },
  sphere1: {
    width: W * 0.85,
    height: W * 0.85,
    top: -H * 0.12,
    left: -W * 0.2,
    backgroundColor: lightColors.sphereLilac,
  },
  sphere2: {
    width: W * 0.7,
    height: W * 0.7,
    top: H * 0.35,
    right: -W * 0.25,
    backgroundColor: lightColors.spherePurple,
  },
  sphere3: {
    width: W * 0.55,
    height: W * 0.55,
    bottom: -H * 0.08,
    left: W * 0.15,
    backgroundColor: lightColors.sphereViolet,
  },
});
