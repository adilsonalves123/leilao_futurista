import { COMMISSION_RATE } from '@/src/constants/operations';
import type { Order, OperationsState } from '@/src/types/operations';

export type SplitBreakdown = {
  vendorCents: number;
  adminCommissionCents: number;
  shippingCents: number;
};

export function calculateSplit(order: Order): SplitBreakdown {
  const adminCommissionCents = Math.round(order.itemCents * COMMISSION_RATE);
  const vendorItemCents = order.itemCents - adminCommissionCents;
  const vendorCents = vendorItemCents + order.shippingCents;

  return {
    vendorCents,
    adminCommissionCents,
    shippingCents: order.shippingCents,
  };
}

export function applySplit(state: OperationsState, order: Order): OperationsState {
  const split = calculateSplit(order);

  return {
    ...state,
    vendorWallet: {
      ...state.vendorWallet,
      heldCents: Math.max(0, state.vendorWallet.heldCents - order.totalCents),
      availableCents: state.vendorWallet.availableCents + split.vendorCents,
    },
    adminWallet: {
      commissionCents: state.adminWallet.commissionCents + split.adminCommissionCents,
    },
  };
}

export function applyRefund(state: OperationsState, order: Order): OperationsState {
  return {
    ...state,
    vendorWallet: {
      ...state.vendorWallet,
      heldCents: Math.max(0, state.vendorWallet.heldCents - order.totalCents),
    },
  };
}
