import { uriParaBase64, uriParaBytes } from '@/src/lib/uriToArrayBuffer';

import { getSupabase } from '@/src/lib/supabase';



export const KYC_DOCUMENTS_BUCKET = 'kyc-documents';



const MAX_KYC_DB_BYTES = 4 * 1024 * 1024;



function extensaoPorMime(mime: string): string {

  if (mime.includes('png')) return 'png';

  if (mime.includes('webp')) return 'webp';

  return 'jpg';

}



function erroStorageCritico(message: string): boolean {

  const m = message.toLowerCase();

  return (

    m.includes('invalid or incompatible') ||

    m.includes('schema is out of sync') ||

    m.includes('database schema') ||

    m.includes('has no field "level"') ||

    m.includes('owner_id') ||

    m.includes('get_user_id')

  );

}



async function enviarViaStorage(

  userId: string,

  uri: string,

  tipo: 'documento' | 'selfie',

): Promise<string> {

  const supabase = getSupabase();

  if (!supabase) {

    throw new Error('Supabase não configurado. Conecte o projeto para enviar documentos.');

  }



  const { bytes, mime } = await uriParaBytes(uri);

  if (bytes.byteLength < 256) {

    throw new Error('A imagem não foi lida corretamente. Tire a foto de novo ou escolha outro arquivo.');

  }



  const ext = extensaoPorMime(mime);

  const path = `${userId}/${tipo}-${Date.now()}.${ext}`;

  const body = new Uint8Array(bytes);



  const { error } = await supabase.storage.from(KYC_DOCUMENTS_BUCKET).upload(path, body, {

    contentType: mime,

    upsert: true,

  });



  if (error) {

    if (erroStorageCritico(error.message)) {

      throw Object.assign(new Error(error.message), { storageCritico: true });

    }

    if (error.message.includes('Bucket not found')) {

      throw new Error(

        `Bucket "${KYC_DOCUMENTS_BUCKET}" ausente. Crie o bucket no painel Storage (privado) ou execute a migration 004.`,

      );

    }

    if (error.message.includes('row-level security') || error.message.includes('403')) {

      throw new Error(

        'Sem permissão no bucket kyc-documents. Execute 018_kyc_storage_policies_fix.sql. Detalhe: ' +

          error.message,

      );

    }

    throw new Error(error.message);

  }



  const { data: signed, error: signErr } = await supabase.storage

    .from(KYC_DOCUMENTS_BUCKET)

    .createSignedUrl(path, 60 * 60 * 24 * 365);



  if (signErr || !signed?.signedUrl) {

    return path;

  }



  return signed.signedUrl;

}



async function enviarViaBanco(

  uri: string,

  tipo: 'documento' | 'selfie',

): Promise<string> {

  const supabase = getSupabase();

  if (!supabase) {

    throw new Error('Supabase não configurado.');

  }



  const { base64, mime } = await uriParaBase64(uri);

  const approxBytes = Math.floor((base64.length * 3) / 4);

  if (approxBytes > MAX_KYC_DB_BYTES) {

    throw new Error('Imagem muito grande. Use uma foto menor ou com menos resolução.');

  }



  const { data, error } = await supabase.rpc('salvar_arquivo_kyc', {

    p_tipo: tipo,

    p_mime: mime,

    p_conteudo_base64: base64,

  });



  if (error) {

    if (

      error.message.includes('salvar_arquivo_kyc') ||

      error.message.includes('does not exist') ||

      error.code === 'PGRST202'

    ) {

      throw new Error(

        'Storage quebrado e fallback indisponível. No SQL Editor execute supabase/migrations/020_kyc_files_db_fallback.sql e tente de novo.',

      );

    }

    throw new Error(error.message);

  }



  if (!data || typeof data !== 'string') {

    throw new Error('Não foi possível salvar o documento no banco.');

  }



  return data;

}



export async function enviarDocumentoKyc(

  userId: string,

  uri: string,

  tipo: 'documento' | 'selfie',

): Promise<string> {

  try {

    return await enviarViaStorage(userId, uri, tipo);

  } catch (e) {

    const err = e as Error & { storageCritico?: boolean };

    if (!err.storageCritico && !erroStorageCritico(err.message ?? '')) {

      throw err;

    }



    try {

      return await enviarViaBanco(uri, tipo);

    } catch (fallbackErr) {

      const fb = fallbackErr as Error;

      throw new Error(

        'Storage do Supabase está com schema incompatível neste projeto. ' +

          'Execute 019_storage_objects_schema_repair.sql e 020_kyc_files_db_fallback.sql no SQL Editor. ' +

          'Detalhe Storage: ' +

          err.message +

          (fb.message ? ` | Fallback: ${fb.message}` : ''),

      );

    }

  }

}


