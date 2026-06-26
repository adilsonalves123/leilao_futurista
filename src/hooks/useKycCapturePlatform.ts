import { Platform, useWindowDimensions } from 'react-native';

import { WEB_LAYOUT } from '@/src/theme/webLayout';

/** Contexto de captura KYC — web desktop bloqueado, mobile web exige webcam ao vivo. */
export function useKycCapturePlatform() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= WEB_LAYOUT.kycDesktopMinWidth;
  const isMobileWeb = isWeb && !isDesktopWeb;

  return {
    isWeb,
    isDesktopWeb,
    isMobileWeb,
    /** Cadastro KYC completo indisponível no notebook/desktop */
    kycCadastroBlockedOnWeb: isDesktopWeb,
    /** Selfie deve usar câmera ao vivo (sem pasta/arquivo) */
    requiresLiveWebcam: isMobileWeb,
  };
}
