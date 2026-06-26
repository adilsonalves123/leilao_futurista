import { isMockMode } from '@/src/lib/mockMode';
import { getMockSession, restoreMockSession } from '@/src/lib/mockSession';
import { getSupabase } from '@/src/lib/supabase';

/** Indica se há sessão ativa (Supabase ou mock). */
export async function usuarioEstaAutenticado(): Promise<boolean> {
  if (isMockMode()) {
    await restoreMockSession();
    return getMockSession() !== null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await restoreMockSession();
    return getMockSession() !== null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

export async function obterIdUsuarioAtual(): Promise<string | null> {
  if (isMockMode()) {
    await restoreMockSession();
    return getMockSession()?.id ?? null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await restoreMockSession();
    return getMockSession()?.id ?? null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
