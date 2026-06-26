import { useEffect } from 'react';

import { isMockAuctionId } from '@/src/lib/auctionIds';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

/**
 * Recarrega dados quando o leilão é atualizado no Supabase (status, preço, etc.).
 */
export function useAuctionRealtime(auctionId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!auctionId || isMockMode() || isMockAuctionId(auctionId) || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`auction-live-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        () => onUpdate(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        () => onUpdate(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, onUpdate]);
}
