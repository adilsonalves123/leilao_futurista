import type { LucideIcon } from 'lucide-react-native';
import {
  Building2,
  Car,
  Gem,
  LayoutGrid,
  Package,
  Smartphone,
} from 'lucide-react-native';

import type { ListingCategoryId } from '@/src/lib/listingPublishValidation';

export type ListingCategoryCard = {
  id: ListingCategoryId;
  label: string;
  hint: string;
  icon: LucideIcon;
  badge?: string;
  featured?: boolean;
};

/** Ordem pensada para conversão: eletrônicos em destaque no topo da grade. */
export const LISTING_CATEGORY_CARDS: ListingCategoryCard[] = [
  {
    id: 'eletronicos',
    label: 'Eletrônicos',
    hint: 'Celular, notebook, games, TV…',
    icon: Smartphone,
    badge: 'Ficha técnica',
    featured: true,
  },
  {
    id: 'produtos_gerais',
    label: 'Produtos gerais',
    hint: 'Moda, casa, ferramentas, etc.',
    icon: Package,
  },
  {
    id: 'veiculos',
    label: 'Veículos',
    hint: 'Carros, motos e caminhonetes',
    icon: Car,
  },
  {
    id: 'imoveis',
    label: 'Imóveis',
    hint: 'Casas, aptos e terrenos',
    icon: Building2,
  },
  {
    id: 'colecionaveis',
    label: 'Colecionáveis',
    hint: 'Raros, arte, memorabilia',
    icon: Gem,
  },
  {
    id: 'outros',
    label: 'Outros',
    hint: 'Instrumentos, itens únicos',
    icon: LayoutGrid,
  },
];

export function labelListingCategory(id: ListingCategoryId | null | undefined): string {
  if (!id) return '';
  return LISTING_CATEGORY_CARDS.find((c) => c.id === id)?.label ?? id;
}
