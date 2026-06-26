import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const MOCK_REPUTATION_KEY = '@aetherion/vendor_reputation_stars';

export async function obterReputacaoVendedor(vendorId: string): Promise<number> {
  if (isMockMode() || !isSupabaseConfigured()) {
    try {
      const raw = await AsyncStorage.getItem(MOCK_REPUTATION_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      return map[vendorId] ?? 5;
    } catch {
      return 5;
    }
  }

  const supabase = getSupabase();
  if (!supabase) return 5;

  const { data } = await supabase
    .from('user_profiles')
    .select('reputacao_estrelas')
    .eq('user_id', vendorId)
    .maybeSingle();

  return data?.reputacao_estrelas ?? 5;
}

export async function aplicarPenalidadeExclusaoComLances(vendorId: string): Promise<number> {
  if (isMockMode() || !isSupabaseConfigured()) {
    try {
      const raw = await AsyncStorage.getItem(MOCK_REPUTATION_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      const atual = map[vendorId] ?? 5;
      const nova = Math.max(0, atual - 1);
      map[vendorId] = nova;
      await AsyncStorage.setItem(MOCK_REPUTATION_KEY, JSON.stringify(map));
      return nova;
    } catch {
      return 4;
    }
  }

  const supabase = getSupabase();
  if (!supabase) return 4;

  const atual = await obterReputacaoVendedor(vendorId);
  const nova = Math.max(0, atual - 1);

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: vendorId,
      reputacao_estrelas: nova,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) throw new Error(error.message);
  return nova;
}

export async function obterIdVendedorAtual(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return MOCK_VENDOR_ID;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? MOCK_VENDOR_ID;
}
