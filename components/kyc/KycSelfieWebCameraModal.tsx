import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors } from '@/src/theme/lightTokens';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
};

export function KycSelfieWebCameraModal({ visible, onClose, onCapture }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturando, setCapturando] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current || capturando) return;
    setCapturando(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.88,
      });
      if (photo?.uri) {
        onCapture(photo.uri);
        onClose();
      }
    } finally {
      setCapturando(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Selfie ao vivo</Text>
          <View style={styles.closeBtn} />
        </View>

        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={lightColors.accent} size="large" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="videocam-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.permTitle}>Permita o acesso à câmera</Text>
            <Text style={styles.permBody}>
              Para sua segurança, a selfie precisa ser capturada ao vivo. Não aceitamos upload de
              arquivos da galeria.
            </Text>
            <Pressable style={styles.permBtn} onPress={() => void requestPermission()}>
              <Text style={styles.permBtnText}>Permitir câmera</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cameraWrap}>
              <CameraView ref={cameraRef} facing="front" style={styles.camera} mirror />
              <View style={styles.faceOval} pointerEvents="none" />
            </View>

            <Text style={styles.hint}>
              Centralize o rosto no círculo. Boa iluminação, sem boné ou óculos escuros.
            </Text>

            <Pressable
              style={[styles.captureBtn, capturando && styles.captureBtnDisabled]}
              onPress={() => void handleCapture()}
              disabled={capturando}>
              {capturando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="camera" size={22} color="#FFFFFF" />
                  <Text style={styles.captureBtnText}>Capturar selfie</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#94A3B8',
    textAlign: 'center',
  },
  permBtn: {
    marginTop: spacing.sm,
    backgroundColor: lightColors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  permBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  faceOval: {
    position: 'absolute',
    top: '12%',
    left: '15%',
    right: '15%',
    bottom: '12%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    borderStyle: 'dashed',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: lightColors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
  },
  captureBtnDisabled: { opacity: 0.7 },
  captureBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
