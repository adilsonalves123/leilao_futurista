import type { ListingCategoryId } from '@/src/lib/listingPublishValidation';

export type ListingCopyPlaceholders = {
  title: string;
  description: string;
};

const PLACEHOLDERS: Record<ListingCategoryId, ListingCopyPlaceholders> = {
  eletronicos: {
    title: 'Ex: iPhone 16 Pro Max 256GB Novo',
    description:
      'Descreva o estado do item, acessórios inclusos, bateria, garantia e eventuais marcas de uso...',
  },
  veiculos: {
    title: 'Ex: Honda Civic 2020 EX 2.0 Flex',
    description:
      'Quilometragem, revisões, IPVA/documentação em dia, opcionais, pneus e histórico de sinistro...',
  },
  imoveis: {
    title: 'Ex: Apartamento 3 quartos — Vila Mariana, SP',
    description:
      'Metragem, andar, vagas, condomínio, IPTU, mobiliado e pontos de referência próximos...',
  },
  produtos_gerais: {
    title: 'Ex: Tênis Nike Air Max 42 — Novo com etiqueta',
    description:
      'Marca, tamanho, material, estado de conservação e o que acompanha a embalagem...',
  },
  colecionaveis: {
    title: 'Ex: Action Figure Dragon Ball — edição limitada',
    description:
      'Ano, edição, certificado de autenticidade, embalagem lacrada e histórico de conservação...',
  },
  outros: {
    title: 'Ex: Violão Yamaha FG830 — pouco uso',
    description:
      'Descreva o estado do item, o que está incluso e detalhes que ajudem o comprador...',
  },
};

export function getListingCopyPlaceholders(category: ListingCategoryId): ListingCopyPlaceholders {
  return PLACEHOLDERS[category];
}
