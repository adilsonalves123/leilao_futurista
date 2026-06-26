import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { MAX_REVIEW_PHOTOS } from '@/src/types/review';
import { colors, radii, spacing } from '@/src/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  uris: string[];
  onChange: (uris: string[]) => void;
  disabled?: boolean;
};

export function ReviewPhotoPicker({ uris, onChange, disabled }: Props) {
  const scaleAnims = useRef<Animated.Value[]>([]);

  function getScale(index: number) {
    if (!scaleAnims.current[index]) {
      scaleAnims.current[index] = new Animated.Value(0.85);
      Animated.spring(scaleAnims.current[index], {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
    return scaleAnims.current[index];
  }

  async function pick(origem: 'camera' | 'galeria') {
    if (disabled || uris.length >= MAX_REVIEW_PHOTOS) return;

    if (origem === 'galeria') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        adicionar(result.assets[0].uri);
      }
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      adicionar(result.assets[0].uri);
    }
  }

  function adicionar(uri: string) {
    if (uris.length >= MAX_REVIEW_PHOTOS) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange([...uris, uri]);
  }

  function remover(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange(uris.filter((_, i) => i !== index));
  }

  function escolherOrigem() {
    if (disabled) return;
    if (uris.length >= MAX_REVIEW_PHOTOS) {
      Alert.alert('Limite atingido', `Máximo de ${MAX_REVIEW_PHOTOS} fotos por avaliação.`);
      return;
    }
    Alert.alert('Anexar foto real', 'Mostre o produto recebido para ajudar outros compradores.', [
      { text: 'Tirar foto agora', onPress: () => pick('camera') },
      { text: 'Escolher da galeria', onPress: () => pick('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {uris.map((uri, index) => (
          <Animated.View
            key={`${uri}-${index}`}
            style={[styles.thumbWrap, { transform: [{ scale: getScale(index) }] }]}>
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            {!disabled ? (
              <Pressable style={styles.removeBtn} onPress={() => remover(index)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color="#FF007A" />
              </Pressable>
            ) : null}
          </Animated.View>
        ))}

        {uris.length < MAX_REVIEW_PHOTOS ? (
          <Pressable
            style={[styles.addBtn, disabled && styles.addBtnDisabled]}
            onPress={escolherOrigem}
            disabled={disabled}>
            <Ionicons name="camera-outline" size={26} color={colors.neonCyan} />
            <Text style={styles.addText}>Adicionar</Text>
            <Text style={styles.addHint}>{uris.length}/{MAX_REVIEW_PHOTOS}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.footerHint}>
        Fotos reais aumentam a confiança na plataforma. Evite imagens genéricas da internet.
      </Text>
    </View>
  );
}

const THUMB = 88;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  thumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(10,10,12,0.75)',
    borderRadius: 12,
  },
  addBtn: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,242,254,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addBtnDisabled: { opacity: 0.45 },
  addText: { fontSize: 10, fontWeight: '700', color: colors.neonCyan },
  addHint: { fontSize: 9, color: colors.textMuted },
  footerHint: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
});
