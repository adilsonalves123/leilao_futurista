import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { KycSelfieWebCameraModal } from '@/components/kyc/KycSelfieWebCameraModal';
import { KycValidatedBadge } from '@/components/kyc/KycValidatedBadge';
import { useKycCapturePlatform } from '@/src/hooks/useKycCapturePlatform';
import { verificarSelfieKyc } from '@/src/services/kycSelfieVerify';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type KycSelfiePickerProps = {
  uri: string | null;
  onChange: (uri: string | null) => void;
  onVerifiedChange?: (verified: boolean) => void;
  disabled?: boolean;
  validated?: boolean;
};

export function KycSelfiePicker({
  uri,
  onChange,
  onVerifiedChange,
  disabled,
  validated,
}: KycSelfiePickerProps) {
  const [verificando, setVerificando] = useState(false);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);
  const [cameraModalAberta, setCameraModalAberta] = useState(false);
  const { requiresLiveWebcam } = useKycCapturePlatform();

  async function processarSelfie(capturedUri: string) {
    setVerificando(true);
    setUltimoErro(null);
    onChange(capturedUri);
    onVerifiedChange?.(false);

    try {
      const resultado = await verificarSelfieKyc(capturedUri);

      if (!resultado.ok) {
        onChange(null);
        onVerifiedChange?.(false);
        setUltimoErro(resultado.error ?? 'Não foi possível verificar a selfie.');
        Alert.alert(
          'Verificação indisponível',
          resultado.error ?? 'Tente novamente em instantes ou verifique a conexão.',
        );
        return;
      }

      if (!resultado.approved) {
        onChange(null);
        onVerifiedChange?.(false);
        const detalhe =
          resultado.issues?.length
            ? resultado.issues.join('\n• ')
            : resultado.summary ?? 'Não identificamos um rosto humano real.';
        setUltimoErro(detalhe);
        Alert.alert(
          'Selfie não aprovada',
          `${resultado.summary ?? 'Tire outra foto com rosto visível e boa iluminação.'}\n\n${resultado.issues?.length ? `• ${detalhe}` : ''}`,
        );
        return;
      }

      onVerifiedChange?.(true);
      setUltimoErro(null);
    } finally {
      setVerificando(false);
    }
  }

  async function capturarSelfieNativo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera frontal para a selfie.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.88,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await processarSelfie(result.assets[0].uri);
    }
  }

  async function capturarSelfie() {
    if (disabled || verificando) return;

    if (requiresLiveWebcam) {
      setCameraModalAberta(true);
      return;
    }

    await capturarSelfieNativo();
  }

  const bloqueado = disabled || verificando;
  const hintTexto = requiresLiveWebcam
    ? 'No celular, use a câmera frontal ao vivo. Upload de arquivo não é permitido.'
    : 'A IA confirma se há um rosto humano real antes de enviar o cadastro.';

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Selfie de verificação</Text>
        {validated && !verificando ? <KycValidatedBadge label="Rosto verificado" /> : null}
      </View>
      <Text style={styles.hint}>{hintTexto}</Text>

      <Pressable
        style={[
          styles.card,
          uri && styles.cardFilled,
          validated && styles.cardValidated,
          ultimoErro && !uri && styles.cardRejected,
          bloqueado && styles.cardDisabled,
        ]}
        onPress={capturarSelfie}
        disabled={bloqueado}
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Selfie anexada. Toque para refazer.' : 'Toque para capturar selfie'}>
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
            {verificando ? (
              <View style={styles.verifyingOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.verifyingText}>Verificando rosto com IA…</Text>
              </View>
            ) : (
              <>
                <View style={styles.successBadge}>
                  <Ionicons
                    name={validated ? 'shield-checkmark' : 'checkmark-circle'}
                    size={22}
                    color="#059669"
                  />
                </View>
                <View style={styles.overlay}>
                  <Ionicons name="camera-reverse-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.overlayText}>Refazer selfie</Text>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            {verificando ? (
              <>
                <ActivityIndicator color={lightColors.accent} size="large" />
                <Text style={styles.emptyTitle}>Analisando…</Text>
              </>
            ) : (
              <>
                <View style={styles.iconRing}>
                  <Ionicons name="person-circle-outline" size={40} color={lightColors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Capturar selfie</Text>
                <Text style={styles.emptySub}>
                  {requiresLiveWebcam
                    ? 'Câmera ao vivo — sem galeria'
                    : 'Toque para abrir a câmera frontal'}
                </Text>
              </>
            )}
          </View>
        )}
      </Pressable>

      {ultimoErro && !uri ? <Text style={styles.errorText}>{ultimoErro}</Text> : null}

      <Text style={styles.instruction}>
        Posicione seu rosto no centro, com boa iluminação. Evite foto de tela, máscaras, bonés ou
        filtros que alterem o rosto.
      </Text>

      {requiresLiveWebcam ? (
        <KycSelfieWebCameraModal
          visible={cameraModalAberta}
          onClose={() => setCameraModalAberta(false)}
          onCapture={(capturedUri) => void processarSelfie(capturedUri)}
        />
      ) : null}
    </View>
  );
}

const SELFIE_SIZE = 168;

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
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hint: {
    fontSize: 12,
    color: lightColors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  card: {
    alignSelf: 'center',
    width: SELFIE_SIZE,
    height: SELFIE_SIZE,
    borderRadius: SELFIE_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: lightColors.inputBg,
  },
  cardFilled: {
    borderStyle: 'solid',
    borderColor: 'rgba(5, 150, 105, 0.45)',
  },
  cardValidated: {
    borderColor: 'rgba(5, 150, 105, 0.65)',
  },
  cardRejected: {
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  cardDisabled: { opacity: 0.65 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: lightColors.textMuted,
    textAlign: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 22, 37, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  verifyingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(26, 22, 37, 0.55)',
  },
  overlayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 17,
  },
  instruction: {
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 18,
    color: lightColors.textSecondary,
    textAlign: 'center',
    fontFamily: fonts.timerRegular,
    letterSpacing: 0.3,
  },
});
