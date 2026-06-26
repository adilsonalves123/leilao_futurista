import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { validateListingDraft } from '@/src/services/listingCompliance';
import {
  confirmReceipt,
  openDispute,
  payOrder,
  publishListing,
  resolveDisputeForBuyer,
  resolveDisputeForVendor,
  runScheduledChecks,
  simulateDelivery,
  simulatePosting,
  withdrawAvailable,
  type PaymentMethod,
  type ProcessPaymentInput,
} from '@/src/services/operationsOrchestrator';
import { syncLocalOrderStatus } from '@/src/services/orderPersistence';
import { registrarPagamentoConfirmadoNotificacao } from '@/src/services/userNotifications';
import { MOCK_AUCTION_LIST } from '@/src/mocks/auctions';
import type { ListingDraft, OperationsState } from '@/src/types/operations';

const initialState: OperationsState = {
  listings: [],
  orders: [],
  shipments: [],
  vendorWallet: {
    vendorId: MOCK_VENDOR_ID,
    availableCents: 0,
    heldCents: 0,
  },
  adminWallet: {
    commissionCents: 0,
  },
};

type Action =
  | { type: 'SET_STATE'; state: OperationsState }
  | { type: 'PUBLISH_LISTING'; draft: ListingDraft; vendorId: string }
  | { type: 'PAY_ORDER'; input: ProcessPaymentInput; orderId: string }
  | { type: 'SIMULATE_POSTING'; orderId: string }
  | { type: 'SIMULATE_DELIVERY'; orderId: string }
  | { type: 'CONFIRM_RECEIPT'; orderId: string }
  | { type: 'OPEN_DISPUTE'; orderId: string }
  | { type: 'RESOLVE_VENDOR'; orderId: string }
  | { type: 'RESOLVE_BUYER'; orderId: string }
  | { type: 'WITHDRAW'; amountCents: number }
  | { type: 'TICK' };

function reducer(state: OperationsState, action: Action): OperationsState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state;
    case 'PUBLISH_LISTING':
      return publishListing(state, action.draft, action.vendorId);
    case 'PAY_ORDER':
      return payOrder(state, action.input, action.orderId).state;
    case 'SIMULATE_POSTING':
      return simulatePosting(state, action.orderId);
    case 'SIMULATE_DELIVERY':
      return simulateDelivery(state, action.orderId);
    case 'CONFIRM_RECEIPT':
      return confirmReceipt(state, action.orderId);
    case 'OPEN_DISPUTE':
      return openDispute(state, action.orderId);
    case 'RESOLVE_VENDOR':
      return resolveDisputeForVendor(state, action.orderId);
    case 'RESOLVE_BUYER':
      return resolveDisputeForBuyer(state, action.orderId);
    case 'WITHDRAW':
      return withdrawAvailable(state, action.amountCents);
    case 'TICK':
      return runScheduledChecks(state);
    default:
      return state;
  }
}

type OperationsContextValue = {
  state: OperationsState;
  publishListing: (draft: ListingDraft, vendorId?: string) => { ok: boolean; errors?: string[] };
  payOrder: (input: ProcessPaymentInput) => string | null;
  simulatePosting: (orderId: string) => void;
  simulateDelivery: (orderId: string) => void;
  confirmReceipt: (orderId: string) => void;
  openDispute: (orderId: string) => void;
  resolveDisputeForVendor: (orderId: string) => void;
  resolveDisputeForBuyer: (orderId: string) => void;
  withdraw: (amountCents: number) => boolean;
  getOrder: (orderId: string) => OperationsState['orders'][number] | undefined;
  getShipmentForOrder: (orderId: string) => OperationsState['shipments'][number] | undefined;
  getOrdersForVendor: () => OperationsState['orders'];
  getDisputedOrders: () => OperationsState['orders'];
};

