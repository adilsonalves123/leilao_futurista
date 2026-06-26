import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';

const SESSION_KEY = '@aetherion/app_session_id';
const LAST_LOG_KEY = '@aetherion/app_access_last_log';

async function obterSessionId(): Promise<string> {
  const existente = await AsyncStorage.getItem(SESSION_KEY);
  if (existente) return existente;
  const novo = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(SESSION_KEY, novo);
  return novo;
}

/** Registra sessão de uso (debounce 15 min) para métricas de tráfego. */
export async function registrarAcessoApp(): Promise<void> {
  const agora = Date.now();
  const ultimoRaw = await AsyncStorage.getItem(LAST_LOG_KEY);
  if (ultimoRaw) {
    const ultimo = Number(ultimoRaw);
    if (!Number.isNaN(ultimo) && agora - ultimo < 15 * 60 * 1000) {
      return;
    }
  }

  await AsyncStorage.setItem(LAST_LOG_KEY, String(agora));

  if (isMockMode()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const [sessionId, userId] = await Promise.all([obterSessionId(), obterIdUsuarioAtual()]);
    await supabase.from('app_access_logs').insert({
      session_id: sessionId,
      user_id: userId,
      platform: Platform.OS,
    });
  } catch {
    // Métrica auxiliar — falha silenciosa no app
  }
}
