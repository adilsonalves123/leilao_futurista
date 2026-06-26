import {
  calcularGarantiaVendedorLocal,
  type VendorCollateralPreview,
} from '@/src/constants/payments';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  getListingWalletBalanceCents,
  getWalletBreakdownCents,
} from '@/src/services/listingWalletBalance';

export async function previewGarantiaVendedor(
  itemCents: number,
): Promise<VendorCollateralPreview> {
  if (itemCents <= 0) {
    return {
      holdCents: 0,
      availableBalanceCents: 0,
      completedSales: 0,
      newVendorMultiplier: 1,
      sufficient: true,
    };
  }

  if (isMockMode() || !isSupabaseConfigured()) {
    const breakdown = await getWalletBreakdownCents();
    const holdCents = calcularGarantiaVendedorLocal(itemCents);
    return {
      holdCents,
      availableBalanceCents: breakdown.availableCents,
      completedSales: 0,
      newVendorMultiplier: 1.5,
      sufficient: breakdown.availableCents >= holdCents,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    const balance = await getListingWalletBalanceCents();
    const holdCents = calcularGarantiaVendedorLocal(itemCents);
    return {
      holdCents,
      availableBalanceCents: balance,
      completedSales: 0,
      newVendorMultiplier: 1.5,
      sufficient: balance >= holdCents,
    };
  }

  const { data, error } = await supabase.rpc('preview_garantia_vendedor', {
    p_item_cents: itemCents,
  });

  if (error || !data) {
    const balance = await getListingWalletBalanceCents();
    const holdCents = calcularGarantiaVendedorLocal(itemCents);
    return {
      holdCents,
      availableBalanceCents: balance,
      completedSales: 0,
      newVendorMultiplier: 1.5,
      sufficient: balance >= holdCents,
    };
  }

  const row = data as {
    hold_cents?: number;
    available_balance_cents?: number;
    completed_sales?: number;
    new_vendor_multiplier?: number;
    sufficient?: boolean;
  };

  return {
    holdCents: Number(row.hold_cents) || 0,
    availableBalanceCents: Number(row.available_balance_cents) || 0,
    completedSales: Number(row.completed_sales) || 0,
    newVendorMultiplier: Number(row.new_vendor_multiplier) || 1,
    sufficient: row.sufficient === true,
  };
}
