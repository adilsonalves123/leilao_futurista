import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ListingCoverPhotoTipsCard } from '@/components/listing/ListingCoverPhotoTipsCard';
import { ListingPhotoPreviewModal } from '@/components/listing/ListingPhotoPreviewModal';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
};

type Props = {
  coverPhoto: string | null;
  onCoverPhotoChange: (uri: string | null) => void;
  galleryPhotos: string[];
  onGalleryPhotosChange: (uris: string[]) => void;
  maxPhotos: number;
  listingCategory?: string;
};

export function buildListingPhotoUrls(
  coverPhoto: string | null,
  galleryPhotos: string[]
): string[] {
  return coverPhoto ? [coverPhoto, ...galleryPhotos] : [];
}

export function ListingCoverPhotosSection({
  coverPhoto,
  onCoverPhotoChange,
  galleryPhotos,
  onGalleryPhotosChange,
  maxPhotos,
  listingCategory = '',
}: Props) {
  const maxGallery = Math.max(0, maxPhotos - 1);
  const canAddGallery = !!coverPhoto && galleryPhotos.length < maxGallery;

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewUris = useMemo(
    () => (coverPhoto ? [coverPhoto, ...galleryPhotos] : []),
    [coverPhoto, galleryPhotos],
  );

  const previewLabels = useMemo(() => {
    if (!coverPhoto) return [];
    return [
      'Capa do leilão',
      ...galleryPhotos.map((_, i) => `Galeria ${i + 1}`),
    ];
  }, [coverPhoto, galleryPhotos]);

  function openPreview(index: number) {
    if (previewUris[index]) setPreviewIndex(index);
  }

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

  async function takeCoverPhoto() {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onCoverPhotoChange(result.assets[0].uri);
    }
  }

  async function pickCoverFromGallery() {
    if (!(await ensureGalleryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onCoverPhotoChange(result.assets[0].uri);
    }
  }

  async function takeGalleryPhoto() {
    if (!canAddGallery) {
      if (!coverPhoto) {
        Alert.alert('Foto de capa', 'Adicione a foto de capa antes das fotos da galeria.');
      }
      return;
    }
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onGalleryPhotosChange([...galleryPhotos, result.assets[0].uri].slice(0, maxGallery));
    }
  }

  async function pickGalleryFromLibrary() {
    if (!canAddGallery) {
      if (!coverPhoto) {
        Alert.alert('Foto de capa', 'Adicione a foto de capa antes das fotos da galeria.');
      }
      return;
    }
    if (!(await ensureGalleryPermission())) return;
    const remaining = maxGallery - galleryPhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      onGalleryPhotosChange(
        [...galleryPhotos, ...newUris].slice(0, maxGallery)
      );
    }
  }

  function removeGalleryPhoto(index: number) {
    onGalleryPhotosChange(galleryPhotos.filter((_, i) => i !== index));
  }

  function promoteGalleryToCover(index: number) {
    const picked = galleryPhotos[index];
    if (!picked) return;
    const nextGallery = galleryPhotos.filter((_, i) => i !== index);
    if (coverPhoto) {
      nextGallery.unshift(coverPhoto);
    }
    onCoverPhotoChange(picked);
    onGalleryPhotosChange(nextGallery.slice(0, maxGallery));
  }

  function PhotoActions({
    onTakePhoto,
    onPickFromGallery,
    disabled,
    disabledHint,
  }: {
    onTakePhoto: () => void;
    onPickFromGallery: () => void;
    disabled?: boolean;
    disabledHint?: string;
  }) {
    return (
      <View>
        {disabled && disabledHint ? (
          <Text style={styles.disabledHint}>{disabledHint}</Text>
        ) : null}
        <View style={styles.photoBtnRow}>
          <Pressable
            style={[styles.photoActionBtn, disabled && styles.photoActionBtnDisabled]}
            onPress={onTakePhoto}
            disabled={disabled}>
            <Ionicons name="camera-outline" size={18} color={disabled ? C.textMuted : C.accent} />
            <Text
              style={[styles.photoActionBtnText, disabled && styles.photoActionBtnTextDisabled]}>
              Tirar foto
            </Text>
          </Pressable>
          <Pressable
            style={[styles.photoActionBtn, disabled && styles.photoActionBtnDisabled]}
            onPress={onPickFromGallery}
            disabled={disabled}>
            <Ionicons name="images-outline" size={18} color={disabled ? C.textMuted : C.accent} />
            <Text
              style={[styles.photoActionBtnText, disabled && styles.photoActionBtnTextDisabled]}>
              Galeria
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>Foto de capa *</Text>
      <Text style={styles.sectionHint}>
        Esta foto aparece na Home e nos cards do leilão. Toque na imagem para ampliar.
      </Text>

      <Pressable
        style={styles.coverFrame}
        onPress={() => coverPhoto && openPreview(0)}
        disabled={!coverPhoto}
        accessibilityRole="imagebutton"
        accessibilityLabel={coverPhoto ? 'Ampliar foto de capa' : 'Adicionar foto de capa'}>
        {coverPhoto ? (
          <>
            <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
            <View style={styles.zoomHint} pointerEvents="none">
              <Ionicons name="expand-outline" size={14} color="#FFF" />
              <Text style={styles.zoomHintText}>Toque para ampliar</Text>
            </View>
            <Pressable
              style={styles.coverRemove}
              onPress={() => onCoverPhotoChange(null)}
              accessibilityLabel="Remover foto de capa">
              <Text style={styles.coverRemoveText}>×</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.coverEmpty}>
            <Ionicons name="image-outline" size={36} color={C.textMuted} />
            <Text style={styles.coverEmptyText}>Adicione a foto principal do item</Text>
          </View>
        )}
      </Pressable>

      <PhotoActions onTakePhoto={takeCoverPhoto} onPickFromGallery={pickCoverFromGallery} />

      <ListingCoverPhotoTipsCard category={listingCategory} />

      <Text style={styles.gallerySectionLabel}>Fotos da galeria</Text>
      <Text style={styles.sectionHint}>
        {coverPhoto
          ? `Opcional — até ${maxGallery} foto(s) na página do leilão (${galleryPhotos.length}/${maxGallery}).`
          : 'Fotos extras do item na página do leilão (além da capa).'}
      </Text>

      <PhotoActions
        onTakePhoto={takeGalleryPhoto}
        onPickFromGallery={pickGalleryFromLibrary}
        disabled={!canAddGallery}
        disabledHint={
          !coverPhoto
            ? 'Adicione a foto de capa acima para incluir fotos na galeria.'
            : undefined
        }
      />

      {galleryPhotos.length > 0 ? (
        <View style={styles.galleryGrid}>
          {galleryPhotos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.galleryThumbWrap}>
              <Pressable onPress={() => openPreview(index + 1)} accessibilityLabel={`Ampliar galeria ${index + 1}`}>
                <Image source={{ uri }} style={styles.galleryThumb} />
              </Pressable>
              <Pressable
                style={styles.galleryPromote}
                onPress={() => promoteGalleryToCover(index)}
                accessibilityLabel="Usar como capa">
                <Text style={styles.galleryPromoteText}>Capa</Text>
              </Pressable>
              <Pressable
                style={styles.galleryRemove}
                onPress={() => removeGalleryPhoto(index)}
                accessibilityLabel="Remover foto da galeria">
                <Text style={styles.galleryRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <ListingPhotoPreviewModal
        visible={previewIndex != null}
        uris={previewUris}
        labels={previewLabels}
        index={previewIndex ?? 0}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  gallerySectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 12, color: C.textSecondary, marginBottom: 10, lineHeight: 17 },
  coverFrame: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentBorder,
    marginBottom: 10,
  },
  coverImage: { width: '100%', height: '100%' },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  coverEmptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomHintText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
  coverRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverRemoveText: { color: '#FFF', fontSize: 18, lineHeight: 20, fontWeight: '700' },
  photoBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accentBorder,
    backgroundColor: '#FFF',
  },
  photoActionBtnDisabled: { opacity: 0.5 },
  photoActionBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },
  photoActionBtnTextDisabled: { color: C.textMuted },
  disabledHint: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  galleryThumbWrap: { width: '30%', aspectRatio: 1, position: 'relative' },
  galleryThumb: { width: '100%', height: '100%', borderRadius: 10 },
  galleryPromote: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: C.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  galleryPromoteText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  galleryRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRemoveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
