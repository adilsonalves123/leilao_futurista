import { Platform } from 'react-native';

import { JarvisAssistChip } from '@/components/ai/JarvisAssistChip';
import { AuctionAiSheet } from '@/components/ai/AuctionAiSheet';
import { JarvisHubSheet } from '@/components/ai/JarvisHubSheet';
import { JarvisProactiveBanner } from '@/components/ai/JarvisProactiveBanner';
import { useJarvis } from '@/src/store/jarvisContext';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const CHIP_LIFT = 10;

export function JarvisGlobalHost() {
  const {
    open,
    openJarvis,
    closeJarvis,
    auctionContext,
    fabBottomOffset,
    hideFab,
    proactiveAlertas,
    recarregarAlertas,
  } = useJarvis();

  if (hideFab) return null;

  const chipBottom = auctionContext
    ? fabBottomOffset + CHIP_LIFT
    : TAB_BAR_HEIGHT + CHIP_LIFT;
  const bannerBottom = chipBottom + 44;

  return (
    <>
      <JarvisProactiveBanner
        alertas={proactiveAlertas}
        onOpenJarvis={openJarvis}
        onDismiss={recarregarAlertas}
        bottomOffset={bannerBottom}
        visible={!open && proactiveAlertas.length > 0}
      />

      <JarvisAssistChip
        onPress={openJarvis}
        bottomOffset={chipBottom}
        hidden={open}
        label={auctionContext ? 'Analisar lote' : 'Jarvis'}
      />

      {auctionContext ? (
        <AuctionAiSheet
          visible={open}
          onClose={closeJarvis}
          auctionId={auctionContext.auctionId}
          auctionTitle={auctionContext.auctionTitle}
          bidCents={auctionContext.bidCents}
          marketCents={auctionContext.marketCents}
          description={auctionContext.description}
          conservationState={auctionContext.conservationState}
          category={auctionContext.category}
        />
      ) : (
        <JarvisHubSheet visible={open} onClose={closeJarvis} />
      )}
    </>
  );
}
