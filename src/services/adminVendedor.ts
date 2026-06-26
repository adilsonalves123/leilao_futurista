import type { AdminVendedorPerfil } from '@/src/admin/types';
import {
  LEVOU_OFFICIAL_DISPLAY_NAME,
  LEVOU_OFFICIAL_HANDLE,
  LEVOU_OFFICIAL_MOCK_VENDOR_ID,
  LEVOU_OFFICIAL_USER_ID,
} from '@/src/constants/levouOfficialStore';
import { PEDIDOS_ADMIN_MOCK } from '@/src/admin/pedidosMock';
import {
  parseSellerBadge,
  type SellerBadge,
} from '@/src/constants/sellerBadge';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  REVIEWS_MOCK_INICIAIS,
  listarReviewsPorVendedor,
  mediaAvaliacoes,
} from '@/src/services/reviews';
import type { Review } from '@/src/types/review';
import type { StatusVerificacao } from '@/src/types/database';

const HANDLE_PARA_ID: Record<string, string> = {
  '@luxury_watches': 'v-luxury',
  '@garage_premium': 'v-garage',
  '@tech_store_br': 'v-tech',
  '@sneaker_hub': 'v-sneaker',
  '@music_gear': 'v-music',
  '@drone_master': 'v-drone',
  '@gamer_vini': 'v-gamer',
  '@drone_master': 'v-drone',
  '@gamer_vini': 'v-gamer',
  '@setup_minimal': 'v-setup',
  '@foto_pro': 'v-foto',
  '@levou_oficial': 'levou-oficial',
  [LEVOU_OFFICIAL_USER_ID]: LEVOU_OFFICIAL_USER_ID,
};

