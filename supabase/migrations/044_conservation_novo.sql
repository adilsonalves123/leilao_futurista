-- Renomeia estado de conservação: lacrado → novo
-- Ordem: remover CHECK antigo → migrar dados → criar CHECK novo

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'auctions'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%conservation_state%'
  LOOP
    EXECUTE format('ALTER TABLE public.auctions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE public.auctions
SET conservation_state = 'novo'
WHERE conservation_state = 'lacrado';

ALTER TABLE public.auctions
  ADD CONSTRAINT auctions_conservation_state_check
  CHECK (
    conservation_state IS NULL
    OR conservation_state IN ('novo', 'excelente', 'bom', 'marcas_uso')
  );
