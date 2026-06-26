import type { ChatMessage } from './openaiClient.ts';
import { createOpenAiChatCompletion, type OpenAiCompletionResult } from './openaiClient.ts';

export type AiCompletionResult = OpenAiCompletionResult & {
  provider?: 'gemini' | 'openai' | 'none';
};

function toGeminiRole(role: ChatMessage['role']): 'user' | 'model' | null {
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'model';
  return null;
}

async function createGeminiChatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<AiCompletionResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  const model = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.0-flash';

  if (!apiKey) {
    return {
      ok: false,
      text: null,
      model,
      tokensIn: null,
      tokensOut: null,
      provider: 'none',
      error: 'GEMINI_API_KEY_MISSING',
    };
  }

  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const role = toGeminiRole(m.role);
      if (!role) return null;
      return { role, parts: [{ text: m.content }] };
    })
    .filter((entry): entry is { role: 'user' | 'model'; parts: { text: string }[] } => entry != null);

  if (!contents.length) {
    return {
      ok: false,
      text: null,
      model,
      tokensIn: null,
      tokensOut: null,
      provider: 'gemini',
      error: 'GEMINI_EMPTY_MESSAGES',
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(systemText
            ? { systemInstruction: { parts: [{ text: systemText }] } }
            : {}),
          contents,
          generationConfig: {
            maxOutputTokens: options?.maxTokens ?? 500,
            temperature: options?.temperature ?? 0.35,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        text: null,
        model,
        tokensIn: null,
        tokensOut: null,
        provider: 'gemini',
        error: `GEMINI_HTTP_${response.status}: ${errText.slice(0, 240)}`,
      };
    }

    const json = await response.json();
    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
        .trim() || null;

    const usage = json?.usageMetadata ?? {};

    return {
      ok: Boolean(text),
      text,
      model: `gemini:${model}`,
      tokensIn: usage.promptTokenCount ?? null,
      tokensOut: usage.candidatesTokenCount ?? null,
      provider: 'gemini',
      error: text ? undefined : 'GEMINI_EMPTY_RESPONSE',
    };
  } catch (e) {
    return {
      ok: false,
      text: null,
      model,
      tokensIn: null,
      tokensOut: null,
      provider: 'gemini',
      error: e instanceof Error ? e.message : 'GEMINI_REQUEST_FAILED',
    };
  }
}

/**
 * Ordem: Gemini (se GEMINI_API_KEY) → OpenAI (se OPENAI_API_KEY).
 * Configure no Supabase: Edge Functions → Secrets.
 */
export async function createAiChatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<AiCompletionResult> {
  const prefer = Deno.env.get('AI_PROVIDER')?.trim().toLowerCase();
  const hasGemini = Boolean(Deno.env.get('GEMINI_API_KEY')?.trim());
  const hasOpenAi = Boolean(Deno.env.get('OPENAI_API_KEY')?.trim());

  const tryGeminiFirst = prefer === 'gemini' || (prefer !== 'openai' && hasGemini);
  const tryOpenAiFirst = prefer === 'openai' || (!tryGeminiFirst && hasOpenAi);

  if (tryGeminiFirst) {
    const gemini = await createGeminiChatCompletion(messages, options);
    if (gemini.ok) return gemini;
    if (hasOpenAi) {
      const openai = await createOpenAiChatCompletion(messages, options);
      return { ...openai, provider: 'openai' };
    }
    return gemini;
  }

  if (tryOpenAiFirst) {
    const openai = await createOpenAiChatCompletion(messages, options);
    if (openai.ok) return { ...openai, provider: 'openai' };
    if (hasGemini) {
      const gemini = await createGeminiChatCompletion(messages, options);
      return { ...gemini, provider: 'gemini' };
    }
    return { ...openai, provider: 'openai' };
  }

  return {
    ok: false,
    text: null,
    model: 'none',
    tokensIn: null,
    tokensOut: null,
    provider: 'none',
    error: 'AI_KEYS_MISSING',
  };
}

export function isDeterministicAiModel(model?: string | null): boolean {
  if (!model) return true;
  return (
    model === 'deterministic-fallback' ||
    model === 'local-deterministic' ||
    model === 'local-fallback' ||
    model.startsWith('local-')
  );
}

export function humanizeAiOfflineReason(error?: string | null, model?: string | null): string {
  if (!isDeterministicAiModel(model) && model && model !== 'none') return '';

  if (error?.includes('GEMINI_API_KEY_MISSING') || error?.includes('OPENAI_API_KEY_MISSING') || error === 'AI_KEYS_MISSING') {
    return 'IA desligada: configure OPENAI_API_KEY ou GEMINI_API_KEY nos Secrets do Supabase e faça deploy das Edge Functions.';
  }
  if (error?.includes('buyer-jarvis') || error?.includes('auction-ai-advisor')) {
    return 'Função Jarvis não publicada. Rode: npx supabase functions deploy buyer-jarvis';
  }
  if (error) return `Modo básico ativo (${error}). Respostas limitadas.`;
  return 'Modo básico ativo — respostas automáticas sem IA generativa.';
}
