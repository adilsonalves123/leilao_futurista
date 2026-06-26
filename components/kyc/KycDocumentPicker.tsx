import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KycValidatedBadge } from '@/components/kyc/KycValidatedBadge';
import { lightColors } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';

type KycDocumentPickerProps = {
  label: string;
  hint: string;
  uri: string | null;
  onChange: (uri: string) => void;
  disabled?: boolean;
  validated?: boolean;
};

export function KycDocumentPicker({
  label,
  hint,
  uri,
  onChange,
  disabled,
  validated,
}: KycDocumentPickerProps) {
  async function pick(origem: 'camera' | 'galeria') {
    if (disabled) return;

    if (origem === 'galeria') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar o documento.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.88,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
      }
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar o documento.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.88,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }

  function escolherOrigem() {
    if (disabled) return;
    Alert.alert('Anexar documento', 'Como deseja enviar a foto do RG ou CNH?', [
      { text: 'Tirar Foto', onPress: () => pick('camera') },
      { text: 'Escolher da Galeria', onPress: () => pick('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {validated ? <KycValidatedBadge /> : null}
      </View>
      <Text style={styles.hint}>{hint}</Text>

      <Pressable
        style={[styles.card, uri && styles.cardFilled, disabled && styles.cardDisabled]}
        onPress={escolherOrigem}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Documento anexado. Toque para alterar.' : 'Toque para anexar documento'}>
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.successText}>Documento anexado</Text>
            </View>
            <View style={styles.changeOverlay}>
              <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" />
              <Text style={styles.changeText}>Alterar foto</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconWrap}>
              <Ionicons name="id-card-outline" size={32} color={lightColors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Toque para anexar</Text>
            <Text style={styles.emptySub}>RG ou CNH — frente legível</Text>
            <View style={styles.optionsHint}>
              <View style={styles.optionChip}>
                <Ionicons name="camera-outline" size={14} color={lightColors.accent} />
                <Text style={styles.optionChipText}>Tirar Foto</Text>
              </View>
              <View style={styles.optionChip}>
                <Ionicons name="images-outline" size={14} color={lightColors.accent} />
                <Text style={styles.optionChipText}>Galeria</Text>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: lightColors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  card: {
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: lightColors.inputBg,
  },
  cardFilled: {
    borderStyle: 'solid',
    borderColor: 'rgba(5, 150, 105, 0.4)',
  },
  cardDisabled: { opacity: 0.65 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: lightColors.textMuted,
  },
  optionsHint: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: lightColors.textSecondary,
  },
  previewImage: { width: '100%', height: '100%' },
  successRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(26, 22, 37, 0.55)',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
