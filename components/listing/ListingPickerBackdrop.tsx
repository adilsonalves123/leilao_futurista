import { Image, StyleSheet, View } from 'react-native';

const pickerBackground = require('@/assets/images/martelo.jpg');

/** strong = etapa 2 (escolha); light = 1 e 5; subtle = 3 e 4 (formulários). */
export type ListingBackdropIntensity = 'strong' | 'light' | 'subtle';

const C = {
  bg: '#FAFAFE',
};

const INTENSITY = {
  strong: {
    imageOpacity: 0.95,
    fadeTop: 'rgba(250, 250, 254, 0.28)',
    wash: null as string | null,
  },
  light: {
    imageOpacity: 0.82,
    fadeTop: 'rgba(250, 250, 254, 0.22)',
    wash: 'rgba(250, 250, 254, 0.1)',
  },
  subtle: {
    imageOpacity: 0.68,
    fadeTop: 'rgba(250, 250, 254, 0.18)',
    wash: 'rgba(250, 250, 254, 0.14)',
  },
} as const;

type Props = {
  intensity?: ListingBackdropIntensity;
};

/**
 * Fundo fixo do fluxo de cadastro (martelo.jpg).
 * Intensidade varia por etapa; ainda visível nas etapas de formulário.
 */
export function ListingPickerBackdrop({ intensity = 'strong' }: Props) {
  const preset = INTENSITY[intensity];

  return (
    <View style={styles.layer} pointerEvents="none">
      <Image
        source={pickerBackground}
        style={[styles.background, { opacity: preset.imageOpacity }]}
        resizeMode="cover"
      />
      {preset.wash ? <View style={[styles.wash, { backgroundColor: preset.wash }]} /> : null}
      <View style={[styles.fadeTop, { backgroundColor: preset.fadeTop }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
  },
});
