import { Dimensions, StyleSheet, View } from 'react-native';
import { effects } from '@/src/theme/tokens';

const { width: W, height: H } = Dimensions.get('window');
const H_LINES = 14;
const V_LINES = 8;

export function AuctionGridOverlay() {
  return (
    <View style={styles.root} pointerEvents="none">
      {Array.from({ length: H_LINES }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={[styles.lineH, { top: (H / (H_LINES - 1)) * i }]}
        />
      ))}
      {Array.from({ length: V_LINES }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={[styles.lineV, { left: (W / (V_LINES - 1)) * i }]}
        />
      ))}
      <View style={[styles.scanline, { top: H * 0.38 }]} />
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  lineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: effects.gridLine,
  },
  lineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: effects.gridLine,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: effects.scanline,
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: effects.cornerBracket,
  },
  cornerTL: {
    top: 48,
    left: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 48,
    right: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 32,
    left: 16,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 32,
    right: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
});
