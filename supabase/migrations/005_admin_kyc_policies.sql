-- Admin: leitura de perfis KYC e atualização de status_verificacao
-- Funções SECURITY DEFINER evitam recursão no RLS de public.users (ver 021)

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

REVOKE ALL ON FUNCTION public.auth_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;

-- Admin em users: use RPC admin_listar_kyc / admin_atualizar_kyc_status (migration 023)
DROP POLICY IF EXISTS "Admins select all users" ON public.users;
DROP POLICY IF EXISTS "Admins update kyc status" ON public.users;

DROP POLICY IF EXISTS "Admins read kyc storage" ON storage.objects;
CREATE POLICY "Admins read kyc storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.auth_is_admin()
    )
  );