const PERFIS_MOCK: Record<string, AdminVendedorPerfil> = {
  'v-luxury': {
    id: 'v-luxury',
    handle: '@luxury_watches',
    nomeExibicao: 'Luxury Watches BR',
    nomeCompleto: 'Ricardo Mendes Alves',
    email: 'contato@luxurywatches.com.br',
    telefone: '5511998877665',
    statusKyc: 'aprovado',
    sellerBadge: 'empresa_verificada',
    mediaEstrelas: 4.9,
    totalAvaliacoes: 28,
    leiloesConcluidos: 24,
    desistencias: 0,
    multasAplicadas: 0,
  },
  'v-garage': {
    id: 'v-garage',
    handle: '@garage_premium',
    nomeExibicao: 'Garage Premium',
    nomeCompleto: 'Fernando Costa Lima',
    email: 'vendas@garagepremium.com.br',
    telefone: '5521987654321',
    statusKyc: 'aprovado',
    sellerBadge: 'empresa_verificada',
    mediaEstrelas: 4.6,
    totalAvaliacoes: 11,
    leiloesConcluidos: 9,
    desistencias: 1,
    multasAplicadas: 1,
  },
  'v-tech': {
    id: 'v-tech',
    handle: '@tech_store_br',
    nomeExibicao: 'Tech Store BR',
    nomeCompleto: 'Juliana Pereira Santos',
    email: 'loja@techstore.com.br',
    telefone: '5511981122334',
    statusKyc: 'aprovado',
    sellerBadge: 'empresa_verificada',
    mediaEstrelas: 5,
    totalAvaliacoes: 42,
    leiloesConcluidos: 38,
    desistencias: 0,
    multasAplicadas: 0,
  },
  'v-sneaker': {
    id: 'v-sneaker',
    handle: '@sneaker_hub',
    nomeExibicao: 'Sneaker Hub',
    nomeCompleto: 'Bruno Oliveira Nunes',
    email: 'suporte@sneakerhub.com.br',
    telefone: '5511976543210',
    statusKyc: 'em_analise',
    sellerBadge: 'particular',
    mediaEstrelas: 4.2,
    totalAvaliacoes: 19,
    leiloesConcluidos: 16,
    desistencias: 2,
    multasAplicadas: 0,
  },
  'v-music': {
    id: 'v-music',
    handle: '@music_gear',
    nomeExibicao: 'Music Gear',
    nomeCompleto: 'Paulo Henrique Dias',
    email: 'contato@musicgear.com.br',
    telefone: '5541987654321',
    statusKyc: 'pendente',
    sellerBadge: null,
    mediaEstrelas: 3.8,
    totalAvaliacoes: 6,
    leiloesConcluidos: 4,
    desistencias: 1,
    multasAplicadas: 1,
  },
  'v-foto': {
    id: 'v-foto',
    handle: '@foto_pro',
    nomeExibicao: 'Foto Pro Equipamentos',
    nomeCompleto: 'Amanda Souza Ribeiro',
    email: 'vendas@fotopro.com.br',
    telefone: '5511995544332',
    statusKyc: 'aprovado',
    sellerBadge: 'particular',
    mediaEstrelas: 4.1,
    totalAvaliacoes: 8,
    leiloesConcluidos: 6,
    desistencias: 1,
    multasAplicadas: 0,
  },
  'v-drone': {
    id: 'v-drone',
    handle: '@drone_master',
    nomeExibicao: 'Drone Master',
    nomeCompleto: 'Eduardo Martins',
    email: 'contato@dronemaster.com.br',
    telefone: '5511987766554',
    statusKyc: 'aprovado',
    sellerBadge: 'particular',
    mediaEstrelas: 4.5,
    totalAvaliacoes: 14,
    leiloesConcluidos: 12,
    desistencias: 0,
    multasAplicadas: 0,
  },
  'v-gamer': {
    id: 'v-gamer',
    handle: '@gamer_vini',
    nomeExibicao: 'Gamer Vini',
    nomeCompleto: 'Vinícius Almeida',
    email: 'vini@gamerstore.com.br',
    telefone: '5511976655443',
    statusKyc: 'aprovado',
    sellerBadge: 'particular',
    mediaEstrelas: 4.7,
    totalAvaliacoes: 22,
    leiloesConcluidos: 20,
    desistencias: 0,
    multasAplicadas: 0,
  },
  'v-setup': {
    id: 'v-setup',
    handle: '@setup_minimal',
    nomeExibicao: 'Setup Minimal',
    nomeCompleto: 'Camila Rocha',
    email: 'ola@setupminimal.com.br',
    telefone: '5511965544332',
    statusKyc: 'em_analise',
    sellerBadge: null,
    mediaEstrelas: 4.0,
    totalAvaliacoes: 9,
    leiloesConcluidos: 7,
    desistencias: 1,
    multasAplicadas: 0,
  },
  [LEVOU_OFFICIAL_MOCK_VENDOR_ID]: {
    id: LEVOU_OFFICIAL_MOCK_VENDOR_ID,
    handle: LEVOU_OFFICIAL_HANDLE,
    nomeExibicao: LEVOU_OFFICIAL_DISPLAY_NAME,
    nomeCompleto: 'Levou Marketplace Ltda.',
    email: 'loja@levou.app.br',
    telefone: null,
    statusKyc: 'aprovado',
    sellerBadge: 'loja_oficial',
    mediaEstrelas: 5,
    totalAvaliacoes: 0,
    leiloesConcluidos: 0,
    desistencias: 0,
    multasAplicadas: 0,
  },
  [LEVOU_OFFICIAL_USER_ID]: {
    id: LEVOU_OFFICIAL_USER_ID,
    handle: LEVOU_OFFICIAL_HANDLE,
    nomeExibicao: LEVOU_OFFICIAL_DISPLAY_NAME,
    nomeCompleto: 'Levou Marketplace Ltda.',
    email: 'loja@levou.app.br',
    telefone: null,
    statusKyc: 'aprovado',
    sellerBadge: 'loja_oficial',
    mediaEstrelas: 5,
    totalAvaliacoes: 0,
    leiloesConcluidos: 0,
    desistencias: 0,
    multasAplicadas: 0,
  },
};

export type AdminVendedorDetalhe = AdminVendedorPerfil & {
  reviews: Review[];
};

