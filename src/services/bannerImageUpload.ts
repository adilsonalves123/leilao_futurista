import { uriParaBytes } from '@/src/lib/uriToArrayBuffer';
import { getSupabase } from '@/src/lib/supabase';
import { isSupabaseBannersAvailable } from '@/src/services/bannersSupabase';
import type { AppBanner } from '@/src/store/banners';
import { precisaUploadParaNuvem } from '@/src/utils/bannerImageUri';

export const BANNER_SLIDES_BUCKET = 'banner-slides';

function extensaoPorMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

/** Envia imagem local/blob para o Storage e devolve URL https pública. */
export async function garantirUrlImagemPublica(
  uri: string,
  pasta: 'inicio' | 'leiloes',
  slideId: string,
): Promise<string> {
  if (!precisaUploadParaNuvem(uri)) return uri;

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Imagem escolhida no navegador não funciona no celular sem Supabase. Conecte o projeto ou use um link https.',
    );
  }

  const { bytes, mime } = await uriParaBytes(uri);
  const ext = extensaoPorMime(mime);
  const path = `${pasta}/${slideId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BANNER_SLIDES_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket "${BANNER_SLIDES_BUCKET}" ausente. Execute supabase/migrations/003_banner_slides_storage.sql`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(BANNER_SLIDES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function prepararCarrosselParaNuvem(
  slides: AppBanner[],
  pasta: 'inicio' | 'leiloes',
): Promise<AppBanner[]> {
  if (!isSupabaseBannersAvailable()) return slides;

  const preparados: AppBanner[] = [];
  for (const slide of slides) {
    const image = await garantirUrlImagemPublica(slide.image, pasta, slide.id);
    preparados.push({ ...slide, image });
  }
  return preparados;
}
