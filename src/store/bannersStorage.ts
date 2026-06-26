import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  CARROSSEL_INICIO_INICIAL,
  CARROSSEL_LEILOES_INICIAL,
  type AppBanner,
} from './banners';

export const BANNERS_STORAGE_KEY = '@app:banners';

export type BannersPersistidos = {
  bannersInicio: AppBanner[];
  bannersLeiloes: AppBanner[];
};

function parseBanners(raw: string | null): BannersPersistidos | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<BannersPersistidos>;
    if (!Array.isArray(data.bannersInicio) || !Array.isArray(data.bannersLeiloes)) {
      return null;
    }
    return {
      bannersInicio: data.bannersInicio,
      bannersLeiloes: data.bannersLeiloes,
    };
  } catch {
    return null;
  }
}

/** Normaliza campos antes de persistir (mantém a ordem do array). */
export function normalizarCarrossel(lista: AppBanner[]): AppBanner[] {
  return lista.map((slide, indice) => ({
    ...slide,
    id: slide.id || String(Date.now() + indice),
    title: slide.title?.trim() || `Slide ${indice + 1}`,
    subtitle: slide.subtitle?.trim() || 'Oferta em destaque',
    image: slide.image?.trim() || '',
    link: slide.link?.trim() || '/leiloes',
    active: slide.active !== false,
  }));
}

export async function carregarBannersPersistidos(): Promise<BannersPersistidos | null> {
  try {
    let raw = await AsyncStorage.getItem(BANNERS_STORAGE_KEY);
    if (!raw && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(BANNERS_STORAGE_KEY);
    }
    return parseBanners(raw);
  } catch (error) {
    console.warn('[bannersStorage] Falha ao carregar:', error);
    return null;
  }
}

export async function salvarBannersPersistidos(
  dados: BannersPersistidos,
): Promise<void> {
  const payload: BannersPersistidos = {
    bannersInicio: normalizarCarrossel(dados.bannersInicio),
    bannersLeiloes: normalizarCarrossel(dados.bannersLeiloes),
  };

  const json = JSON.stringify(payload);

  try {
    await AsyncStorage.setItem(BANNERS_STORAGE_KEY, json);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(BANNERS_STORAGE_KEY, json);
    }
  } catch (error) {
    console.error('[bannersStorage] Falha ao salvar:', error);
    throw error;
  }
}

export function dadosIniciaisBanners(): BannersPersistidos {
  return {
    bannersInicio: CARROSSEL_INICIO_INICIAL,
    bannersLeiloes: CARROSSEL_LEILOES_INICIAL,
  };
}
