import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProductInput = {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
};

type QuoteBody = {
  fromCep?: string;
  toCep?: string;
  products?: ProductInput[];
};

function normalizeCep(cep: string): string {
  return cep.replace(/\D/g, '').slice(0, 8);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('MELHOR_ENVIO_ACCESS_TOKEN')?.trim();
    const apiUrl = (Deno.env.get('MELHOR_ENVIO_API_URL') ?? 'https://sandbox.melhorenvio.com.br').replace(
      /\/$/,
      '',
    );
    const userAgent =
      Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Levou Leiloes (dev@aetherion.com.br)';

    if (!token) {
      return new Response(JSON.stringify({ error: 'MELHOR_ENVIO_ACCESS_TOKEN não configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as QuoteBody;
    const fromCep = normalizeCep(body.fromCep ?? '');
    const toCep = normalizeCep(body.toCep ?? '');
    const products = body.products ?? [];

    if (fromCep.length !== 8 || toCep.length !== 8 || !products.length) {
      return new Response(JSON.stringify({ error: 'CEPs e produtos são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(`${apiUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: fromCep },
        to: { postal_code: toCep },
        products,
        options: { receipt: false, own_hand: false },
      }),
    });

    const payload = await upstream.json();

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: payload }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
