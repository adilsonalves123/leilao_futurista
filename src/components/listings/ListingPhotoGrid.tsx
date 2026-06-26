import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const MAX_PHOTOS = 10;

const C = {
  accent: '#7C3AED',
  white: '#FFFFFF',
  textMuted: '#9CA3AF',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
};

type ListingPhotoGridProps = {
  photos: string[];
  onPhotosChange: (uris: string[]) => void;
  disabled?: boolean;
};

export function ListingPhotoGrid({ photos, onPhotosChange, disabled }: ListingPhotoGridProps) {
  async function ensureCameraPermission(): Promise<boolean> {
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const pickerStatus = await ImagePicker.requestCameraPermissionsAsync();
    const granted = cameraStatus.granted && pickerStatus.granted;
    if (!granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
    }
    return granted;
  }

  async function ensureGalleryPermission(): Promise<boolean> {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para escolher fotos.');
    }
    return granted;
  }

  async function takePhoto() {
    if (disabled || photos.length >= MAX_PHOTOS) return;
    if (!(await ensureCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  }

  async function pickFromGallery() {
    if (disabled || photos.length >= MAX_PHOTOS) return;
    if (!(await ensureGalleryPermission())) return;

    const remaining = MAX_PHOTOS - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      onPhotosChange([...photos, ...newUris].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(index: number) {
    if (disabled) return;
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  const canAddMore = !disabled && photos.length < MAX_PHOTOS;

  return (
    <View>
      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {!disabled ? (
                <Pressable
                  style={styles.photoRemoveBtn}
                  onPress={() => removePhoto(index)}
                  hitSlop={6}
                  accessibilityLabel="Remover foto"
                  accessibilityRole="button">
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.photoEmptyState}>
          <Ionicons name="images-outline" size={28} color={C.textMuted} />
          <Text style={styles.photoEmptyText}>Nenhuma foto no anúncio</Text>
        </View>
      )}

      {canAddMore ? (
        <View style={styles.photoBtnRow}>
          <Pressable style={styles.photoActionBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={18} color={C.accent} />
            <Text style={styles.photoActionBtnText}>Tirar Foto</Text>
          </Pressable>
          <Pressable style={styles.photoActionBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={18} color={C.accent} />
            <Text style={styles.photoActionBtnText}>Abrir Galeria</Text>
          </Pressable>
        </View>
      ) : disabled ? (
        <Text style={styles.photoHint}>Edição de fotos bloqueada após o primeiro lance.</Text>
      ) : (
        <Text style={styles.photoLimitText}>Limite de {MAX_PHOTOS} fotos atingido.</Text>
      )}

      <Text style={styles.photoCountText}>
        {photos.length}/{MAX_PHOTOS} fotos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: C.border,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 22, 37, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    marginBottom: 12,
    backgroundColor: C.accentSoft,
    borderRadius: 14,
  },
  photoEmptyText: { fontSize: 13, color: C.textMuted },
  photoBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    backgroundColor: C.white,
  },
  photoActionBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },
  photoLimitText: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  photoHint: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 4 },
  photoCountText: { fontSize: 11, color: C.textMuted, textAlign: 'right' },
});
