import { deveUsarBackendLeilaoLocal } from '@/src/lib/auctionIds';
import { uriParaBytes } from '@/src/lib/uriToArrayBuffer';
import { getSupabase } from '@/src/lib/supabase';

export const AUCTION_IMAGES_BUCKET = 'auction-images';

function extensaoPorMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function isUrlRemota(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export async function enviarFotoAnuncio(
  auctionId: string,
  sellerId: string,
  uri: string,
  index: number,
): Promise<string> {
  if (isUrlRemota(uri)) return uri;

  if (deveUsarBackendLeilaoLocal(auctionId)) {
    return uri;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { bytes, mime } = await uriParaBytes(uri);
  const ext = extensaoPorMime(mime);
  const path = `${sellerId}/${auctionId}/foto-${index}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(AUCTION_IMAGES_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket "${AUCTION_IMAGES_BUCKET}" ausente. Execute supabase/migrations/013_auction_listing_edit.sql`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(AUCTION_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function enviarFotosAnuncio(
  auctionId: string,
  sellerId: string,
  uris: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i += 1) {
    const url = await enviarFotoAnuncio(auctionId, sellerId, uris[i], i);
    urls.push(url);
  }
  return urls;
}
