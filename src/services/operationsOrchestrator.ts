import { DISPUTE_WINDOW_HOURS } from '@/src/constants/operations';
import { isPastDeadline } from '@/src/lib/businessHours';
import { applyRefund, applySplit } from '@/src/services/settlementService';
import type {
  Listing,
  ListingDraft,
  OperationsState,
  Order,
  PaymentMethod,
} from '@/src/types/operations';
import { processPayment, type ProcessPaymentInput } from '@/src/services/escrowService';

function updateOrder(state: OperationsState, orderId: string, patch: Partial<Order>): OperationsState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o,
    ),
  };
}

function findOrder(state: OperationsState, orderId: string): Order | undefined {
  return state.orders.find((o) => o.id === orderId);
}

export function publishListing(
  state: OperationsState,
  draft: ListingDraft,
  vendorId: string,
): OperationsState {
  const listing: Listing = {
    ...draft,
    id: `lst-${Date.now()}`,
    vendorId,
    publishedAt: new Date().toISOString(),
  };
  return { ...state, listings: [...state.listings, listing] };
}

export function payOrder(
  state: OperationsState,
  input: ProcessPaymentInput,
  orderId?: string,
): { state: OperationsState; orderId: string } {
  const id = orderId ?? `ord-${Date.now()}`;
  return processPayment(state, input, id);
}

export function simulatePosting(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'RETIDO_EM_CUSTODIA') return state;

  let next = updateOrder(state, orderId, { status: 'EM_TRANSITO' });
  next = {
    ...next,
    shipments: next.shipments.map((s) =>
      s.orderId === orderId ? { ...s, postedAt: new Date().toISOString() } : s,
    ),
  };
  return next;
}

export function simulateDelivery(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'EM_TRANSITO') return state;

  const confirmationDeadlineAt = new Date(
    Date.now() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  let next = updateOrder(state, orderId, {
    status: 'AGUARDANDO_CONFIRMACAO',
    confirmationDeadlineAt,
  });
  next = {
    ...next,
    shipments: next.shipments.map((s) =>
      s.orderId === orderId ? { ...s, deliveredAt: new Date().toISOString() } : s,
    ),
  };
  return next;
}

export function confirmReceipt(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'AGUARDANDO_CONFIRMACAO') return state;

  let next = updateOrder(state, orderId, { status: 'LIQUIDADO' });
  next = applySplit(next, order);
  return next;
}

export function openDispute(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'AGUARDANDO_CONFIRMACAO') return state;
  return updateOrder(state, orderId, { status: 'EM_DISPUTA' });
}

export function resolveDisputeForVendor(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'EM_DISPUTA') return state;

  let next = updateOrder(state, orderId, { status: 'LIQUIDADO' });
  next = applySplit(next, order);
  return next;
}

export function resolveDisputeForBuyer(state: OperationsState, orderId: string): OperationsState {
  const order = findOrder(state, orderId);
  if (!order || order.status !== 'EM_DISPUTA') return state;

  let next = updateOrder(state, orderId, { status: 'ESTORNADO' });
  next = applyRefund(next, order);
  return next;
}

export function expireUnpostedOrders(state: OperationsState): OperationsState {
  let next = state;

  for (const order of state.orders) {
    if (
      order.status === 'RETIDO_EM_CUSTODIA' &&
      isPastDeadline(order.postingDeadlineAt)
    ) {
      next = updateOrder(next, order.id, { status: 'EXPIRADO' });
      next = applyRefund(next, order);
    }
  }

  return next;
}

export function autoConfirmDeliveredOrders(state: OperationsState): OperationsState {
  let next = state;

  for (const order of state.orders) {
    if (
      order.status === 'AGUARDANDO_CONFIRMACAO' &&
      isPastDeadline(order.confirmationDeadlineAt)
    ) {
      next = updateOrder(next, order.id, { status: 'LIQUIDADO' });
      next = applySplit(next, order);
    }
  }

  return next;
}

export function runScheduledChecks(state: OperationsState): OperationsState {
  let next = expireUnpostedOrders(state);
  next = autoConfirmDeliveredOrders(next);
  return next;
}

export function withdrawAvailable(state: OperationsState, amountCents: number): OperationsState {
  if (state.vendorWallet.heldCents > 0) return state;
  const amount = Math.min(amountCents, state.vendorWallet.availableCents);
  if (amount <= 0) return state;

  return {
    ...state,
    vendorWallet: {
      ...state.vendorWallet,
      availableCents: state.vendorWallet.availableCents - amount,
    },
  };
}

export function getListingForAuction(state: OperationsState, auctionId: string): Listing | undefined {
  return state.listings.find((l) => l.id === auctionId) ?? state.listings[0];
}

export type { PaymentMethod, ProcessPaymentInput };
