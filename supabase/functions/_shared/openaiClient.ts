export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenAiCompletionResult = {
  ok: boolean;
  text: string | null;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  error?: string;
};

export async function createOpenAiChatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<OpenAiCompletionResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const model = Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      ok: false,
      text: null,
      model,
      tokensIn: null,
      tokensOut: null,
      error: 'OPENAI_API_KEY_MISSING',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 400,
        temperature: options?.temperature ?? 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        text: null,
        model,
        tokensIn: null,
        tokensOut: null,
        error: `OPENAI_HTTP_${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ?? null;
    const usage = json?.usage ?? {};

    return {
      ok: Boolean(text),
      text,
      model: String(json?.model ?? model),
      tokensIn: usage.prompt_tokens ?? null,
      tokensOut: usage.completion_tokens ?? null,
      error: text ? undefined : 'OPENAI_EMPTY_RESPONSE',
    };
  } catch (e) {
    return {
      ok: false,
      text: null,
      model,
      tokensIn: null,
      tokensOut: null,
      error: e instanceof Error ? e.message : 'OPENAI_REQUEST_FAILED',
    };
  }
}
