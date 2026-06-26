import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/src/types/database';
import { isEnvSupabaseConfigured, isMockMode } from '@/src/lib/mockMode';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/src/lib/supabaseEnv';

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Cliente Supabase só é criado quando o modo mock está desligado e o .env está válido.
 * Evita crash "supabaseUrl is required" no Expo Go sem chaves configuradas.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (isMockMode() || !isEnvSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    supabaseClient = createClient<Database>(url, key, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
      realtime: {
        params: { eventsPerSecond: 20 },
      },
    });
  }

  return supabaseClient;
}

export const isSupabaseConfigured = (): boolean =>
  !isMockMode() && isEnvSupabaseConfigured() && getSupabase() !== null;
