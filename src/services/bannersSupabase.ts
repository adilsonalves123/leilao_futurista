import { getSupabase } from '@/src/lib/supabase';
import { isMockMode } from '@/src/lib/mockMode';
import { humanizarErroSupabaseFetch } from '@/src/lib/supabaseEnv';
import type { Json } from '@/src/types/database';
import {
  CARROSSEL_INICIO_INICIAL,
  CARROSSEL_LEILOES_INICIAL,
  type AppBanner,
} from '@/src/store/banners';
import {
  normalizarCarrossel,
  type BannersPersistidos,
} from '@/src/store/bannersStorage';

const BANNERS_ROW_ID = 1;

function parseSlidesJson(raw: unknown, fallback: AppBanner[]): AppBanner[] {
  if (!Array.isArray(raw)) return fallback;
  const parsed = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as AppBanner);
  return normalizarCarrossel(parsed.length > 0 ? parsed : fallback);
}

export function isSupabaseBannersAvailable(): boolean {
  return !isMockMode() && getSupabase() !== null;
}

/** Carrega carrosséis da tabela `banners` (id = 1). */
export async function carregarCarrosseisSupabase(): Promise<BannersPersistidos | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[bannersSupabase] Cliente Supabase indisponível (mock ou .env ausente).');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('banners')
      .select('id, inicio, leiloes, updated_at')
      .eq('id', BANNERS_ROW_ID)
      .maybeSingle();

    if (error) {
      if (__DEV__) {
        console.warn('[bannersSupabase] Carregar remoto falhou (usa cache local):', error.message);
      }
      return null;
    }

    if (!data) {
      console.warn(
        '[bannersSupabase] Nenhuma linha id=1 na tabela banners. Execute supabase/migrations/002_app_banners.sql',
      );
      return null;
    }

    return {
      bannersInicio: parseSlidesJson(data.inicio, CARROSSEL_INICIO_INICIAL),
      bannersLeiloes: parseSlidesJson(data.leiloes, CARROSSEL_LEILOES_INICIAL),
    };
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[bannersSupabase] Carregar remoto falhou (usa cache local):',
        humanizarErroSupabaseFetch(err),
      );
    }
    return null;
  }
}

/** Persiste os dois carrosséis via upsert na tabela `banners`. */
export async function salvarCarrosseisSupabase(
  inicio: AppBanner[],
  leiloes: AppBanner[],
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: false,
      erro: 'Supabase não configurado. Verifique o .env e USE_MOCK_BACKEND em mockMode.ts.',
    };
  }

  const inicioNorm = normalizarCarrossel(inicio);
  const leiloesNorm = normalizarCarrossel(leiloes);

  try {
    const { error } = await supabase.from('banners').upsert(
      [
        {
          id: BANNERS_ROW_ID,
          inicio: inicioNorm as unknown as Json,
          leiloes: leiloesNorm as unknown as Json,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' },
    );

    if (error) {
      console.error('ERRO DO SUPABASE (salvar banners):', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: { id: BANNERS_ROW_ID, slidesInicio: inicioNorm.length, slidesLeiloes: leiloesNorm.length },
      });
      return {
        ok: false,
        erro: error.message || 'Falha ao gravar na tabela banners.',
      };
    }

    console.log('[bannersSupabase] Carrosséis salvos no Supabase:', {
      inicio: inicioNorm.length,
      leiloes: leiloesNorm.length,
    });
    return { ok: true };
  } catch (err) {
    console.error('ERRO DO SUPABASE (salvar banners — exceção):', err);
    return {
      ok: false,
      erro: humanizarErroSupabaseFetch(err),
    };
  }
}
