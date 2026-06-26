-- Corrige de vez: infinite recursion on public.users
-- Causa: auth_is_admin() dentro de políticas EM users → a função lê users → loop
-- Admin: só via RPC (admin_listar_kyc, admin_atualizar_kyc_status), não via RLS em users

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_kyc_aprovado()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status_verificacao = 'aprovado'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auth_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_kyc_aprovado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_kyc_aprovado() TO authenticated;

-- Remove TODAS as políticas antigas em users (inclui as recursivas)
DROP POLICY IF EXISTS "Users select own profile" ON public.users;
DROP POLICY IF EXISTS "Admins select all users" ON public.users;
DROP POLICY IF EXISTS "Admins update kyc status" ON public.users;
DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

-- Licenciado: só o próprio perfil (sem auth_is_admin() aqui)
CREATE POLICY "Users select own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Lance (função com row_security off — seguro)
DROP POLICY IF EXISTS "Verified bidders insert bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated insert bids" ON public.bids;

CREATE POLICY "Verified bidders insert bids" ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = bidder_id
    AND public.auth_kyc_aprovado()
  );
