import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type SttCallbacks = {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

type SttEngine = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

type NativeSpeechModule = {
  isRecognitionAvailable?: () => boolean;
  requestPermissionsAsync?: () => Promise<{ granted: boolean }>;
  addListener?: (event: string, cb: (payload: unknown) => void) => { remove: () => void };
  start?: (opts: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop?: () => void;
};

const LOCALE = 'pt-BR';

function getNativeSpeechModule(): NativeSpeechModule | null {
  if (Platform.OS === 'web') return null;
  return requireOptionalNativeModule<NativeSpeechModule>('ExpoSpeechRecognition');
}

function createWebEngine(callbacks: SttCallbacks): SttEngine | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const Win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  const SpeechRecognitionCtor = Win.SpeechRecognition ?? Win.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  let recognition: SpeechRecognition | null = null;

  return {
    start: async () => {
      recognition = new SpeechRecognitionCtor();
      recognition.lang = LOCALE;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) finalText += chunk;
          else interim += chunk;
        }
        if (interim.trim()) callbacks.onInterim?.(interim.trim());
        if (finalText.trim()) callbacks.onFinal(finalText.trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted') return;
        callbacks.onError?.(
          event.error === 'not-allowed'
            ? 'Permita o microfone no navegador.'
            : `Reconhecimento de voz: ${event.error}`,
        );
      };

      recognition.onend = () => {
        callbacks.onEnd?.();
        recognition = null;
      };

      recognition.start();
    },
    stop: async () => {
      recognition?.abort();
      recognition = null;
    },
  };
}

function createNativeEngine(callbacks: SttCallbacks): SttEngine | null {
  if (Platform.OS === 'web') return null;

  const ExpoSpeechRecognitionModule = getNativeSpeechModule();
  if (!ExpoSpeechRecognitionModule?.isRecognitionAvailable?.()) return null;

  const subs: Array<{ remove: () => void }> = [];

  return {
    start: async () => {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync?.();
      if (!perm?.granted) {
        callbacks.onError?.('Permissão de microfone negada.');
        return;
      }

      subs.push(
        ExpoSpeechRecognitionModule.addListener!('result', (event: unknown) => {
          const payload = event as {
            results?: Array<{ transcript?: string }>;
            isFinal?: boolean;
          };
          const text = payload.results?.[0]?.transcript?.trim() ?? '';
          if (!text) return;
          if (payload.isFinal) callbacks.onFinal(text);
          else callbacks.onInterim?.(text);
        }),
      );

      subs.push(
        ExpoSpeechRecognitionModule.addListener!('error', (event: unknown) => {
          const payload = event as { error?: string };
          if (payload.error && payload.error !== 'aborted') {
            callbacks.onError?.(`Reconhecimento: ${payload.error}`);
          }
        }),
      );

      subs.push(
        ExpoSpeechRecognitionModule.addListener!('end', () => {
          subs.forEach((s) => s.remove());
          subs.length = 0;
          callbacks.onEnd?.();
        }),
      );

      ExpoSpeechRecognitionModule.start?.({
        lang: LOCALE,
        interimResults: true,
        continuous: false,
      });
    },
    stop: async () => {
      ExpoSpeechRecognitionModule.stop?.();
      subs.forEach((s) => s.remove());
      subs.length = 0;
    },
  };
}

export function criarMotorStt(callbacks: SttCallbacks): SttEngine | null {
  return createWebEngine(callbacks) ?? createNativeEngine(callbacks);
}

export function sttDisponivel(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const Win = window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(Win.SpeechRecognition || Win.webkitSpeechRecognition);
  }

  const mod = getNativeSpeechModule();
  return Boolean(mod?.isRecognitionAvailable?.());
}
