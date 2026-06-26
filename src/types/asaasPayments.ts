export type CreateAsaasPaymentResult = {
  ok: boolean;
  asaasPaymentId?: string;
  orderId?: string | null;
  orderCode?: string | null;
  paymentProvider?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixQrBase64?: string | null;
  pixCopyPaste?: string | null;
  pixExpiration?: string | null;
  asaasSandbox?: boolean;
  totalCents?: number;
  chargeCents?: number;
  walletAppliedCents?: number;
  paidWithWalletOnly?: boolean;
  status?: string;
  error?: string;
};

export type AsaasPaymentStatusResult = {
  ok: boolean;
  orderId?: string;
  orderCode?: string;
  status?: string;
  paid?: boolean;
  reason?: string;
};

export type CreateAsaasWalletDepositResult = {
  ok: boolean;
  depositId?: string | null;
  asaasPaymentId?: string;
  amountCents?: number;
  pixQrBase64?: string | null;
  pixCopyPaste?: string | null;
  pixExpiration?: string | null;
  asaasSandbox?: boolean;
  status?: string;
  error?: string;
};

export type AsaasWalletDepositStatusResult = {
  ok: boolean;
  depositId?: string;
  status?: string;
  received?: boolean;
  amountCents?: number;
  newBalanceCents?: number;
  reason?: string;
};
