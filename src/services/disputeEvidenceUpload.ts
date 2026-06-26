import { uriParaBytes } from '@/src/lib/uriToArrayBuffer';
import { getSupabase } from '@/src/lib/supabase';

export const DISPUTE_EVIDENCE_BUCKET = 'dispute-evidence';

function extensaoPorMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  return 'jpg';
}

export async function enviarEvidenciaDisputa(
  disputeId: string,
  party: string,
  uri: string,
  index: number,
): Promise<{ url: string; kind: 'foto' | 'video' }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { bytes, mime } = await uriParaBytes(uri);
  const isVideo = mime.startsWith('video/');
  const ext = extensaoPorMime(mime);
  const path = `${disputeId}/${party}/${isVideo ? 'video' : 'foto'}-${index}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket "${DISPUTE_EVIDENCE_BUCKET}" ausente. Execute a migration 060_order_disputes.sql`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, kind: isVideo ? 'video' : 'foto' };
}
