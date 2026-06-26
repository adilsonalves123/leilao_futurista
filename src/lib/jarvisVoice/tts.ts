import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

const LOCALE = 'pt-BR';

let falando = false;

export function jarvisEstaFalando(): boolean {
  return falando;
}

export async function jarvisFalar(texto: string): Promise<void> {
  const limpo = texto.replace(/\*\*/g, '').replace(/[#>`]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!limpo) return;

  await jarvisPararFala();

  return new Promise((resolve) => {
    falando = true;
    Speech.speak(limpo, {
      language: LOCALE,
      pitch: Platform.OS === 'ios' ? 0.95 : 1,
      rate: Platform.OS === 'ios' ? 0.52 : 0.9,
      onDone: () => {
        falando = false;
        resolve();
      },
      onStopped: () => {
        falando = false;
        resolve();
      },
      onError: () => {
        falando = false;
        resolve();
      },
    });
  });
}

export async function jarvisPararFala(): Promise<void> {
  falando = false;
  await Speech.stop();
}
