import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  buildPixUnavailableMessage,
  createAsaasCustomer,
  createAsaasPayment,
  findCustomerByExternalReference,
  formatDueDate,
  getAsaasConfig,
  getAsaasPixQrCodeWithRetry,
  listAsaasPixAddressKeys,
} from '../_shared/asaasClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  describeCaughtError,
  isLikelyTimeoutError,
  logSystemError,
  type LogSystemErrorInput,
  type SystemErrorSeverity,
} from '../_shared/systemErrorLog.ts';

type CreateWalletDepositBody = {
  amountCents?: number;
};

type UserProfile = {
  id: string;
  email: string;
  nome_completo: string | null;
  display_name: string | null;
  cpf: string | null;
  telefone: string | null;
  asaas_customer_id: string | null;
};

const SOURCE = 'create-asaas-wallet-deposit';

function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

async function reportDepositError(
  adminClient: SupabaseClient | null,
  input: Omit<LogSystemErrorInput, 'source'>,
): Promise<void> {
  if (!adminClient) return;
  await logSystemError(adminClient, { source: SOURCE, ...input });
}

async function failDeposit(
  adminClient: SupabaseClient | null,
  logInput: Omit<LogSystemErrorInput, 'source'>,
  body: Record<string, unknown>,
  status = 500,
): Promise<Response> {
  await reportDepositError(adminClient, logInput);
  return jsonResponse(body, status);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let adminClient: SupabaseClient | null = null;

  try {
    const { apiKey, sandbox } = getAsaasConfig();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    if (supabaseUrl && serviceKey) {
      adminClient = createClient(supabaseUrl, serviceKey);
    }

    if (!apiKey) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: 'ASAAS_API_KEY_MISSING',
          message: 'ASAAS_API_KEY não configurado nos Secrets do Supabase.',
        },
        { error: 'ASAAS_API_KEY não configurado nos Secrets do Supabase.' },
        500,
      );
    }

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'payment',
          code: 'SUPABASE_CONFIG_MISSING',
          message: 'Supabase não configurado na Edge Function create-asaas-wallet-deposit.',
        },
        { error: 'Supabase não configurado na Edge Function.' },
        500,
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Faça login para recarregar a carteira.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as CreateWalletDepositBody;
    const amountCents = Math.round(Number(body.amountCents) || 0);
    const userId = authData.user.id;

    if (amountCents < 1000) {
      return jsonResponse({ error: 'Valor mínimo de recarga: R$ 10,00.' }, 400);
    }

    if (amountCents > 5_000_000) {
      return jsonResponse({ error: 'Valor máximo de recarga: R$ 50.000,00 por operação.' }, 400);
    }

    const { data: profileRow, error: profileError } = await adminClient
      .from('users')
      .select('id, email, nome_completo, display_name, cpf, telefone, asaas_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profileRow) {
      return failDeposit(
        adminClient,
        {
          severity: 'warning',
          category: 'payment',
          code: 'USER_PROFILE_NOT_FOUND',
          message: profileError?.message ?? 'Perfil não encontrado ao iniciar recarga Pix.',
          userId,
          payload: { amountCents },
        },
        { error: 'Perfil não encontrado.' },
        400,
      );
    }

    const profile = profileRow as UserProfile;
    const cpf = onlyDigits(profile.cpf);
    const buyerName =
      profile.nome_completo?.trim() || profile.display_name?.trim() || 'Usuário Levou';

    if (cpf.length !== 11 && cpf.length !== 14) {
      return jsonResponse({
        error: 'Complete seu CPF/CNPJ no cadastro (KYC) antes de recarregar via Pix.',
      }, 400);
    }

    const pixKeyCheck = await listAsaasPixAddressKeys();
    if (!pixKeyCheck.ok) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: 'ASAAS_PIX_KEYS_API_FAILED',
          message: 'Falha ao consultar chaves Pix no Asaas antes da recarga.',
          userId,
          payload: { amountCents, asaasSandbox: sandbox },
        },
        {
          error: 'Não foi possível validar a conta Pix no Asaas. Tente novamente em instantes.',
          code: 'ASAAS_PIX_KEYS_API_FAILED',
          asaasSandbox: sandbox,
        },
        502,
      );
    }

    if (pixKeyCheck.keys.length === 0) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: 'ASAAS_PIX_KEY_MISSING',
          message: sandbox
            ? 'Conta Asaas sandbox sem chave Pix cadastrada.'
            : 'Conta Asaas sem chave Pix cadastrada.',
          userId,
          payload: { amountCents, asaasSandbox: sandbox },
        },
        {
          error: sandbox
            ? 'Conta Asaas sandbox sem chave Pix. Acesse sandbox.asaas.com → Minha Conta → Pix → Cadastrar chave (e-mail aleatório serve). Depois tente de novo.'
            : 'Conta Asaas sem chave Pix cadastrada. Cadastre em asaas.com → Minha Conta → Pix antes de recarregar.',
          code: 'ASAAS_PIX_KEY_MISSING',
          asaasSandbox: sandbox,
        },
        400,
      );
    }

    let asaasCustomerId = profile.asaas_customer_id;

    if (!asaasCustomerId) {
      const existing = await findCustomerByExternalReference(userId);
      if (existing?.id) {
        asaasCustomerId = existing.id;
      } else {
        const created = await createAsaasCustomer({
          name: buyerName,
          cpfCnpj: cpf,
          email: profile.email,
          mobilePhone: onlyDigits(profile.telefone) || undefined,
          externalReference: userId,
        });
        if (!created?.id) {
          return failDeposit(
            adminClient,
            {
              severity: 'critical',
              category: 'pix',
              code: 'ASAAS_CUSTOMER_CREATE_FAILED',
              message: 'Não foi possível cadastrar o cliente no Asaas.',
              userId,
              payload: { amountCents, asaasSandbox: sandbox },
            },
            { error: 'Não foi possível cadastrar o cliente no Asaas.' },
            502,
          );
        }
        asaasCustomerId = created.id;
      }

      const { error: linkError } = await adminClient.rpc('vincular_asaas_customer', {
        p_user_id: userId,
        p_asaas_customer_id: asaasCustomerId,
      });

      if (linkError) {
        return failDeposit(
          adminClient,
          {
            severity: 'warning',
            category: 'payment',
            code: 'ASAAS_CUSTOMER_LINK_FAILED',
            message: linkError.message,
            userId,
            payload: { asaasCustomerId, amountCents },
          },
          { error: linkError.message },
          500,
        );
      }
    }

    const depositRef = crypto.randomUUID();

    const payment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: Number((amountCents / 100).toFixed(2)),
      dueDate: formatDueDate(1),
      description: `Recarga carteira Levou — ${userId.slice(0, 8)}`.slice(0, 140),
      externalReference: depositRef,
    });

    if (!payment?.id) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: 'ASAAS_PAYMENT_CREATE_FAILED',
          message: 'Falha ao criar cobrança Pix no Asaas.',
          userId,
          payload: { amountCents, asaasCustomerId, asaasSandbox: sandbox },
        },
        { error: 'Falha ao criar cobrança Pix no Asaas.' },
        502,
      );
    }

    const pixResult = await getAsaasPixQrCodeWithRetry(payment.id);
    const pix = pixResult.pix;
    if (!pix?.payload?.trim()) {
      const pixMessage = buildPixUnavailableMessage({
        sandbox,
        status: pixResult.status,
        asaasError: pixResult.errorMessage,
      });

      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: pixResult.status === 404 ? 'ASAAS_PIX_KEY_MISSING' : 'ASAAS_PIX_QR_UNAVAILABLE',
          message: pixMessage,
          userId,
          payload: {
            amountCents,
            asaasPaymentId: payment.id,
            asaasStatus: pixResult.status ?? null,
            asaasError: pixResult.errorMessage ?? null,
            asaasSandbox: sandbox,
          },
        },
        {
          error: pixMessage,
          code: 'ASAAS_PIX_QR_UNAVAILABLE',
          asaasPaymentId: payment.id,
          asaasSandbox: sandbox,
        },
        502,
      );
    }

    const { data: feeRow } = await adminClient.rpc('estimar_taxa_gateway_cents', {
      p_provider: 'asaas',
      p_method: 'pix',
      p_total_cents: amountCents,
    });
    const gatewayFeeCents = Number(feeRow) || 0;

    const { data: depositRow, error: depositError } = await adminClient.rpc(
      'iniciar_recarga_carteira',
      {
        p_user_id: userId,
        p_amount_cents: amountCents,
        p_asaas_payment_id: payment.id,
        p_gateway_fee_cents: gatewayFeeCents,
      },
    );

    if (depositError) {
      return failDeposit(
        adminClient,
        {
          severity: 'critical',
          category: 'pix',
          code: 'WALLET_DEPOSIT_RPC_FAILED',
          message: depositError.message,
          userId,
          payload: {
            amountCents,
            asaasPaymentId: payment.id,
            gatewayFeeCents,
          },
        },
        { error: depositError.message },
        500,
      );
    }

    const deposit = depositRow as { deposit_id?: string } | null;

    return jsonResponse({
      ok: true,
      depositId: deposit?.deposit_id ?? null,
      asaasPaymentId: payment.id,
      amountCents,
      pixQrBase64: pix.encodedImage ?? null,
      pixCopyPaste: pix.payload.trim(),
      pixExpiration: pix.expirationDate ?? null,
      asaasSandbox: sandbox,
      status: 'PENDING',
    });
  } catch (error) {
    const message = describeCaughtError(error);
    const severity: SystemErrorSeverity = 'critical';

    await reportDepositError(adminClient, {
      severity,
      category: 'pix',
      code: isLikelyTimeoutError(error) ? 'TIMEOUT' : 'UNHANDLED_EXCEPTION',
      message,
      payload: { stack: error instanceof Error ? error.stack ?? null : null },
    });

    return jsonResponse({ error: message }, 500);
  }
});
