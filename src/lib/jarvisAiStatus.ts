/** Erro de banco/migration — não confundir com chave de IA ausente. */
export function isJarvisInfrastructureError(message?: string | null): boolean {
  if (!message) return false;
  return /enum|order_status|invalid input|syntax error|does not exist|migration|plpgsql/i.test(
    message,
  );
}

export function jarvisAiSecretsHint(): string {
  return 'Configure OPENAI_API_KEY (ou GEMINI_API_KEY) nos Secrets do Supabase e faça deploy das Edge Functions.';
}

export function isJarvisOfflineModel(model?: string | null): boolean {
  if (!model) return true;
  return (
    model === 'deterministic-fallback' ||
    model === 'local-deterministic' ||
    model === 'local-fallback' ||
    model.startsWith('local-')
  );
}

export function jarvisProviderLabel(
  provider?: string | null,
  model?: string | null,
): string {
  if (model === 'levou-auction-guide') return 'Guia oficial';
  if (isJarvisOfflineModel(model)) return 'Modo básico';
  if (provider === 'gemini' || model?.startsWith('gemini:')) return 'Gemini';
  if (provider === 'openai' || model?.includes('gpt')) return 'OpenAI';
  return 'IA ativa';
}
