import { Platform } from 'react-native';

/** Converte URI local (file://, content://) ou remota em bytes para upload no Storage. */

function isUriLocal(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0] ?? uri;
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function lerViaFileSystem(uri: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return {
    bytes: base64ToArrayBuffer(base64),
    mime: guessMimeFromUri(uri),
  };
}

/**
 * React Native não implementa `blob.arrayBuffer()` — usar `response.arrayBuffer()` ou FileSystem.
 */
export async function uriParaBytes(uri: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  if (Platform.OS !== 'web' && isUriLocal(uri)) {
    return lerViaFileSystem(uri);
  }

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Não foi possível ler a imagem (${res.status}).`);
  }

  const mime =
    res.headers.get('Content-Type')?.split(';')[0]?.trim() || guessMimeFromUri(uri);

  if (typeof res.arrayBuffer === 'function') {
    return { bytes: await res.arrayBuffer(), mime };
  }

  const blob = await res.blob();
  const blobMime = blob.type || mime;
  if (typeof blob.arrayBuffer === 'function') {
    return { bytes: await blob.arrayBuffer(), mime: blobMime };
  }

  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return lerViaFileSystem(uri);
  }

  throw new Error('Não foi possível processar a imagem neste dispositivo.');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof globalThis.btoa !== 'function') {
    throw new Error('Não foi possível codificar a imagem.');
  }
  return globalThis.btoa(binary);
}

/** Base64 — usado no fallback KYC via Postgres quando o Storage está quebrado. */
export async function uriParaBase64(uri: string): Promise<{ base64: string; mime: string }> {
  if (Platform.OS !== 'web' && isUriLocal(uri)) {
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { base64, mime: guessMimeFromUri(uri) };
  }

  const { bytes, mime } = await uriParaBytes(uri);
  return { base64: uint8ArrayToBase64(new Uint8Array(bytes)), mime };
}
