import { POSTING_DEADLINE_BUSINESS_HOURS } from '@/src/constants/operations';
import { addBusinessHours } from '@/src/lib/businessHours';
import type { Order, PaymentMethod, OperationsState } from '@/src/types/operations';
import { createMockShipment } from '@/src/services/shippingService';

export type ProcessPaymentInput = {
  listingId: string;
  auctionId: string;
  buyerId: string;
  vendorId: string;
  itemCents: number;
  shippingCents: number;
  paymentMethod: PaymentMethod;
};

export function processPayment(
  state: OperationsState,
  input: ProcessPaymentInput,
  orderId = `ord-${Date.now()}`,
): { state: OperationsState; orderId: string } {
  const now = new Date();
  const totalCents = input.itemCents + input.shippingCents;

  const order: Order = {
    id: orderId,
    listingId: input.listingId,
    auctionId: input.auctionId,
    buyerId: input.buyerId,
    vendorId: input.vendorId,
    itemCents: input.itemCents,
    shippingCents: input.shippingCents,
    totalCents,
    paymentMethod: input.paymentMethod,
    status: 'RETIDO_EM_CUSTODIA',
    postingDeadlineAt: addBusinessHours(now, POSTING_DEADLINE_BUSINESS_HOURS).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const shipment = createMockShipment(orderId);
  order.shipmentId = shipment.id;

  return {
    state: {
      ...state,
      orders: [...state.orders, order],
      shipments: [...state.shipments, shipment],
      vendorWallet: {
        ...state.vendorWallet,
        heldCents: state.vendorWallet.heldCents + totalCents,
      },
    },
    orderId,
  };
}

export function canWithdraw(wallet: OperationsState['vendorWallet']): boolean {
  return wallet.heldCents === 0 && wallet.availableCents > 0;
}
