import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type SystemErrorSeverity = 'info' | 'warning' | 'critical';

export type LogSystemErrorInput = {
  source: string;
  severity: SystemErrorSeverity;
  category: string;
  code?: string | null;
  message: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
  orderId?: string | null;
  depositId?: string | null;
};

export async function logSystemError(
  adminClient: SupabaseClient,
  input: LogSystemErrorInput,
): Promise<void> {
  try {
    const { error } = await adminClient.rpc('registrar_erro_sistema', {
      p_source: input.source,
      p_severity: input.severity,
      p_category: input.category,
      p_code: input.code ?? null,
      p_message: input.message,
      p_payload: input.payload ?? {},
      p_user_id: input.userId ?? null,
      p_order_id: input.orderId ?? null,
      p_deposit_id: input.depositId ?? null,
    });

    if (error) {
      console.error('[system_error_logs] rpc failed:', error.message, input);
    }
  } catch (err) {
    console.error('[system_error_logs] insert failed:', err, input);
  }
}

export function describeCaughtError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isLikelyTimeoutError(error: unknown): boolean {
  const text = describeCaughtError(error).toLowerCase();
  return (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('network') ||
    text.includes('connection') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function systemErrorCodeFromMessage(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes('asaas_api_key') || normalized.includes('api_key não configurado')) {
    return 'ASAAS_API_KEY_MISSING';
  }
  if (normalized.includes('chave pix') || normalized.includes('pix key')) {
    return 'ASAAS_PIX_KEY_MISSING';
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'TIMEOUT';
  }
  return null;
}
