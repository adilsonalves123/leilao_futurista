import { uriParaBytes } from '@/src/lib/uriToArrayBuffer';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { isMockMode } from '@/src/lib/mockMode';

export const SUPPORT_CHAT_BUCKET = 'support-chat';

function extensaoPorMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

export async function enviarFotoSuporteChat(
  conversationId: string,
  uri: string,
): Promise<string> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return uri;
  }

  const userId = await obterIdUsuarioAtual();
  if (!userId) {
    throw new Error('Faça login para enviar fotos.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return uri;
  }

  const { bytes, mime } = await uriParaBytes(uri);
  const ext = extensaoPorMime(mime);
  const path = `${userId}/${conversationId}/foto-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(SUPPORT_CHAT_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket "${SUPPORT_CHAT_BUCKET}" ausente. Execute supabase/migrations/034_support_chat_images.sql`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(SUPPORT_CHAT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
