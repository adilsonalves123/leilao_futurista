import { uriParaBytes } from '@/src/lib/uriToArrayBuffer';
import { getSupabase } from '@/src/lib/supabase';

export const REVIEW_IMAGES_BUCKET = 'review-images';

function extensaoPorMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

export async function enviarFotoReview(
  orderId: string,
  buyerId: string,
  uri: string,
  index: number,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { bytes, mime } = await uriParaBytes(uri);
  const ext = extensaoPorMime(mime);
  const path = `${orderId}/${buyerId}/foto-${index}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(REVIEW_IMAGES_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket "${REVIEW_IMAGES_BUCKET}" ausente. Execute a migration 012_reviews_images.sql`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(REVIEW_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function enviarFotosReview(
  orderId: string,
  buyerId: string,
  uris: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i += 1) {
    const url = await enviarFotoReview(orderId, buyerId, uris[i], i);
    urls.push(url);
  }
  return urls;
}
