export type PolicySecao = {
  titulo?: string;
  corpo: string;
};

/** Divide conteúdo em blocos; linha inicial em MAIÚSCULAS vira título de cláusula. */
export function parseSecoesPolitica(content: string): PolicySecao[] {
  return content
    .split(/\n\n+/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const linhas = bloco.split('\n');
      const primeira = linhas[0]?.trim() ?? '';
      const pareceTitulo =
        linhas.length > 1 &&
        primeira.length <= 80 &&
        /^[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s/%().,-]+$/.test(primeira);

      if (pareceTitulo) {
        return {
          titulo: primeira,
          corpo: linhas.slice(1).join('\n').trim(),
        };
      }

      return { corpo: bloco };
    });
}

export function resumirPolitica(content: string, maxLen = 180): string {
  const texto = content.replace(/\s+/g, ' ').trim();
  if (texto.length <= maxLen) return texto;
  return `${texto.slice(0, maxLen - 1).trim()}…`;
}
