import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BuyerJarvisAlert } from '@/src/types/buyerJarvis';

const STORAGE_KEY = 'jarvis_alertas_dispensados_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

type DismissedMap = Record<string, number>;

export function alertaId(a: BuyerJarvisAlert): string {
  return `${a.kind}::${a.title}`;
}

async function lerMapa(): Promise<DismissedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DismissedMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function salvarMapa(mapa: DismissedMap): Promise<void> {
  const now = Date.now();
  const limpo = Object.fromEntries(
    Object.entries(mapa).filter(([, until]) => typeof until === 'number' && until > now),
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limpo));
}

export async function dispensarAlertaJarvis(alerta: BuyerJarvisAlert): Promise<void> {
  const mapa = await lerMapa();
  mapa[alertaId(alerta)] = Date.now() + TTL_MS;
  await salvarMapa(mapa);
}

export async function dispensarAlertasJarvis(alertas: BuyerJarvisAlert[]): Promise<void> {
  if (!alertas.length) return;
  const mapa = await lerMapa();
  const until = Date.now() + TTL_MS;
  for (const a of alertas) mapa[alertaId(a)] = until;
  await salvarMapa(mapa);
}

export async function filtrarAlertasDispensados(
  alertas: BuyerJarvisAlert[],
): Promise<BuyerJarvisAlert[]> {
  const mapa = await lerMapa();
  const now = Date.now();
  return alertas.filter((a) => {
    const until = mapa[alertaId(a)];
    return !(typeof until === 'number' && until > now);
  });
}
