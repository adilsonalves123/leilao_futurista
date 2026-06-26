export type PaymentMethod = 'CARTAO' | 'PIX' | 'CRIPTO';

export type TransactionStatus =
  | 'PENDENTE'
  | 'RETIDO_EM_CUSTODIA'
  | 'EM_TRANSITO'
  | 'ENTREGUE'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'LIQUIDADO'
  | 'EM_DISPUTA'
  | 'EXPIRADO'
  | 'ESTORNADO';

export type DimensionsCm = {
  comprimento: number;
  largura: number;
  altura: number;
};

export type ListingDraft = {
  title: string;
  priceCents: number;
  weightKg: number;
  dimensions: DimensionsCm;
  nfAccessKey?: string;
  nfPdfUri?: string;
};

export type Listing = ListingDraft & {
  id: string;
  vendorId: string;
  publishedAt: string;
};

export type Order = {
  id: string;
  listingId: string;
  auctionId: string;
  buyerId: string;
  vendorId: string;
  itemCents: number;
  shippingCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  shipmentId?: string;
  postingDeadlineAt?: string;
  confirmationDeadlineAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Shipment = {
  id: string;
  orderId: string;
  carrier: 'MELHOR_ENVIO' | 'CORREIOS';
  trackingCode: string;
  labelUrl: string;
  qrCodeData: string;
  postedAt?: string;
  deliveredAt?: string;
  createdAt: string;
};

export type VendorWallet = {
  vendorId: string;
  availableCents: number;
  heldCents: number;
};

export type AdminWallet = {
  commissionCents: number;
};

export type OperationsState = {
  listings: Listing[];
  orders: Order[];
  shipments: Shipment[];
  vendorWallet: VendorWallet;
  adminWallet: AdminWallet;
};

export type ComplianceResult = {
  ok: boolean;
  errors: string[];
};
