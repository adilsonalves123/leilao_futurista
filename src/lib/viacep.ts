export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

type ViaCepJson = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

/** Busca endereço na API pública ViaCEP (Brasil). */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;

  const data = (await res.json()) as ViaCepJson;
  if (data.erro || !data.localidade || !data.uf) return null;

  return {
    logradouro: data.logradouro?.trim() ?? '',
    bairro: data.bairro?.trim() ?? '',
    localidade: data.localidade.trim(),
    uf: data.uf.trim().toUpperCase(),
  };
}
