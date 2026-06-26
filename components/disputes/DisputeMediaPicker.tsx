import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/src/theme/tokens';

export const MAX_DISPUTE_MEDIA = 5;

type MediaItem = {
  uri: string;
  kind: 'foto' | 'video';
};

type Props = {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  disabled?: boolean;
};

export function DisputeMediaPicker({ items, onChange, disabled }: Props) {
  async function pick(origem: 'camera' | 'galeria' | 'video') {
    if (disabled || items.length >= MAX_DISPUTE_MEDIA) return;

    if (origem === 'video') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para vídeos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.85,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        onChange([...items, { uri: result.assets[0].uri, kind: 'video' }]);
      }
      return;
    }

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
        onChange([...items, { uri: result.assets[0].uri, kind: 'foto' }]);
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
      onChange([...items, { uri: result.assets[0].uri, kind: 'foto' }]);
    }
  }

  function remover(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Fotos e vídeos (até {MAX_DISPUTE_MEDIA})</Text>
      <Text style={styles.hint}>
        Evidências ajudam a equipe Levou a mediar mais rápido. Inclua embalagem, produto e defeito.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item, index) => (
          <View key={`${item.uri}-${index}`} style={styles.thumbWrap}>
            {item.kind === 'video' ? (
              <View style={styles.videoThumb}>
                <Ionicons name="videocam" size={28} color={colors.neonCyan} />
                <Text style={styles.videoLabel}>Vídeo</Text>
              </View>
            ) : (
              <Image source={{ uri: item.uri }} style={styles.thumb} />
            )}
            <Pressable style={styles.removeBtn} onPress={() => remover(index)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={colors.neonPink} />
            </Pressable>
          </View>
        ))}

        {items.length < MAX_DISPUTE_MEDIA ? (
          <>
            <Pressable style={styles.addBtn} onPress={() => pick('camera')} disabled={disabled}>
              <Ionicons name="camera-outline" size={22} color={colors.neonCyan} />
              <Text style={styles.addText}>Câmera</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => pick('galeria')} disabled={disabled}>
              <Ionicons name="images-outline" size={22} color={colors.neonCyan} />
              <Text style={styles.addText}>Foto</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => pick('video')} disabled={disabled}>
              <Ionicons name="videocam-outline" size={22} color={colors.neonPink} />
              <Text style={styles.addText}>Vídeo</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
  },
  videoThumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
  },
  videoLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  removeBtn: { position: 'absolute', top: -6, right: -6 },
  addBtn: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});
