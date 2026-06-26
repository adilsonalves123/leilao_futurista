/** Filtro local de palavras proibidas — espelha a lista do backend (037_live_auction_chat.sql) */

const TERMOS_PROIBIDOS = [
  'porra',
  'caralho',
  'merda',
  'bosta',
  'puta',
  'puto',
  'fdp',
  'filho da puta',
  'viado',
  'viada',
  'buceta',
  'cu',
  'cuzao',
  'babaca',
  'idiota',
  'imbecil',
  'retardado',
  'otario',
  'otaria',
  'desgraca',
  'desgracado',
  'vagabundo',
  'arrombado',
  'piranha',
  'vadia',
  'escroto',
  'escrota',
  'lixo humano',
  'vai se foder',
  'vai tomar no cu',
  'tomar no cu',
  'foda-se',
  'foda se',
  'se foder',
  'foder',
  'fodase',
  'cacete',
  'pau no cu',
  'corno',
  'corna',
] as const;

function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escaparRegex(termo: string): string {
  return termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function padraoTermo(termo: string): RegExp {
  const flex = escaparRegex(normalizarTexto(termo)).replace(/\s+/g, '[^a-z0-9]*');
  return new RegExp(`(^|[^a-z0-9])${flex}([^a-z0-9]|$)`, 'i');
}

export function contemPalavraProibida(texto: string): boolean {
  const norm = normalizarTexto(texto);
  if (!norm) return false;
  return TERMOS_PROIBIDOS.some((termo) => padraoTermo(termo).test(norm));
}

export type ResultadoModeracao =
  | { permitido: true }
  | { permitido: false; motivo: string };

export function moderarMensagemChat(texto: string): ResultadoModeracao {
  const limpo = texto.trim();
  if (!limpo) {
    return { permitido: false, motivo: 'Digite uma mensagem.' };
  }
  if (limpo.length > 500) {
    return { permitido: false, motivo: 'Mensagem muito longa (máx. 500 caracteres).' };
  }
  if (contemPalavraProibida(limpo)) {
    return {
      permitido: false,
      motivo: 'Mensagem bloqueada: linguagem ofensiva não é permitida no chat ao vivo.',
    };
  }
  return { permitido: true };
}
