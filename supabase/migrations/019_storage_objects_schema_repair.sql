-- Repara schema do Storage quando upload falha com "invalid or incompatible"
-- Rode no SQL Editor. Se der "permission denied" no schema storage, use 020_kyc_files_db_fallback.sql

-- Diagnóstico (copie o resultado):
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- Colunas que versões recentes do Storage API esperam:
ALTER TABLE storage.objects ADD COLUMN IF NOT EXISTS level INT;
ALTER TABLE storage.objects ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE storage.objects ADD COLUMN IF NOT EXISTS user_metadata JSONB;
ALTER TABLE storage.objects ADD COLUMN IF NOT EXISTS version TEXT;
