import { useEffect, useState } from 'react';

import { formatCountdownParts } from '@/src/lib/featuredPlusFormatters';

export function useCountdown(endsAtMs: number) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAtMs]);

  return formatCountdownParts(endsAtMs, nowMs);
}
