import type { ConservationState } from '@/src/constants/listingForm';
import type { ElectronicTypeId } from '@/src/constants/electronicsCatalog';
import type { ElectronicsTechSheetValues } from '@/src/constants/electronicsTechSheet';
import type { PropertyTechSheetValues } from '@/src/constants/propertyTechSheet';
import type { VehicleTechSheetValues } from '@/src/constants/vehicleTechSheet';
import type { AuctionDuration, ListingCategory } from '@/src/lib/listingCategories';
import type { ListingPromotionSelection } from '@/src/types/promotions';

export type ListingPublishInput = {
  category: ListingCategory;
  title: string;
  description: string;
  photos: string[];
  estimatedMarketValue: string;
  startPrice: string;
  auctionDuration: AuctionDuration;
  conservationState: ConservationState;
  originCep: string;
  serialImei: string;
  serialImeiKind: 'imei' | 'serial' | null;
  electronicTypeId: ElectronicTypeId | null;
  electronicTypeLabel: string | null;
  electronicsTechSheet: ElectronicsTechSheetValues;
  vehicleTechSheet: VehicleTechSheetValues;
  propertyTechSheet: PropertyTechSheetValues;
  optionalSerial: string;
  nfAccessKey: string;
  nfPdfAttached: boolean;
  ownershipDeclarationAccepted: boolean;
  promotionSelection: ListingPromotionSelection;
  weightKg: string;
  heightCm: string;
  widthCm: string;
  lengthCm: string;
};

export type ListingPublishResult = {
  ok: boolean;
  auctionId?: string;
  totalChargedCents?: number;
  collateralHeldCents?: number;
  newBalanceCents?: number;
  newCollateralHeldCents?: number;
  availableBalanceCents?: number;
  erro?: string;
  fonte: 'supabase' | 'mock';
};
