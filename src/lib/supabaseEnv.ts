import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

function lerExtra(): Extra {
  return (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as Extra;
}

function lerEnv(nome: string, extraKey: keyof Extra): string {
  const direto = process.env[nome]?.trim();
  if (direto) return direto;
  const extra = lerExtra();
  const valor = extra[extraKey];
  return typeof valor === 'string' ? valor.trim() : '';
}

const supabaseUrl = lerEnv('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl').replace(/\/$/, '');
/** Suporta chave legacy (eyJ…) e publishable nova (sb_publishable_…). */
const supabaseAnonKey =
  lerEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'supabaseKey') ||
  lerEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseKey');
/** URL normalizada para chamadas REST. */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

const URL_RE = /^https:\/\/[a-z0-9]+\.supabase\.co$/i;

export function isValidSupabaseUrl(url: string): boolean {
  return URL_RE.test(url.replace(/\/$/, ''));
}

/** Chave pública do painel: publishable (sb_publishable_…) ou anon legacy (JWT). */
export function isValidSupabaseAnonKey(key: string): boolean {
  if (key.startsWith('sb_publishable_') && key.length >= 30) return true;
  return key.startsWith('eyJ') && key.split('.').length === 3 && key.length >= 100;
}

/** Problemas de configuração antes de qualquer request. */
export function getSupabaseConfigWarnings(): string[] {
  const avisos: string[] = [];

  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    avisos.push('Defina EXPO_PUBLIC_SUPABASE_URL no arquivo .env (Settings → API no Supabase).');
    return avisos;
  }

  if (/localhost|127\.0\.0\.1/i.test(supabaseUrl)) {
    avisos.push(
      'EXPO_PUBLIC_SUPABASE_URL não pode ser localhost no celular. Use https://SEU_REF.supabase.co',
    );
  }

  if (!isValidSupabaseUrl(supabaseUrl)) {
    avisos.push(
      'EXPO_PUBLIC_SUPABASE_URL inválida. Use exatamente: https://SEU_PROJECT_REF.supabase.co',
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
    avisos.push('Defina EXPO_PUBLIC_SUPABASE_ANON_KEY no .env (chave anon public do Supabase).');
    return avisos;
  }

  if (!isValidSupabaseAnonKey(supabaseAnonKey)) {
    avisos.push(
      'Chave Supabase inválida. Use EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…) ou EXPO_PUBLIC_SUPABASE_ANON_KEY (eyJ…).',
    );
  }

  return avisos;
}

export function humanizarErroSupabaseFetch(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('getaddrinfo')
  ) {
    return (
      'Não foi possível alcançar o Supabase. No celular: confira Wi‑Fi/dados móveis, desative VPN, ' +
      'use URL https://SEU_REF.supabase.co (nunca localhost) no .env, confirme que o projeto não está pausado ' +
      'no painel Supabase e reinicie o app com: npx expo start -c'
    );
  }
  return msg;
}

/** Teste rápido de rede (útil no admin web). */
export async function testarConexaoSupabase(): Promise<
  { ok: true } | { ok: false; motivo: string }
> {
  const avisos = getSupabaseConfigWarnings();
  if (avisos.length > 0) {
    return { ok: false, motivo: avisos.join(' ') };
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  try {
    const res = await fetch(`${url}/rest/v1/banners?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        motivo: 'Supabase respondeu, mas a chave anon foi recusada. Copie novamente a anon key no .env.',
      };
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404 || body.includes('PGRST205') || body.includes('does not exist')) {
        return {
          ok: false,
          motivo:
            'Projeto acessível, mas a tabela banners não existe. Execute supabase/migrations/002_app_banners.sql no SQL Editor.',
        };
      }
      return { ok: false, motivo: `Supabase HTTP ${res.status}: ${body.slice(0, 120)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, motivo: humanizarErroSupabaseFetch(err) };
  }
}
