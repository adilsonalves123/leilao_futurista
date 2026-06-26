import { usePathname } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { BuyerJarvisAlert } from '@/src/types/buyerJarvis';
import { carregarContextoBuyerJarvis } from '@/src/services/buyerJarvis';
import { filtrarAlertasDispensados } from '@/src/lib/jarvisAlertDismiss';

let jarvisExternalOpener: (() => void) | null = null;

export function registerJarvisExternalOpener(fn: (() => void) | null) {
  jarvisExternalOpener = fn;
}

export function openJarvisFromExternal() {
  jarvisExternalOpener?.();
}

export type JarvisAuctionContext = {
  auctionId: string;
  auctionTitle: string;
  bidCents: number;
  marketCents: number | null;
  description?: string;
  conservationState?: string | null;
  category?: string | null;
};

type JarvisContextValue = {
  open: boolean;
  openJarvis: () => void;
  closeJarvis: () => void;
  auctionContext: JarvisAuctionContext | null;
  setAuctionContext: (ctx: JarvisAuctionContext | null) => void;
  fabBottomOffset: number;
  setFabBottomOffset: (offset: number) => void;
  hideFab: boolean;
  proactiveAlertas: BuyerJarvisAlert[];
  recarregarAlertas: () => Promise<void>;
};

const JarvisContext = createContext<JarvisContextValue | null>(null);

const BUYER_FAB_HIDDEN_PREFIXES = [
  '/splash',
  '/login',
  '/register',
  '/admin',
  '/(auth)',
];

const ADMIN_FAB_HIDDEN_SUFFIXES = ['/admin/login', '/admin/assistente'];

export function shouldHideBuyerJarvisFab(pathname: string) {
  return BUYER_FAB_HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.includes(p),
  );
}

export function shouldHideAdminJarvisFab(pathname: string) {
  if (pathname.includes('/admin/login')) return true;
  return ADMIN_FAB_HIDDEN_SUFFIXES.some(
    (p) => pathname === p || pathname.endsWith(`${p}/`) || pathname.endsWith(p),
  );
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [auctionContext, setAuctionContext] = useState<JarvisAuctionContext | null>(null);
  const [fabBottomOffset, setFabBottomOffset] = useState(96);
  const [proactiveAlertas, setProactiveAlertas] = useState<BuyerJarvisAlert[]>([]);

  const hideFab = shouldHideBuyerJarvisFab(pathname);

  const openJarvis = useCallback(() => setOpen(true), []);
  const closeJarvis = useCallback(() => setOpen(false), []);

  const recarregarAlertas = useCallback(async () => {
    const ctx = await carregarContextoBuyerJarvis(pathname);
    const filtrados = await filtrarAlertasDispensados(ctx.alertas ?? []);
    setProactiveAlertas(filtrados);
  }, [pathname]);

  useEffect(() => {
    void recarregarAlertas();
  }, [recarregarAlertas]);

  useEffect(() => {
    registerJarvisExternalOpener(openJarvis);
    return () => registerJarvisExternalOpener(null);
  }, [openJarvis]);

  const value = useMemo(
    () => ({
      open,
      openJarvis,
      closeJarvis,
      auctionContext,
      setAuctionContext,
      fabBottomOffset,
      setFabBottomOffset,
      hideFab,
      proactiveAlertas,
      recarregarAlertas,
    }),
    [
      open,
      openJarvis,
      closeJarvis,
      auctionContext,
      fabBottomOffset,
      hideFab,
      proactiveAlertas,
      recarregarAlertas,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis() {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis must be used within JarvisProvider');
  return ctx;
}

export function useJarvisOptional() {
  return useContext(JarvisContext);
}