export function resolverVendorId(handleOuId: string): string {
  const chave = handleOuId.trim().toLowerCase();
  if (HANDLE_PARA_ID[chave]) return HANDLE_PARA_ID[chave];
  if (HANDLE_PARA_ID[`@${chave.replace('@', '')}`]) {
    return HANDLE_PARA_ID[`@${chave.replace('@', '')}`];
  }
  return handleOuId;
}

function calcularPerformanceMock(vendorId: string) {
  const pedidos = PEDIDOS_ADMIN_MOCK.filter((p) => p.vendedor.id === vendorId);
  return {
    leiloesConcluidos: pedidos.filter((p) => p.status === 'finalizado').length,
    desistencias: pedidos.filter((p) =>
      ['estornado', 'em_disputa', 'pendente_pagamento'].includes(p.status),
    ).length,
    multasAplicadas: pedidos.filter((p) => p.status === 'em_disputa').length,
  };
}

async function montarPerfilMock(vendorId: string): Promise<AdminVendedorDetalhe | null> {
  const base = PERFIS_MOCK[vendorId];
  if (!base) return null;

  const reviewsDb = await listarReviewsPorVendedor(vendorId);
  const reviews =
    reviewsDb.length > 0
      ? reviewsDb
      : REVIEWS_MOCK_INICIAIS.filter((r) => r.vendorId === vendorId);

  const media = reviews.length > 0 ? mediaAvaliacoes(reviews) : base.mediaEstrelas;
  const perf = calcularPerformanceMock(vendorId);

  return {
    ...base,
    mediaEstrelas: media,
    totalAvaliacoes: reviews.length || base.totalAvaliacoes,
    leiloesConcluidos: perf.leiloesConcluidos || base.leiloesConcluidos,
    desistencias: perf.desistencias || base.desistencias,
    multasAplicadas: perf.multasAplicadas || base.multasAplicadas,
    reviews,
  };
}

export async function obterPerfilVendedorAdmin(
  handleOuId: string,
): Promise<AdminVendedorDetalhe | null> {
  const vendorId = resolverVendorId(handleOuId);

  if (isMockMode() || !isSupabaseConfigured()) {
    return montarPerfilMock(vendorId);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return montarPerfilMock(vendorId);
  }

  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id, email, display_name, nome_completo, telefone, status_verificacao, role',
    )
    .eq('id', vendorId)
    .maybeSingle();

  if (error || !user) {
    return montarPerfilMock(vendorId);
  }

  const reviews = await listarReviewsPorVendedor(user.id);

  const { count: concluidos } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', user.id)
    .eq('status', 'finalizado');

  const { count: estornados } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', user.id)
    .in('status', ['estornado', 'em_disputa']);

  const { count: disputas } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', user.id)
    .eq('status', 'em_disputa');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('seller_badge')
    .eq('user_id', user.id)
    .maybeSingle();

  const handle = user.display_name?.startsWith('@')
    ? user.display_name
    : `@${(user.display_name ?? user.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()}`;

  return {
    id: user.id,
    handle,
    nomeExibicao: user.display_name ?? user.nome_completo ?? user.email,
    nomeCompleto: user.nome_completo,
    email: user.email,
    telefone: user.telefone,
    statusKyc: user.status_verificacao as StatusVerificacao,
    sellerBadge: parseSellerBadge(profile?.seller_badge as string | null),
    mediaEstrelas: mediaAvaliacoes(reviews),
    totalAvaliacoes: reviews.length,
    leiloesConcluidos: concluidos ?? 0,
    desistencias: estornados ?? 0,
    multasAplicadas: disputas ?? 0,
    reviews,
  };
}

export const KYC_VENDEDOR_LABEL: Record<StatusVerificacao, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export async function definirEtiquetaVendedorAdmin(
  userId: string,
  sellerBadge: SellerBadge,
): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const base = PERFIS_MOCK[userId];
    if (base) {
      PERFIS_MOCK[userId] = { ...base, sellerBadge };
    }
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data, error } = await supabase.rpc('admin_definir_etiqueta_vendedor', {
    p_user_id: userId,
    p_seller_badge: sellerBadge,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data && (data as { ok?: boolean }).ok === false) {
    throw new Error('Não foi possível atualizar a etiqueta.');
  }
}
