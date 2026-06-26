-- Sincroniza public.users com auth.users e garante admin pelo e-mail
-- Troque o e-mail abaixo e execute uma vez no SQL Editor

-- Diagnóstico (veja se auth_id = public_id):
-- SELECT au.id AS auth_id, au.email, pu.id AS public_id, pu.role
-- FROM auth.users au
-- LEFT JOIN public.users pu ON pu.id = au.id
-- WHERE au.email = 'adi.end.music@hotmail.com';

INSERT INTO public.users (id, email, role)
SELECT
  au.id,
  COALESCE(au.email, ''),
  'admin'::user_role
FROM auth.users au
WHERE au.email = 'adi.end.music@hotmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::user_role,
  email = EXCLUDED.email;
