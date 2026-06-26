import { BANNERS_INICIAIS } from '@/src/admin/mockData';
import type { AdminBanner } from '@/src/admin/types';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { precisaUploadParaNuvem, uriImagemExibivelNoApp } from '@/src/utils/bannerImageUri';

function supabaseDisponivelParaUpload(): boolean {
  return !isMockMode() && getSupabase() !== null;
}

/** Slide de um carrossel (Home ou Leilões). */
export type AppBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  active: boolean;
};

export const CAROUSEL_AUTOPLAY_MS = 3500;

export function adminBannerParaApp(banner: AdminBanner, subtitle: string): AppBanner {
  return {
    id: banner.id,
    title: banner.titulo,
    subtitle,
    image: banner.imagemUrl,
    link: banner.linkDestino,
    active: banner.status === 'ativo',
  };
}

/** Carrossel da Tela de Início (Home). */
export const CARROSSEL_INICIO_INICIAL: AppBanner[] = BANNERS_INICIAIS.map((b, i) =>
  adminBannerParaApp(b, i === 0 ? 'Destaque Principal' : 'Promoção Exclusiva'),
);

/** Carrossel da Tela de Leilões. */
export const CARROSSEL_LEILOES_INICIAL: AppBanner[] = [
  {
    id: 'leil-1',
    title: 'MacBook Pro M3 Max',
    subtitle: 'Tecnologia Avançada',
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
    link: '/leiloes?categoria=eletronicos',
    active: true,
  },
  {
    id: 'leil-2',
    title: 'CyberCruiser Elétrico v4',
    subtitle: 'Mobilidade Urbana',
    image:
      'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop',
    link: '/leiloes?categoria=veiculos',
    active: true,
  },
  {
    id: 'leil-3',
    title: 'Smart-Glass Holográfico',
    subtitle: 'Realidade Virtual',
    image:
      'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=1200&auto=format&fit=crop',
    link: '/auction/premium-vr',
    active: true,
  },
];

export function filtrarCarrosselAtivos(lista: AppBanner[]): AppBanner[] {
  return lista.filter((b) => b.active && uriImagemExibivelNoApp(b.image));
}

export function validarCarrossel(lista: AppBanner[], rotulo: string): string | null {
  if (lista.length === 0) {
    return `Adicione pelo menos um slide ao carrossel ${rotulo}.`;
  }
  for (const slide of lista) {
    if (!slide.image.trim()) {
      return `Um slide do carrossel ${rotulo} está sem imagem.`;
    }
    if (precisaUploadParaNuvem(slide.image) && !supabaseDisponivelParaUpload()) {
      return `O slide "${slide.title || 'sem título'}" usa imagem do navegador (blob). Conecte o Supabase e salve de novo para enviar ao Storage.`;
    }
    if (!precisaUploadParaNuvem(slide.image) && !uriImagemExibivelNoApp(slide.image)) {
      return `O slide "${slide.title || 'sem título'}" tem URL de imagem inválida para o app.`;
    }
    if (!slide.link.trim()) {
      return `O slide "${slide.title || 'sem título'}" (${rotulo}) precisa de link.`;
    }
  }
  if (filtrarCarrosselAtivos(lista).length === 0) {
    return `Ative pelo menos um slide no carrossel ${rotulo}.`;
  }
  return null;
}

export function moverSlideEsquerda(lista: AppBanner[], indice: number): AppBanner[] {
  if (indice <= 0) return lista;
  const nova = [...lista];
  [nova[indice - 1], nova[indice]] = [nova[indice], nova[indice - 1]];
  return nova;
}

export function moverSlideDireita(lista: AppBanner[], indice: number): AppBanner[] {
  if (indice >= lista.length - 1) return lista;
  const nova = [...lista];
  [nova[indice], nova[indice + 1]] = [nova[indice + 1], nova[indice]];
  return nova;
}

export function criarSlideNovo(image: string, tituloPadrao: string): AppBanner {
  return {
    id: String(Date.now()),
    image,
    title: tituloPadrao,
    subtitle: 'Oferta em destaque',
    link: '/leiloes',
    active: true,
  };
}
