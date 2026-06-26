import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';



export type AdminAuthState = {

  logado: boolean;

  ehAdmin: boolean;

  email: string | null;

  userId: string | null;

  role: string | null;

  diagnostico: string | null;

};



export async function verificarAdminSupabase(): Promise<AdminAuthState> {

  const vazio: AdminAuthState = {

    logado: false,

    ehAdmin: false,

    email: null,

    userId: null,

    role: null,

    diagnostico: null,

  };



  if (!isSupabaseConfigured()) {

    return vazio;

  }



  const supabase = getSupabase();

  if (!supabase) {

    return vazio;

  }



  const { data: userData, error: userErr } = await supabase.auth.getUser();

  const user = userData.user;

  if (userErr || !user) {

    return vazio;

  }



  const email = user.email ?? null;

  const userId = user.id;



  const { data: isAdminRpc, error: rpcErr } = await supabase.rpc('auth_is_admin');



  if (!rpcErr && isAdminRpc === true) {

    return {

      logado: true,

      ehAdmin: true,

      email,

      userId,

      role: 'admin',

      diagnostico: null,

    };

  }



  const { data: rowById, error: errId } = await supabase

    .from('users')

    .select('id, email, role')

    .eq('id', userId)

    .maybeSingle();



  if (!errId && rowById?.role === 'admin') {

    return {

      logado: true,

      ehAdmin: true,

      email,

      userId,

      role: rowById.role,

      diagnostico: null,

    };

  }



  let diagnostico: string | null = null;



  if (errId) {

    diagnostico = `Erro ao ler perfil: ${errId.message}`;

  } else if (!rowById) {

    diagnostico =

      'Não existe linha em public.users com o id desta sessão. Rode o INSERT com SELECT FROM auth.users (passo criar admin).';

  } else if (rowById.role !== 'admin') {

    diagnostico = `Role atual na sessão: "${rowById.role}". Atualize com: UPDATE public.users SET role = 'admin' WHERE id = '${userId}';`;

  }



  if (email) {

    const { data: rowByEmail } = await supabase

      .from('users')

      .select('id, role')

      .eq('email', email)

      .maybeSingle();



    if (rowByEmail?.role === 'admin' && rowByEmail.id !== userId) {

      diagnostico =

        `O e-mail ${email} é admin no banco (id ${rowByEmail.id}), mas você está logado com outro id (${userId}). ` +

        'Saia, apague usuário duplicado no Auth ou unifique os ids.';

    }

  }



  return {

    logado: true,

    ehAdmin: false,

    email,

    userId,

    role: rowById?.role ?? null,

    diagnostico,

  };

}


