export type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';

export type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  value?: number;
};

export type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

export type AsaasPixQrCodeResult = {
  pix: AsaasPixQrCode | null;
  status?: number;
  errorMessage?: string;
};

export type AsaasPixAddressKey = {
  id?: string;
  key?: string;
  type?: string;
  status?: string;
};

export type AsaasCustomer = {
  id: string;
  name?: string;
  cpfCnpj?: string;
};

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');
  if (trimmed.endsWith('/v3')) return trimmed;
  return `${trimmed}/v3`;
}

export function getAsaasConfig() {
  const apiKey = Deno.env.get('ASAAS_API_KEY')?.trim();
  const apiUrl = normalizeBaseUrl(
    Deno.env.get('ASAAS_API_URL')?.trim() ?? 'https://api-sandbox.asaas.com/v3',
  );
  const sandbox = apiUrl.includes('sandbox');
  return { apiKey, apiUrl, sandbox };
}

export async function getAsaasPixQrCodeWithRetry(
  paymentId: string,
  attempts = 5,
): Promise<AsaasPixQrCodeResult> {
  let lastStatus: number | undefined;
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await getAsaasPixQrCodeDetailed(paymentId);
    if (result.pix?.payload?.trim()) {
      return result;
    }
    lastStatus = result.status;
    lastErrorMessage = result.errorMessage;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  }

  return {
    pix: null,
    status: lastStatus,
    errorMessage: lastErrorMessage,
  };
}

export function formatAsaasError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Erro desconhecido no Asaas.';
  }

  const payload = error as {
    errors?: Array<{ description?: string; code?: string }>;
    message?: string;
  };

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors
      .map((item) => item.description ?? item.code ?? 'Erro Asaas')
      .join(' ');
  }

  if (payload.message) {
    return payload.message;
  }

  return 'Erro desconhecido no Asaas.';
}

export function buildPixUnavailableMessage(input: {
  sandbox: boolean;
  status?: number;
  asaasError?: string;
}): string {
  const missingKeyHint = input.sandbox
    ? 'No sandbox (sandbox.asaas.com): vá em Minha Conta → Pix → Cadastrar chave (pode ser aleatória/E-mail). Depois gere uma nova recarga.'
    : 'No painel Asaas (asaas.com): cadastre uma chave Pix em Minha Conta → Pix e tente de novo.';

  if (input.status === 404) {
    return `Conta Asaas sem chave Pix ativa — o QR Code não foi registrado (404). ${missingKeyHint}`;
  }

  if (input.asaasError) {
    return `Asaas não gerou o Pix: ${input.asaasError}. ${missingKeyHint}`;
  }

  return `Cobrança criada, mas o Asaas não devolveu o código Pix. ${missingKeyHint}`;
}

export async function listAsaasPixAddressKeys(): Promise<{
  keys: AsaasPixAddressKey[];
  ok: boolean;
}> {
  const result = await asaasRequest<{ data?: AsaasPixAddressKey[] }>('/pix/addressKeys?limit=10', {
    method: 'GET',
  });
  if (!result.ok) {
    return { keys: [], ok: false };
  }
  return { keys: result.data?.data ?? [], ok: true };
}

export async function asaasRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T | null; error?: unknown }> {
  const { apiKey, apiUrl } = getAsaasConfig();
  if (!apiKey) {
    return { ok: false, status: 500, data: null, error: 'ASAAS_API_KEY não configurado.' };
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
  });

  let data: T | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return { ok: false, status: response.status, data, error: data };
  }

  return { ok: true, status: response.status, data };
}

export async function findCustomerByExternalReference(
  externalReference: string,
): Promise<AsaasCustomer | null> {
  const result = await asaasRequest<{ data?: AsaasCustomer[] }>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
    { method: 'GET' },
  );
  if (!result.ok || !result.data?.data?.length) return null;
  return result.data.data[0];
}

export async function createAsaasCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference: string;
}): Promise<AsaasCustomer | null> {
  const result = await asaasRequest<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.ok ? result.data : null;
}

export async function createAsaasPayment(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}): Promise<AsaasPayment | null> {
  const result = await asaasRequest<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.ok ? result.data : null;
}

export async function getAsaasPixQrCodeDetailed(paymentId: string): Promise<AsaasPixQrCodeResult> {
  const result = await asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, {
    method: 'GET',
  });

  if (result.ok && result.data?.payload?.trim()) {
    return { pix: result.data, status: result.status };
  }

  return {
    pix: null,
    status: result.status,
    errorMessage: formatAsaasError(result.error ?? result.data),
  };
}

export async function getAsaasPixQrCode(paymentId: string): Promise<AsaasPixQrCode | null> {
  const result = await getAsaasPixQrCodeDetailed(paymentId);
  return result.pix;
}

export function formatDueDate(daysAhead = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export function mapPaymentMethod(method: string): AsaasBillingType {
  const key = method.toLowerCase();
  if (key === 'pix') return 'PIX';
  if (key === 'cartao' || key === 'card') return 'CREDIT_CARD';
  if (key === 'boleto') return 'BOLETO';
  return 'UNDEFINED';
}
