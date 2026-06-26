import {
  normalizeProductBbox,
  type ProductBbox,
} from './listingCoverSceneCompose.ts';

export type VisionImageInput = {
  base64: string;
  mime: string;
};

export type ListingCoverVisionResult = {
  ok: boolean;
  bestIndex: number;
  removeBackground: boolean;
  sceneKey: string;
  productBbox: ProductBbox;
  summary: string;
  model?: string;
  error?: string;
};

const COVER_ANALYSIS_PROMPT = `Você é o agente "Capa que vende mais" do app Levou (leilões).
Analise as fotos de um anúncio e escolha a melhor para CAPA (card na Home).

Critérios: produto visível, boa luz, foco nítido. O app vai isolar o produto e colocá-lo em cenário profissional (mesa de escritório, estúdio).

Responda APENAS JSON válido (sem markdown):
{
  "best_index": 0,
  "remove_background": true,
  "scene_key": "desk",
  "product_bbox": { "origin_x": 0.1, "origin_y": 0.12, "width": 0.8, "height": 0.76 },
  "summary": "frase curta em português explicando a escolha"
}
product_bbox: caixa do PRODUTO apenas (valores 0-1), excluindo cama, meias, fundo bagunçado.
remove_background: true quase sempre em fotos caseiras.
scene_key: "desk" para eletrônicos/notebooks/celulares; "studio" para demais.`;

function parseVisionJson(text: string | null): ListingCoverVisionResult | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const bestIndex = Math.max(0, Math.floor(Number(raw.best_index ?? 0)));
    const sceneKey = String(raw.scene_key ?? raw.sceneKey ?? 'studio').toLowerCase();
    const bboxRaw = (raw.product_bbox ?? raw.productBbox ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      bestIndex,
      removeBackground: true,
      sceneKey: sceneKey === 'desk' ? 'desk' : 'studio',
      productBbox: normalizeProductBbox({
        originX: Number(bboxRaw.origin_x ?? bboxRaw.originX),
        originY: Number(bboxRaw.origin_y ?? bboxRaw.originY),
        width: Number(bboxRaw.width),
        height: Number(bboxRaw.height),
      }),
      summary: String(raw.summary ?? 'Capa otimizada para destacar o produto.'),
    };
  } catch {
    return null;
  }
}

async function analyzeWithOpenAi(
  images: VisionImageInput[],
  title: string,
  category: string,
): Promise<ListingCoverVisionResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const model = Deno.env.get('OPENAI_VISION_MODEL')?.trim() || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      ok: false,
      bestIndex: 0,
      removeBackground: false,
      sceneKey: 'studio',
      productBbox: normalizeProductBbox(),
      summary: '',
      error: 'OPENAI_API_KEY_MISSING',
    };
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `${COVER_ANALYSIS_PROMPT}\n\nTítulo: ${title}\nCategoria: ${category}\nFotos (índice 0 = primeira): ${images.length}`,
    },
  ];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.base64}`, detail: 'low' },
    });
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
        messages: [{ role: 'user', content }],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        bestIndex: 0,
        removeBackground: false,
        sceneKey: 'studio',
        productBbox: normalizeProductBbox(),
        summary: '',
        model,
        error: `OPENAI_HTTP_${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ?? null;
    const parsed = parseVisionJson(text);
    if (!parsed) {
      return {
        ok: false,
        bestIndex: 0,
        removeBackground: false,
        sceneKey: 'studio',
        productBbox: normalizeProductBbox(),
        summary: '',
        model,
        error: 'VISION_PARSE_FAILED',
      };
    }
    return { ...parsed, model };
  } catch (e) {
    return {
      ok: false,
      bestIndex: 0,
      removeBackground: false,
      sceneKey: 'studio',
      productBbox: normalizeProductBbox(),
      summary: '',
      model,
      error: e instanceof Error ? e.message : 'VISION_REQUEST_FAILED',
    };
  }
}

export async function analyzeListingCoverPhotos(
  images: VisionImageInput[],
  meta: { title: string; category: string },
): Promise<ListingCoverVisionResult> {
  if (!images.length) {
    return {
      ok: false,
      bestIndex: 0,
      removeBackground: false,
      sceneKey: 'studio',
      productBbox: normalizeProductBbox(),
      summary: '',
      error: 'NO_IMAGES',
    };
  }

  const limited = images.slice(0, 4);
  const result = await analyzeWithOpenAi(limited, meta.title, meta.category);
  if (!result.ok) return result;

  const bestIndex = Math.min(result.bestIndex, limited.length - 1);
  return { ...result, bestIndex };
}

/** Remove fundo via remove.bg (opcional — REMOVE_BG_API_KEY nos Secrets). */
export async function removeBackgroundFromImage(
  imageBytes: Uint8Array,
  mime: string,
): Promise<{ ok: boolean; bytes?: Uint8Array; error?: string }> {
  const apiKey = Deno.env.get('REMOVE_BG_API_KEY')?.trim();
  if (!apiKey) {
    return { ok: false, error: 'REMOVE_BG_API_KEY_MISSING' };
  }

  try {
    const form = new FormData();
    const blob = new Blob([imageBytes], { type: mime });
    form.append('image_file', blob, 'cover.jpg');
    form.append('size', 'auto');
    form.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      return { ok: false, error: `REMOVEBG_${response.status}: ${errText.slice(0, 120)}` };
    }

    const buffer = await response.arrayBuffer();
    return { ok: true, bytes: new Uint8Array(buffer) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'REMOVEBG_FAILED',
    };
  }
}
