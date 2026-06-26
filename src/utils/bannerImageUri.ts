import { Platform } from 'react-native';

/** URLs que o React Native consegue carregar em Image. */
export function uriImagemExibivelNoApp(uri: string): boolean {
  const u = uri.trim();
  if (!u) return false;
  if (u.startsWith('blob:')) return false;
  if (/localhost|127\.0\.0\.1/i.test(u)) return false;

  if (u.startsWith('https://')) return true;
  if (u.startsWith('http://')) return !/localhost|127\.0\.0\.1/i.test(u);
  if (u.startsWith('data:image/')) return true;

  if (Platform.OS === 'web') return false;

  return u.startsWith('file:') || u.startsWith('content:');
}

/** Precisa enviar ao Storage antes de sincronizar com o app mobile. */
export function precisaUploadParaNuvem(uri: string): boolean {
  const u = uri.trim().toLowerCase();
  if (!u) return false;
  if (u.startsWith('https://') && !u.includes('localhost') && !u.includes('127.0.0.1')) {
    return false;
  }
  return (
    u.startsWith('blob:') ||
    u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('data:') ||
    u.includes('localhost') ||
    u.includes('127.0.0.1')
  );
}