const OperationsContext = createContext<OperationsContextValue | null>(null);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 30_000);
    return () => clearInterval(id);
  }, []);

  const publishListingAction = useCallback((draft: ListingDraft, vendorId = MOCK_VENDOR_ID) => {
    const result = validateListingDraft(draft);
    if (!result.ok) return result;
    dispatch({ type: 'PUBLISH_LISTING', draft, vendorId });
    return { ok: true };
  }, []);

  const payOrderAction = useCallback((input: ProcessPaymentInput) => {
    const orderId = `ord-${Date.now()}`;
    dispatch({ type: 'PAY_ORDER', input, orderId });
    const titulo =
      MOCK_AUCTION_LIST.find((a) => a.id === input.auctionId)?.title ?? 'Seu anúncio';
    void registrarPagamentoConfirmadoNotificacao({
      vendorId: input.vendorId,
      auctionId: input.auctionId,
      auctionTitle: titulo,
      orderId,
      totalCents: input.itemCents + input.shippingCents,
    });
    return orderId;
  }, []);

  const simulatePostingAction = useCallback((orderId: string) => {
    dispatch({ type: 'SIMULATE_POSTING', orderId });
    void syncLocalOrderStatus(orderId, 'EM_TRANSITO');
  }, []);

  const simulateDeliveryAction = useCallback((orderId: string) => {
    dispatch({ type: 'SIMULATE_DELIVERY', orderId });
    void syncLocalOrderStatus(orderId, 'AGUARDANDO_CONFIRMACAO');
  }, []);

  const confirmReceiptAction = useCallback((orderId: string) => {
    dispatch({ type: 'CONFIRM_RECEIPT', orderId });
    void syncLocalOrderStatus(orderId, 'LIQUIDADO');
  }, []);

  const openDisputeAction = useCallback((orderId: string) => {
    dispatch({ type: 'OPEN_DISPUTE', orderId });
    void syncLocalOrderStatus(orderId, 'EM_DISPUTA');
  }, []);

  const resolveDisputeForVendorAction = useCallback((orderId: string) => {
    dispatch({ type: 'RESOLVE_VENDOR', orderId });
    void syncLocalOrderStatus(orderId, 'LIQUIDADO');
  }, []);

  const resolveDisputeForBuyerAction = useCallback((orderId: string) => {
    dispatch({ type: 'RESOLVE_BUYER', orderId });
    void syncLocalOrderStatus(orderId, 'ESTORNADO');
  }, []);

  const value = useMemo<OperationsContextValue>(
    () => ({
      state,
      publishListing: publishListingAction,
      payOrder: payOrderAction,
      simulatePosting: simulatePostingAction,
      simulateDelivery: simulateDeliveryAction,
      confirmReceipt: confirmReceiptAction,
      openDispute: openDisputeAction,
      resolveDisputeForVendor: resolveDisputeForVendorAction,
      resolveDisputeForBuyer: resolveDisputeForBuyerAction,
      withdraw: (amountCents) => {
        if (state.vendorWallet.heldCents > 0) return false;
        dispatch({ type: 'WITHDRAW', amountCents });
        return true;
      },
      getOrder: (orderId) => state.orders.find((o) => o.id === orderId),
      getShipmentForOrder: (orderId) => state.shipments.find((s) => s.orderId === orderId),
      getOrdersForVendor: () =>
        state.orders.filter((o) => o.vendorId === MOCK_VENDOR_ID),
      getDisputedOrders: () => state.orders.filter((o) => o.status === 'EM_DISPUTA'),
    }),
    [state, publishListingAction, payOrderAction, simulatePostingAction, simulateDeliveryAction, confirmReceiptAction, openDisputeAction, resolveDisputeForVendorAction, resolveDisputeForBuyerAction],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperationsStore(): OperationsContextValue {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error('useOperationsStore deve ser usado dentro de OperationsProvider');
  return ctx;
}

export type { PaymentMethod, ProcessPaymentInput };
