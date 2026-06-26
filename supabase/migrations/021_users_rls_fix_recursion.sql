-- Corrige: infinite recursion detected in policy for relation "users"
-- Causa: políticas que fazem SELECT em public.users dentro do RLS de public.users (migration 005)

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

-- SELECT: próprio perfil ou admin (uma política, sem subquery recursiva)
DROP POLICY IF EXISTS "Users select own profile" ON public.users;
DROP POLICY IF EXISTS "Admins select all users" ON public.users;

-- Sem auth_is_admin() em políticas de users (evita recursão — admin usa RPC)
CREATE POLICY "Users select own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins update kyc status" ON public.users;

DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
CREATE POLICY "Users insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Lance: checar KYC aprovado sem subquery em users na política de bids
DROP POLICY IF EXISTS "Verified bidders insert bids" ON public.bids;
CREATE POLICY "Verified bidders insert bids" ON public.bids
  FOR INSERT
  WITH CHECK (
    auth.uid() = bidder_id
    AND public.auth_kyc_aprovado()
  );

-- Storage / arquivos KYC: admin sem subquery recursiva em users
DROP POLICY IF EXISTS "Admins read kyc storage" ON storage.objects;
CREATE POLICY "Admins read kyc storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.auth_is_admin()
    )
  );

DROP POLICY IF EXISTS "Admins read kyc files" ON public.kyc_private_files;
CREATE POLICY "Admins read kyc files" ON public.kyc_private_files
  FOR SELECT
  USING (public.auth_is_admin());
