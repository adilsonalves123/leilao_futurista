-- Contato e endereço do licitante (edição após KYC aprovado)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS data_nascimento TEXT,
  ADD COLUMN IF NOT EXISTS cep VARCHAR(9),
  ADD COLUMN IF NOT EXISTS endereco_logradouro TEXT,
  ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
  ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
  ADD COLUMN IF NOT EXISTS endereco_bairro TEXT,
  ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
  ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2);

COMMENT ON COLUMN public.users.data_nascimento IS 'Data de nascimento DD/MM/AAAA (KYC)';
COMMENT ON COLUMN public.users.cep IS 'CEP de entrega';
COMMENT ON COLUMN public.users.endereco_logradouro IS 'Logradouro (rua)';
COMMENT ON COLUMN public.users.endereco_numero IS 'Número do endereço';
COMMENT ON COLUMN public.users.endereco_complemento IS 'Complemento (apto, bloco, etc.)';
COMMENT ON COLUMN public.users.endereco_bairro IS 'Bairro';
COMMENT ON COLUMN public.users.endereco_cidade IS 'Cidade';
COMMENT ON COLUMN public.users.endereco_uf IS 'UF (2 letras)';
