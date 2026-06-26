import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isValidSupabaseAnonKey,
  isValidSupabaseUrl,
} from '@/src/lib/supabaseEnv';

/**
 * Modo demonstração — sem Supabase.
 * Defina como `false` quando EXPO_PUBLIC_SUPABASE_* estiver configurado.
 */
export const USE_MOCK_BACKEND = false;

export function isEnvSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
      key &&
      !url.includes('your-project') &&
      key !== 'your-anon-key' &&
      isValidSupabaseUrl(url) &&
      isValidSupabaseAnonKey(key),
  );
}

/** App usa mocks quando USE_MOCK_BACKEND ou env ausente */
export function isMockMode(): boolean {
  return USE_MOCK_BACKEND || !isEnvSupabaseConfigured();
}
