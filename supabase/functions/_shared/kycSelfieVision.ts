export type KycSelfieVisionInput = {
  base64: string;
  mime: string;
};

export type KycSelfieVisionResult = {
  ok: boolean;
  approved: boolean;
  confidence: number;
  issues: string[];
  summary: string;
  model?: string;
  error?: string;
};

const SELFIE_VERIFY_PROMPT = `Você é o analista de verificação facial (KYC) do app Levou (leilões).
Analise a SELFIE enviada para cadastro de usuário.

Aprove SOMENTE se:
- Há um rosto humano real, vivo, fotografado diretamente (selfie)
- Olhos e rosto visíveis (sem máscara, boné cobrindo rosto, óculos escuros espelhados)
- Uma única pessoa na foto
- Qualidade mínima: não extremamente escura, borrada ou cortada

REJEITE se:
- Foto de tela/monitor/celular mostrando outra foto (fraud)
- Impressão/papel com rosto
- Desenho, avatar, filtro que substitui o rosto, boneco ou IA óbvia
- Sem rosto humano detectável
- Rosto totalmente coberto
- Imagem que parece arquivo antigo da galeria (não selfie ao vivo): pose de estúdio sem contexto de captura, bordas de screenshot, barra de status de celular, moldura de rede social

Responda APENAS JSON válido (sem markdown):
{
  "approved": true,
  "confidence": 0.92,
  "issues": [],
  "summary": "frase curta em português para o usuário"
}
issues: lista em português dos problemas quando approved=false.
confidence: 0 a 1 (sua confiança na decisão).`;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function parseSelfieJson(text: string | null): KycSelfieVisionResult | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const issues = Array.isArray(raw.issues)
      ? raw.issues.map((i) => String(i).trim()).filter(Boolean)
      : [];
    return {
      ok: true,
      approved: raw.approved === true,
      confidence: clamp01(Number(raw.confidence ?? 0)),
      issues,
      summary: String(
        raw.summary ??
          (raw.approved === true
            ? 'Selfie aprovada — rosto humano identificado.'
            : 'Selfie não aprovada. Tente novamente com boa iluminação.'),
      ),
    };
  } catch {
    return null;
  }
}

const MIN_CONFIDENCE = 0.62;

export async function analyzeKycSelfie(
  image: KycSelfieVisionInput,
): Promise<KycSelfieVisionResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const model = Deno.env.get('OPENAI_VISION_MODEL')?.trim() || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      ok: false,
      approved: false,
      confidence: 0,
      issues: [],
      summary: '',
      error: 'OPENAI_API_KEY_MISSING',
    };
  }

  if (!image.base64?.trim()) {
    return {
      ok: false,
      approved: false,
      confidence: 0,
      issues: ['Imagem vazia.'],
      summary: 'Envie uma selfie válida.',
      error: 'NO_IMAGE',
    };
  }

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: SELFIE_VERIFY_PROMPT },
    {
      type: 'image_url',
      image_url: {
        url: `data:${image.mime};base64,${image.base64}`,
        detail: 'high',
      },
    },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        max_tokens: 350,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        approved: false,
        confidence: 0,
        issues: [],
        summary: '',
        model,
        error: `OPENAI_HTTP_${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ?? null;
    const parsed = parseSelfieJson(text);
    if (!parsed) {
      return {
        ok: false,
        approved: false,
        confidence: 0,
        issues: [],
        summary: '',
        model,
        error: 'VISION_PARSE_FAILED',
      };
    }

    const approved =
      parsed.approved && parsed.confidence >= MIN_CONFIDENCE;
    const issues =
      approved
        ? []
        : parsed.issues.length > 0
          ? parsed.issues
          : parsed.confidence < MIN_CONFIDENCE
            ? ['Confiança insuficiente na verificação. Tire outra selfie com rosto bem visível.']
            : ['Não foi possível confirmar um rosto humano real.'];

    return {
      ...parsed,
      approved,
      issues,
      summary: approved
        ? parsed.summary || 'Rosto humano verificado com sucesso.'
        : parsed.summary || issues.join(' '),
      model,
    };
  } catch (e) {
    return {
      ok: false,
      approved: false,
      confidence: 0,
      issues: [],
      summary: '',
      model,
      error: e instanceof Error ? e.message : 'VISION_REQUEST_FAILED',
    };
  }
}
