import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isMockMode } from '@/src/lib/mockMode';
import { setMockSession } from '@/src/lib/mockSession';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  humanizarErroSupabaseFetch,
  testarConexaoSupabase,
} from '@/src/lib/supabaseEnv';
import { MOCK_USERS, type MockUser } from '@/src/mocks/data';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'apple' | 'facebook';

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

const MOCK_USER_BY_PROVIDER: Record<SocialProvider, MockUser> = {
  google: MOCK_USERS.google,
  apple: MOCK_USERS.apple,
  facebook: MOCK_USERS.facebook,
};

export type AuthResult = {
  ok: boolean;
  message: string;
  needsEmailConfirmation?: boolean;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSocialProviderLabel(provider: SocialProvider): string {
  return PROVIDER_LABELS[provider];
}

export function isUsingMockBackend(): boolean {
  return isMockMode() || !isSupabaseConfigured();
}

/** Teste de rede antes do login (útil no celular / Expo Go). */
export async function verificarRedeSupabase(): Promise<AuthResult> {
  if (isUsingMockBackend()) {
    return { ok: true, message: 'Modo demonstração ativo.' };
  }

  const url = getSupabaseUrl();
  if (/localhost|127\.0\.0\.1/i.test(url)) {
    return {
      ok: false,
      message:
        'A URL do Supabase aponta para localhost. No celular use https://SEU_REF.supabase.co no .env e reinicie com npx expo start -c.',
    };
  }

  const resultado = await testarConexaoSupabase();
  if (!resultado.ok) {
    return { ok: false, message: resultado.motivo };
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: getSupabaseAnonKey() },
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Auth Supabase respondeu HTTP ${res.status}. Verifique a chave anon no .env.`,
      };
    }
    return { ok: true, message: 'Conexão com Supabase OK.' };
  } catch (err) {
    return { ok: false, message: humanizarErroSupabaseFetch(err) };
  }
}

async function executarAuth<T>(
  acao: () => Promise<{ error: { message: string } | null }>,
  sucesso: string,
): Promise<AuthResult> {
  try {
    const { error } = await acao();
    if (error) {
      return { ok: false, message: translateAuthError(error.message) };
    }
    return { ok: true, message: sucesso };
  } catch (err) {
    return { ok: false, message: humanizarErroSupabaseFetch(err) };
  }
}

function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'aetherion',
    path: 'auth/callback',
  });
}

async function mockSignIn(user: MockUser, label: string): Promise<AuthResult> {
  await delay(500);
  setMockSession(user);
  return {
    ok: true,
    message: `Bem-vindo, ${user.displayName}! (${label} — dados locais de teste)`,
  };
}

async function completeOAuthFromRedirectUrl(url: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase não disponível.' };
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    return { ok: false, message: errorCode };
  }

  if (params.error_description) {
    return { ok: false, message: params.error_description };
  }

  if (params.code) {
    return executarAuth(
      () => supabase.auth.exchangeCodeForSession(params.code),
      'Login social concluído com sucesso.',
    );
  }

  if (params.access_token) {
    return executarAuth(
      () =>
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        }),
      'Login social concluído com sucesso.',
    );
  }

  return {
    ok: false,
    message: 'Resposta de autenticação inválida. Tente novamente.',
  };
}

export async function signInWithSocial(provider: SocialProvider): Promise<AuthResult> {
  if (provider === 'apple' && Platform.OS === 'android') {
    return {
      ok: false,
      message: 'Entrar com a Apple está disponível apenas em dispositivos iOS.',
    };
  }

  if (isMockMode()) {
    return mockSignIn(MOCK_USER_BY_PROVIDER[provider], PROVIDER_LABELS[provider]);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return mockSignIn(MOCK_USER_BY_PROVIDER[provider], PROVIDER_LABELS[provider]);
  }

  try {
    const redirectTo = getOAuthRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      return { ok: false, message: translateAuthError(error.message) };
    }

    if (!data?.url) {
      return { ok: false, message: 'Não foi possível iniciar o login social.' };
    }

    if (Platform.OS === 'web') {
      return { ok: true, message: `Redirecionando para ${PROVIDER_LABELS[provider]}…` };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { ok: false, message: 'Login cancelado.' };
    }

    if (result.type === 'success' && result.url) {
      return completeOAuthFromRedirectUrl(result.url);
    }

    return { ok: false, message: 'Não foi possível concluir o login social.' };
  } catch (err) {
    return { ok: false, message: humanizarErroSupabaseFetch(err) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmed = email.trim();

  if (!trimmed || !password) {
    return { ok: false, message: 'Preencha e-mail e senha.' };
  }

  if (isMockMode()) {
    const user: MockUser = {
      ...MOCK_USERS.demo,
      email: trimmed,
      displayName: 'Usuário',
    };
    return mockSignIn(user, 'e-mail');
  }

  const supabase = getSupabase();
  if (!supabase) {
    const user: MockUser = { ...MOCK_USERS.demo, email: trimmed };
    return mockSignIn(user, 'e-mail');
  }

  return executarAuth(
    () => supabase.auth.signInWithPassword({ email: trimmed, password }),
    'Login realizado. Bem-vindo ao Levou.',
  );
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  const trimmed = email.trim();
  const name = displayName?.trim();

  if (!trimmed || !password) {
    return { ok: false, message: 'Preencha e-mail e senha.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  if (isMockMode()) {
    const user: MockUser = {
      ...MOCK_USERS.demo,
      email: trimmed,
      displayName: name || 'Novo participante',
    };
    return mockSignIn(user, 'cadastro');
  }

  const supabase = getSupabase();
  if (!supabase) {
    const user: MockUser = {
      ...MOCK_USERS.demo,
      email: trimmed,
      displayName: name || 'Novo participante',
    };
    return mockSignIn(user, 'cadastro');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        data: name ? { display_name: name, full_name: name } : undefined,
      },
    });

    if (error) {
      return { ok: false, message: translateAuthError(error.message) };
    }

    const needsEmailConfirmation = !data.session;

    if (needsEmailConfirmation) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        message:
          'Conta criada! Confirme o link enviado ao seu e-mail antes de entrar no Levou.',
      };
    }

    return {
      ok: true,
      message: 'Conta criada. Bem-vindo ao Levou.',
    };
  } catch (err) {
    return { ok: false, message: humanizarErroSupabaseFetch(err) };
  }
}

export async function signOutSupabase(): Promise<void> {
  const { clearMockSession } = await import('@/src/lib/mockSession');
  const { limparAdminGate } = await import('@/src/lib/adminGate');
  clearMockSession();
  await limparAdminGate();

  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('user already registered')) {
    return 'Este e-mail já possui cadastro. Faça login ou recupere a senha.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch')
  ) {
    return humanizarErroSupabaseFetch(new Error(message));
  }
  return message;
}
