import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isMockMode } from '@/src/lib/mockMode';
import { usuarioEstaAutenticado } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  NotificationCategory,
  NotificationPreference,
  PushSyncMotivo,
  PushSyncResult,
  PushSyncStatus,
} from '@/src/types/pushNotifications';

const PUSH_SYNC_STATUS_KEY = '@levou/push_sync_status';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return projectId && projectId.length > 0 ? projectId : undefined;
}

export function isPushConfigurado(): boolean {
  return Boolean(getEasProjectId());
}

export function resumirTokenPush(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 28) return token;
  return `${token.slice(0, 20)}…${token.slice(-10)}`;
}

export async function lerStatusSyncPush(): Promise<PushSyncStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_SYNC_STATUS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PushSyncStatus;
  } catch {
    return null;
  }
}

export async function salvarStatusSyncPush(status: PushSyncResult): Promise<void> {
  try {
    const persistivel: PushSyncStatus = {
      atualizadoEm: status.atualizadoEm,
      ok: status.ok,
      motivo: status.motivo,
      mensagem: status.mensagem,
      tokenResumo: status.tokenResumo,
    };
    await AsyncStorage.setItem(PUSH_SYNC_STATUS_KEY, JSON.stringify(persistivel));
  } catch (e) {
    console.warn('[push] salvarStatusSyncPush:', e);
  }
}

function montarStatusSync(
  ok: boolean,
  motivo: PushSyncMotivo,
  mensagem: string,
  token: string | null,
): PushSyncResult {
  return {
    atualizadoEm: new Date().toISOString(),
    ok,
    motivo,
    mensagem,
    tokenResumo: resumirTokenPush(token),
    token,
  };
}

export async function solicitarPermissaoPush(): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function obterExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn('[push] EXPO_PUBLIC_EAS_PROJECT_ID não configurado');
    return null;
  }

  try {
    const granted = await solicitarPermissaoPush();
    if (!granted) {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Levou',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data ?? null;
  } catch (e) {
    console.warn('[push] obterExpoPushToken:', e);
    return null;
  }
}

export async function verificarPushAtivoDispositivo(): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice || !isPushConfigurado()) {
    return false;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    const token = await obterTokenPushConcedido();
    if (!token) {
      return false;
    }

    if (isMockMode() || !isSupabaseConfigured()) {
      return true;
    }

    const supabase = getSupabase();
    if (!supabase) {
      return false;
    }

    const { data } = await supabase
      .from('user_push_tokens')
      .select('active')
      .eq('expo_push_token', token)
      .maybeSingle();

    return data?.active === true;
  } catch (e) {
    console.warn('[push] verificarPushAtivoDispositivo:', e);
    return false;
  }
}

export async function registrarTokenPushNoSupabase(
  token: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, erro: 'Cliente Supabase indisponível.' };
  }

  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';

  const { error } = await supabase.rpc('register_push_token', {
    p_expo_push_token: token,
    p_platform: platform,
    p_device_name: Device.modelName ?? null,
  });

  if (error) {
    console.warn('[push] register_push_token:', error.message);
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}

async function obterTokenPushConcedido(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice || !isPushConfigurado()) {
    return null;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const projectId = getEasProjectId();
    if (!projectId) {
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data ?? null;
  } catch {
    return null;
  }
}

export async function desativarPushDispositivo(tokenConhecido?: string | null): Promise<void> {
  const token = tokenConhecido ?? (await obterTokenPushConcedido());
  if (token) {
    await desativarTokenPushNoSupabase(token);
  }
}

export async function desativarTokenPushNoSupabase(token: string): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('deactivate_push_token', {
    p_expo_push_token: token,
  });

  if (error) {
    console.warn('[push] deactivate_push_token:', error.message);
  }
}

export async function sincronizarTokenPushUsuario(): Promise<PushSyncResult> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) {
      const status = montarStatusSync(
        false,
        'nao_dispositivo',
        'Push disponível apenas em iPhone/Android físico.',
        null,
      );
      await salvarStatusSyncPush(status);
      return status;
    }

    if (!isPushConfigurado()) {
      const status = montarStatusSync(
        false,
        'sem_config',
        'EXPO_PUBLIC_EAS_PROJECT_ID não configurado.',
        null,
      );
      await salvarStatusSyncPush(status);
      return status;
    }

    const token = await obterExpoPushToken();
    if (!token) {
      const status = montarStatusSync(
        false,
        'sem_permissao',
        'Permissão de notificação negada ou token indisponível.',
        null,
      );
      await salvarStatusSyncPush(status);
      return status;
    }

    const registro = await registrarTokenPushNoSupabase(token);
    if (!registro.ok) {
      const status = montarStatusSync(
        false,
        'falha_registro',
        registro.erro ?? 'Falha ao salvar token no Supabase.',
        token,
      );
      await salvarStatusSyncPush(status);
      return status;
    }

    const status = montarStatusSync(true, 'registrado', 'Token registrado no Supabase.', token);
    await salvarStatusSyncPush(status);
    return status;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro inesperado ao sincronizar push.';
    console.warn('[push] sincronizarTokenPushUsuario:', e);
    const status = montarStatusSync(false, 'erro', msg, null);
    await salvarStatusSyncPush(status);
    return status;
  }
}

/** Registra o token somente com sessão ativa — evita "Não autenticado" no cold start. */
export async function sincronizarTokenPushSeSessaoAtiva(): Promise<PushSyncResult> {
  const autenticado = await usuarioEstaAutenticado();
  if (!autenticado) {
    const status = montarStatusSync(
      false,
      'sem_sessao',
      'Aguardando login para registrar o token.',
      null,
    );
    await salvarStatusSyncPush(status);
    return status;
  }
  return sincronizarTokenPushUsuario();
}

export async function listarPreferenciasNotificacao(): Promise<NotificationPreference[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return [
      { category: 'auction', enabled: true },
      { category: 'order', enabled: true },
      { category: 'chat', enabled: true },
      { category: 'account', enabled: true },
      { category: 'marketing', enabled: false },
    ];
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('listar_notification_preferences');
  if (error) {
    console.warn('[push] listar_notification_preferences:', error.message);
    return [];
  }

  return (data ?? []).map((row: { category: string; enabled: boolean }) => ({
    category: row.category as NotificationCategory,
    enabled: row.enabled,
  }));
}

export async function atualizarPreferenciaNotificacao(
  category: NotificationCategory,
  enabled: boolean,
): Promise<boolean> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return true;
  }

  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('atualizar_notification_preference', {
    p_category: category,
    p_enabled: enabled,
  });

  if (error) {
    console.warn('[push] atualizar_notification_preference:', error.message);
    return false;
  }

  return true;
}

export function extrairUrlDeepLink(data: Record<string, unknown> | undefined): string | null {
  const url = data?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
