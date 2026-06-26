/** Remove tudo que não for dígito e limita a 8 chars (DDMMAAAA). */
export function normalizarDataNascimento(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8);
}

/** Máscara DD/MM/AAAA */
export function formatarDataNascimento(valor: string): string {
  const d = normalizarDataNascimento(valor);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Nome civil: ao menos nome + sobrenome, apenas letras (incl. acentos). */
export function nomeCompletoValido(nome: string): boolean {
  const trimmed = nome.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 5) return false;

  const partes = trimmed.split(' ');
  if (partes.length < 2) return false;
  if (!partes.every((p) => p.length >= 2)) return false;

  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmed);
}

export function dataNascimentoValida(valor: string): boolean {
  const d = normalizarDataNascimento(valor);
  if (d.length !== 8) return false;

  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4, 8));

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;

  const nascimento = new Date(ano, mes - 1, dia);
  if (
    nascimento.getFullYear() !== ano ||
    nascimento.getMonth() !== mes - 1 ||
    nascimento.getDate() !== dia
  ) {
    return false;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (nascimento >= hoje) return false;

  let idade = hoje.getFullYear() - ano;
  const aniversarioEsteAno = new Date(hoje.getFullYear(), mes - 1, dia);
  if (hoje < aniversarioEsteAno) idade -= 1;

  return idade >= 18 && idade <= 120;
}
