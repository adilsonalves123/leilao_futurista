import type { AdminDisputaDetalhe, AdminDisputaResumo } from '@/src/types/adminDisputas';

export const DISPUTAS_ADMIN_MOCK: AdminDisputaResumo[] = [
  {
    disputeId: 'd-mock-45816',
    orderId: 'ord-45816',
    orderCode: '#LC-45816',
    auctionTitle: 'Sony A7 IV + Lente 24-70',
    auctionImage:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop',
    buyerName: 'Lucas F.',
    vendorName: 'Foto Pro Equipamentos',
    totalCents: 1420000,
    category: 'produto_danificado',
    reason: 'Lente chegou com fungo interno e corpo com arranhões não mostrados no anúncio.',
    status: 'aberta',
    evidenceCount: 4,
    openedAt: '2025-05-27T10:00:00.000Z',
    updatedAt: '2025-05-27T14:30:00.000Z',
    fonte: 'mock',
  },
  {
    disputeId: 'd-mock-45809',
    orderId: 'ord-45809',
    orderCode: '#LC-45809',
    auctionTitle: 'MacBook Pro M2 14" 512GB',
    auctionImage:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&h=200&fit=crop',
    buyerName: 'Ana Paula',
    vendorName: 'Tech Store SP',
    totalCents: 890000,
    category: 'produto_diferente',
    reason: 'Recebi modelo M1, não M2 como no leilão.',
    status: 'em_analise',
    evidenceCount: 2,
    openedAt: '2025-05-25T18:00:00.000Z',
    updatedAt: '2025-05-26T09:15:00.000Z',
    fonte: 'mock',
  },
];

export function obterDisputaMock(orderId: string): AdminDisputaDetalhe | null {
  const resumo = DISPUTAS_ADMIN_MOCK.find((d) => d.orderId === orderId);
  if (!resumo) return null;

  return {
    disputeId: resumo.disputeId,
    orderId: resumo.orderId,
    orderCode: resumo.orderCode,
    orderStatus: 'em_disputa',
    totalCents: resumo.totalCents,
    itemCents: resumo.totalCents,
    shippingCents: 0,
    trackingCode: 'BR445566778BR',
    category: resumo.category,
    reason: resumo.reason,
    status: resumo.status,
    adminNotes: null,
    resolutionNotes: null,
    openedAt: resumo.openedAt,
    updatedAt: resumo.updatedAt,
    resolvedAt: null,
    auctionTitle: resumo.auctionTitle,
    auctionImage: resumo.auctionImage,
    buyer: { id: 'u-lucas', nome: resumo.buyerName, email: 'lucas.f@email.com' },
    vendor: { id: 'v-foto', nome: resumo.vendorName, email: 'vendas@fotopro.com.br' },
    evidence: [
      {
        id: 'ev-1',
        party: 'comprador',
        kind: 'foto',
        mediaUrl:
          'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop',
        caption: 'Fungo visível na lente — foto ao abrir a caixa',
        createdAt: resumo.openedAt,
      },
      {
        id: 'ev-2',
        party: 'comprador',
        kind: 'video',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        caption: 'Vídeo mostrando arranhão no corpo e teste de autofoco falhando',
        createdAt: resumo.openedAt,
      },
      {
        id: 'ev-3',
        party: 'vendedor',
        kind: 'foto',
        mediaUrl:
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop',
        caption: 'Foto do envio antes de embalar — sem arranhões',
        createdAt: '2025-05-27T12:00:00.000Z',
      },
      {
        id: 'ev-4',
        party: 'admin',
        kind: 'nota_admin',
        mediaUrl:
          'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop',
        caption: 'Print do anúncio original vs. item recebido (análise interna)',
        createdAt: '2025-05-27T14:30:00.000Z',
      },
    ],
    fonte: 'mock',
  };
}
