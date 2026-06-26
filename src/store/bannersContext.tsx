import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { prepararCarrosselParaNuvem } from '@/src/services/bannerImageUpload';
import {
  carregarCarrosseisSupabase,
  isSupabaseBannersAvailable,
  salvarCarrosseisSupabase,
} from '@/src/services/bannersSupabase';
import {
  CAROUSEL_AUTOPLAY_MS,
  filtrarCarrosselAtivos,
  validarCarrossel,
  type AppBanner,
} from './banners';
import {
  carregarBannersPersistidos,
  dadosIniciaisBanners,
  normalizarCarrossel,
  salvarBannersPersistidos,
} from './bannersStorage';

type PublicarResultado =
  | { ok: true; aviso?: string }
  | { ok: false; erro: string };

type BannersContextValue = {
  carrosselInicio: AppBanner[];
  carrosselLeiloes: AppBanner[];
  carrosselInicioAtivos: AppBanner[];
  carrosselLeiloesAtivos: AppBanner[];
  autoplayIntervalMs: number;
  carregandoPersistencia: boolean;
  usandoSupabase: boolean;
  setCarrosselInicio: (lista: AppBanner[]) => void;
  setCarrosselLeiloes: (lista: AppBanner[]) => void;
  publicarCarrosselInicio: (lista: AppBanner[]) => Promise<PublicarResultado>;
  publicarCarrosselLeiloes: (lista: AppBanner[]) => Promise<PublicarResultado>;
  salvarTodosCarrosseis: (
    inicio: AppBanner[],
    leiloes: AppBanner[],
  ) => Promise<PublicarResultado>;
};

const BannersContext = createContext<BannersContextValue | null>(null);

