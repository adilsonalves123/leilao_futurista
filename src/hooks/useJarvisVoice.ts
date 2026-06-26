import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { jarvisFalar, jarvisPararFala, jarvisEstaFalando } from '@/src/lib/jarvisVoice/tts';
import { criarMotorStt, sttDisponivel } from '@/src/lib/jarvisVoice/stt';

const VOZ_STORAGE_KEY = 'jarvis_voz_resposta_ativa';

type Options = {
  onTranscriptInterim?: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
};

export function useJarvisVoice(options: Options = {}) {
  const [escutando, setEscutando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [vozRespostaAtiva, setVozRespostaAtiva] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const motorRef = useRef<ReturnType<typeof criarMotorStt> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sttOk = useMemo(() => sttDisponivel(), []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const salvo = localStorage.getItem(VOZ_STORAGE_KEY);
      if (salvo != null) setVozRespostaAtiva(salvo === '1');
    }
  }, []);

  const pararEscuta = useCallback(async () => {
    await motorRef.current?.stop();
    motorRef.current = null;
    setEscutando(false);
  }, []);

  const iniciarEscuta = useCallback(async () => {
    if (escutando) {
      await pararEscuta();
      return;
    }

    setErro(null);
    await jarvisPararFala();

    const motor = criarMotorStt({
      onInterim: (text) => optionsRef.current.onTranscriptInterim?.(text),
      onFinal: (text) => optionsRef.current.onTranscriptFinal?.(text),
      onError: (message) => setErro(message),
      onEnd: () => {
        setEscutando(false);
        motorRef.current = null;
      },
    });

    if (!motor) {
      setErro(
        Platform.OS === 'web'
          ? 'Seu navegador não suporta voz. Use Chrome ou Edge.'
          : 'Voz no celular exige build nativo (npx expo run:android). No Expo Go use o teclado.',
      );
      return;
    }

    motorRef.current = motor;
    setEscutando(true);
    try {
      await motor.start();
    } catch (e) {
      setEscutando(false);
      motorRef.current = null;
      setErro(e instanceof Error ? e.message : 'Falha ao iniciar microfone.');
    }
  }, [escutando, pararEscuta]);

  const falarResposta = useCallback(
    async (texto: string) => {
      if (!vozRespostaAtiva || !texto.trim()) return;
      setFalando(true);
      try {
        await jarvisFalar(texto);
      } finally {
        setFalando(false);
      }
    },
    [vozRespostaAtiva],
  );

  const toggleVozResposta = useCallback(() => {
    setVozRespostaAtiva((prev) => {
      const next = !prev;
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(VOZ_STORAGE_KEY, next ? '1' : '0');
      }
      if (!next) void jarvisPararFala();
      return next;
    });
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setFalando(jarvisEstaFalando()), 400);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    return () => {
      void pararEscuta();
      void jarvisPararFala();
    };
  }, [pararEscuta]);

  return {
    sttOk,
    escutando,
    falando,
    vozRespostaAtiva,
    erro,
    iniciarEscuta,
    pararEscuta,
    falarResposta,
    toggleVozResposta,
    limparErro: () => setErro(null),
  };
}
