import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

export type ProductBbox = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

const DEFAULT_BBOX: ProductBbox = {
  originX: 0.06,
  originY: 0.06,
  width: 0.88,
  height: 0.88,
};

/** Fundos livres (Unsplash) — mesa de escritório, estúdio claro. */
const SCENE_URLS: Record<string, string> = {
  desk: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=1200&fit=crop&q=80',
  studio: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=1200&fit=crop&q=80',
};

const sceneCache = new Map<string, Uint8Array>();

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function normalizeProductBbox(raw?: Partial<ProductBbox>): ProductBbox {
  const originX = clamp01(raw?.originX ?? DEFAULT_BBOX.originX);
  const originY = clamp01(raw?.originY ?? DEFAULT_BBOX.originY);
  const width = clamp01(raw?.width ?? DEFAULT_BBOX.width);
  const height = clamp01(raw?.height ?? DEFAULT_BBOX.height);
  return {
    originX,
    originY,
    width: Math.min(width, 1 - originX),
    height: Math.min(height, 1 - originY),
  };
}

async function loadSceneBytes(sceneKey: string): Promise<Uint8Array | null> {
  const key = SCENE_URLS[sceneKey] ? sceneKey : 'studio';
  const cached = sceneCache.get(key);
  if (cached) return cached;

  const url = SCENE_URLS[key];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    sceneCache.set(key, bytes);
    return bytes;
  } catch {
    return null;
  }
}

async function createFallbackScene(): Promise<Image> {
  const img = new Image(1200, 1200);
  img.fill(0xE8E0D4FF);
  return img;
}

/** Recorta a região do produto (fallback quando remove.bg não está disponível). */
export async function extractProductRegion(
  imageBytes: Uint8Array,
  bbox: ProductBbox,
): Promise<Uint8Array> {
  const img = await Image.decode(imageBytes);
  const x = Math.min(img.width - 1, Math.floor(bbox.originX * img.width));
  const y = Math.min(img.height - 1, Math.floor(bbox.originY * img.height));
  const w = Math.max(1, Math.min(img.width - x, Math.floor(bbox.width * img.width)));
  const h = Math.max(1, Math.min(img.height - y, Math.floor(bbox.height * img.height)));
  const cropped = img.crop(x, y, w, h);
  return await cropped.encodeJPEG(90);
}

/** Coloca o produto em um cenário profissional. */
export async function composeListingCoverScene(
  productImage: Uint8Array,
  sceneKey: string,
): Promise<{ ok: boolean; bytes?: Uint8Array; error?: string }> {
  try {
    const bgBytes = await loadSceneBytes(sceneKey);
    const bg = bgBytes ? await Image.decode(bgBytes) : await createFallbackScene();
    const product = await Image.decode(productImage);

    const targetW = 1200;
    const bgResized =
      bg.width === targetW ? bg : bg.resize(targetW, Image.RESIZE_AUTO);
    const canvasH = bgResized.height;

    const maxProdW = Math.floor(targetW * 0.72);
    const scale = maxProdW / product.width;
    const prodW = Math.max(1, Math.floor(product.width * scale));
    const prodH = Math.max(1, Math.floor(product.height * scale));
    const scaled = product.resize(prodW, prodH);

    const x = Math.floor((targetW - prodW) / 2);
    const y = Math.floor(canvasH - prodH - canvasH * 0.08);

    bgResized.composite(scaled, x, y);

    const out = await bgResized.encodeJPEG(88);
    return { ok: true, bytes: out };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'COMPOSE_FAILED',
    };
  }
}

export function sceneKeyForCategory(category: string): string {
  const c = category.toLowerCase();
  if (
    c.includes('eletron') ||
    c.includes('inform') ||
    c.includes('notebook') ||
    c.includes('celular')
  ) {
    return 'desk';
  }
  return 'studio';
}