export function BannersProvider({ children }: { children: ReactNode }) {
  const iniciais = dadosIniciaisBanners();
  const [carrosselInicio, setCarrosselInicio] = useState<AppBanner[]>(
    iniciais.bannersInicio,
  );
  const [carrosselLeiloes, setCarrosselLeiloes] = useState<AppBanner[]>(
    iniciais.bannersLeiloes,
  );
  const [carregandoPersistencia, setCarregandoPersistencia] = useState(true);
  const [usandoSupabase, setUsandoSupabase] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function hidratar() {
      try {
        if (isSupabaseBannersAvailable()) {
          const remoto = await carregarCarrosseisSupabase();
          if (!ativo) return;

          if (remoto) {
            setCarrosselInicio(remoto.bannersInicio);
            setCarrosselLeiloes(remoto.bannersLeiloes);
            setUsandoSupabase(true);
            await salvarBannersPersistidos(remoto);
            return;
          }

          console.warn(
            '[BannersProvider] Supabase ativo mas sem dados em banners — fallback local.',
          );
        }

        const local = await carregarBannersPersistidos();
        if (!ativo) return;

        if (local) {
          setCarrosselInicio(local.bannersInicio);
          setCarrosselLeiloes(local.bannersLeiloes);
        }
        setUsandoSupabase(false);
      } catch (error) {
        if (__DEV__) {
          console.warn('[BannersProvider] Hidratação com fallback local:', error);
        }
      } finally {
        if (ativo) setCarregandoPersistencia(false);
      }
    }

    hidratar();
    return () => {
      ativo = false;
    };
  }, []);

  const carrosselInicioAtivos = useMemo(
    () => filtrarCarrosselAtivos(carrosselInicio),
    [carrosselInicio],
  );

  const carrosselLeiloesAtivos = useMemo(
    () => filtrarCarrosselAtivos(carrosselLeiloes),
    [carrosselLeiloes],
  );

  const persistirRemotoELocal = useCallback(
    async (
      inicio: AppBanner[],
      leiloes: AppBanner[],
    ): Promise<PublicarResultado> => {
      const inicioNorm = normalizarCarrossel(inicio);
      const leiloesNorm = normalizarCarrossel(leiloes);
      let aviso: string | undefined;

      let inicioFinal = inicioNorm;
      let leiloesFinal = leiloesNorm;

      if (isSupabaseBannersAvailable()) {
        try {
          inicioFinal = await prepararCarrosselParaNuvem(inicioNorm, 'inicio');
          leiloesFinal = await prepararCarrosselParaNuvem(leiloesNorm, 'leiloes');
        } catch (err) {
          return {
            ok: false,
            erro:
              err instanceof Error
                ? err.message
                : 'Falha ao enviar imagens dos banners para o Supabase Storage.',
          };
        }

        const resultado = await salvarCarrosseisSupabase(inicioFinal, leiloesFinal);
        if (resultado.ok) {
          setUsandoSupabase(true);
        } else {
          setUsandoSupabase(false);
          aviso =
            resultado.erro ||
            'Não foi possível sincronizar com o Supabase. Os dados foram salvos neste dispositivo.';
          console.warn('[BannersProvider] Supabase falhou; gravando cache local:', resultado.erro);
        }
      }

      try {
        await salvarBannersPersistidos({
          bannersInicio: inicioFinal,
          bannersLeiloes: leiloesFinal,
        });
        setCarrosselInicio(inicioFinal);
        setCarrosselLeiloes(leiloesFinal);
        return aviso ? { ok: true, aviso } : { ok: true };
      } catch (err) {
        console.error('ERRO DO SUPABASE (cache local após save):', err);
        return {
          ok: false,
          erro:
            err instanceof Error
              ? err.message
              : 'Falha ao gravar no dispositivo. Verifique o console.',
        };
      }
    },
    [],
  );

  const publicarCarrosselInicio = useCallback(
    async (lista: AppBanner[]): Promise<PublicarResultado> => {
      const alvo = normalizarCarrossel(lista);
      const erro = validarCarrossel(alvo, 'da Home');
      if (erro) return { ok: false, erro };

      try {
        return await persistirRemotoELocal(alvo, carrosselLeiloes);
      } catch (err) {
        console.error('ERRO DO SUPABASE (publicar carrossel Início):', err);
        return {
          ok: false,
          erro: err instanceof Error ? err.message : 'Erro ao publicar carrossel da Home.',
        };
      }
    },
    [carrosselLeiloes, persistirRemotoELocal],
  );

  const publicarCarrosselLeiloes = useCallback(
    async (lista: AppBanner[]): Promise<PublicarResultado> => {
      const alvo = normalizarCarrossel(lista);
      const erro = validarCarrossel(alvo, 'de Leilões');
      if (erro) return { ok: false, erro };

      try {
        return await persistirRemotoELocal(carrosselInicio, alvo);
      } catch (err) {
        console.error('ERRO DO SUPABASE (publicar carrossel Leilões):', err);
        return {
          ok: false,
          erro: err instanceof Error ? err.message : 'Erro ao publicar carrossel de Leilões.',
        };
      }
    },
    [carrosselInicio, persistirRemotoELocal],
  );

  const salvarTodosCarrosseis = useCallback(
    async (inicio: AppBanner[], leiloes: AppBanner[]): Promise<PublicarResultado> => {
      const inicioNorm = normalizarCarrossel(inicio);
      const leiloesNorm = normalizarCarrossel(leiloes);

      const erroInicio = validarCarrossel(inicioNorm, 'da Home');
      if (erroInicio) return { ok: false, erro: erroInicio };

      const erroLeiloes = validarCarrossel(leiloesNorm, 'de Leilões');
      if (erroLeiloes) return { ok: false, erro: erroLeiloes };

      try {
        return await persistirRemotoELocal(inicioNorm, leiloesNorm);
      } catch (err) {
        console.error('ERRO DO SUPABASE (salvar todos os carrosséis):', err);
        return { ok: false, erro: 'Falha ao salvar os carrosséis.' };
      }
    },
    [persistirRemotoELocal],
  );

  const value = useMemo(
    () => ({
      carrosselInicio,
      carrosselLeiloes,
      carrosselInicioAtivos,
      carrosselLeiloesAtivos,
      autoplayIntervalMs: CAROUSEL_AUTOPLAY_MS,
      carregandoPersistencia,
      usandoSupabase,
      setCarrosselInicio,
      setCarrosselLeiloes,
      publicarCarrosselInicio,
      publicarCarrosselLeiloes,
      salvarTodosCarrosseis,
    }),
    [
      carrosselInicio,
      carrosselLeiloes,
      carrosselInicioAtivos,
      carrosselLeiloesAtivos,
      carregandoPersistencia,
      usandoSupabase,
      publicarCarrosselInicio,
      publicarCarrosselLeiloes,
      salvarTodosCarrosseis,
    ],
  );

  return (
    <BannersContext.Provider value={value}>{children}</BannersContext.Provider>
  );
}

export function useBanners() {
  const ctx = useContext(BannersContext);
  if (!ctx) {
    throw new Error('useBanners deve ser usado dentro de BannersProvider');
  }
  return ctx;
}
